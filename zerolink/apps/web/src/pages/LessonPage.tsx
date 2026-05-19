import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, BookOpen, Volume2, Wifi, WifiOff, Zap } from 'lucide-react';
import { useLesson, useLessonContent } from '../hooks/useLessons';
import { useBandwidth } from '../lib/connectivity';
import { usePrefsStore } from '../stores/prefsStore';
import { CompassLoader } from '../components/ui/CompassLoader';
import { ProgressBar } from '../components/ui/ProgressBar';
import { api } from '../lib/api';
import { db } from '../lib/db';

const TECHNIQUES = [
  { key: 'spaced_repetition', icon: '⏰', name: 'Spaced Repetition', desc: 'Revisit at growing intervals — each review strengthens the memory trail.' },
  { key: 'retrieval_practice', icon: '🧠', name: 'Retrieval Practice', desc: 'Test yourself without peeking — struggling to recall is what builds the trail.' },
  { key: 'daily_streak', icon: '🔥', name: 'Daily Streak', desc: 'Consistency beats cramming. Even 10 minutes every day changes everything.' },
  { key: 'interleaving', icon: '🔀', name: 'Interleaving', desc: 'Mix subjects in one session to build stronger connections between ideas.' },
];

export function LessonPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lesson, isLoading: lessonLoading } = useLesson(id);
  const { prefs, updatePref } = usePrefsStore();
  const bandwidth = useBandwidth();
  const [lang, setLang] = useState(prefs.primaryLanguage);
  const [activeTechnique, setActiveTechnique] = useState(prefs.preferredTechniques[0] ?? 'spaced_repetition');
  const [progress, setProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const forceLowBw = prefs.lowBandwidthDefault || bandwidth === 'low';
  const { data: content, isLoading: contentLoading } = useLessonContent(id, lang);

  // Track scroll progress
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const pct = Math.min(100, Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)) || 0;
      setProgress(pct);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Debounced progress save
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!id || progress === 0) return;
      const rec = {
        lessonId: id,
        status: progress >= 100 ? 'completed' as const : 'in_progress' as const,
        percentComplete: progress,
        lastAccessed: new Date().toISOString(),
        timeSpentSec: 0,
        studyTechnique: activeTechnique,
      };
      await db.progress.put(rec);
      try {
        await api.put(`/progress/${id}`, rec);
      } catch { /* offline — will sync */ }
    }, 2000);
    return () => clearTimeout(t);
  }, [progress, id, activeTechnique]);

  if (lessonLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <CompassLoader size={48} />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="card text-center py-16">
        <p className="text-earth-600 font-semibold">Lesson not found.</p>
        <Link to="/map" className="btn-primary mt-4 inline-block">← Back to Map</Link>
      </div>
    );
  }

  const title = lesson.title[lang] ?? lesson.title['en'] ?? lesson.slug;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-screen">
      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Breadcrumb + back */}
        <div className="flex items-center gap-2 mb-4 text-sm text-earth-500">
          <button onClick={() => navigate(-1)} className="btn-ghost py-1 px-2 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span>/</span>
          <span className="text-earth-700 font-semibold truncate">{title}</span>
        </div>

        {/* Bandwidth banners */}
        {bandwidth === 'offline' && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 bg-earth-700 text-white px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <WifiOff className="w-4 h-4" aria-hidden="true" /> 🔥 Studying at the offline campfire
          </div>
        )}
        {bandwidth === 'low' && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-xl text-sm font-semibold"
          >
            <Zap className="w-4 h-4" aria-hidden="true" /> 📡 Low-bandwidth trail — text & audio mode
          </div>
        )}

        {/* Lesson header */}
        <div className="card mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-earth-800 mb-2">{title}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-earth-500">
                <span>⏱ {lesson.estimatedMinutes ?? 15} min</span>
                <span>📄 {lesson.contentType}</span>
                {bandwidth === 'offline'
                  ? <span className="text-earth-600">🏕️ Offline campfire</span>
                  : <span className="text-olive-600 flex items-center gap-1"><Wifi className="w-3 h-3" /> Online</span>
                }
              </div>
            </div>
            {/* Language selector */}
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="input w-auto text-sm py-1.5 shrink-0"
              aria-label="Lesson language"
            >
              {Object.keys(lesson.title).map(l => (
                <option key={l} value={l}>{l.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <ProgressBar value={progress} className="mt-4" label="Reading progress" />
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="card max-h-[60vh] overflow-y-auto"
          style={{ scrollBehavior: 'smooth' }}
        >
          {contentLoading ? (
            <div className="flex justify-center py-8"><CompassLoader /></div>
          ) : content ? (
            <div className="prose prose-earth max-w-none">
              {forceLowBw && content.audioUrl && (
                <div className="mb-4 p-3 bg-earth-50 rounded-xl">
                  <p className="text-sm font-semibold text-earth-600 mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4" /> Audio lesson
                  </p>
                  <audio
                    controls
                    src={content.audioUrl}
                    className="w-full"
                    aria-label="Lesson audio"
                  />
                </div>
              )}
              {forceLowBw
                ? <div className="whitespace-pre-wrap text-earth-800">{content.bodyText}</div>
                : <div dangerouslySetInnerHTML={{ __html: content.bodyHtml ?? content.bodyText ?? '' }} />
              }
            </div>
          ) : (
            <div className="text-center py-8 text-earth-500">
              <p>Content unavailable. Try again when connected.</p>
            </div>
          )}
        </div>

        {/* Take quiz */}
        <div className="mt-4 flex gap-3">
          <button
            className="btn-primary flex-1"
            onClick={() => navigate(`/lessons/${id}/quiz`)}
          >
            🎯 Take the Trail Quiz
          </button>
          <button
            className="btn-secondary"
            onClick={async () => {
              await db.progress.put({
                lessonId: id,
                status: 'completed',
                percentComplete: 100,
                lastAccessed: new Date().toISOString(),
                timeSpentSec: 0,
                studyTechnique: activeTechnique,
              });
              setProgress(100);
            }}
            aria-label="Mark lesson as complete"
          >
            ✓ Mark Complete
          </button>
        </div>
      </div>

      {/* Study Guidebook sidebar */}
      <aside
        className="w-full lg:w-72 shrink-0 space-y-4"
        aria-label="Study Guidebook"
      >
        <div className="card">
          <h2 className="font-black text-earth-800 mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-earth-400" aria-hidden="true" />
            Study Guidebook
          </h2>
          <p className="text-earth-500 text-xs mb-4">Choose your study technique:</p>
          <div className="space-y-2">
            {TECHNIQUES.map(t => (
              <button
                key={t.key}
                onClick={() => {
                  setActiveTechnique(t.key);
                  updatePref('preferredTechniques', [t.key]);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors border-2 ${
                  activeTechnique === t.key
                    ? 'border-earth-400 bg-earth-50 text-earth-800'
                    : 'border-transparent hover:border-earth-200 text-earth-600'
                }`}
                aria-pressed={activeTechnique === t.key}
              >
                <span className="font-semibold">{t.icon} {t.name}</span>
                {activeTechnique === t.key && (
                  <p className="text-earth-500 text-xs mt-1">{t.desc}</p>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-earth-800 mb-3">📊 Your Progress</h2>
          <ProgressBar value={progress} label="Lesson progress" />
          <p className="text-earth-400 text-xs mt-2">{progress}% through this lesson</p>
        </div>
      </aside>
    </div>
  );
}
