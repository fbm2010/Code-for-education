import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Flame, Shuffle, ChevronDown, ChevronUp, Download, PlusCircle } from 'lucide-react';
import { useDailyPlan } from '../hooks/useDailyPlan';
import { useSRCards } from '../hooks/useSRCards';
import { useStreak } from '../hooks/useStreak';
import { FlashCard } from '../components/ui/FlashCard';
import { StreakBadge } from '../components/ui/StreakBadge';
import { SkeletonList } from '../components/ui/SkeletonCard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { db } from '../lib/db';
import { sm2 } from '@zerolink/shared';
import type { SRCard, DailyTask } from '@zerolink/shared';
import { WORKSHEETS, TOPICS, type Worksheet } from '../lib/worksheets';
import { buildWorksheetPdf } from './CourseWorksheetsPage';

type TopicKey = typeof TOPICS[number]['key'];

const TECHNIQUES = [
  {
    key: 'spaced_repetition', icon: BookOpen, name: 'Spaced Repetition', worksheetTopic: 'math' as TopicKey,
    desc: 'Like returning to a campfire at just the right time — each review at a longer interval strengthens memory permanently.',
    tip: 'Review after 1 day, then 3, then 7, then 14.',
    steps: [
      'After learning something new, review it the next day.',
      'If you recalled it well, wait 3 days before reviewing again.',
      'Each successful recall doubles the gap: 1 → 3 → 7 → 14 → 30 days.',
      'Use your flashcard deck in ZeroLink — it schedules reviews automatically.',
      'Aim for at least 5 minutes of flashcard review every morning.',
    ],
    example: 'Amara learns 10 new Swahili words on Monday. She reviews Tuesday, Thursday, the following Monday — each review cements the words without cramming.',
  },
  {
    key: 'retrieval_practice', icon: Zap, name: 'Retrieval Practice', worksheetTopic: 'science' as TopicKey,
    desc: 'Close your notes and test yourself. The struggle to recall IS the learning.',
    tip: 'After reading, close the lesson and write down everything you remember.',
    steps: [
      'Read or listen to your lesson once through.',
      'Close all notes and write down every fact you can recall on a blank page.',
      'Check what you missed and mark those items to focus on.',
      'After 10 minutes, test yourself again without looking at the first page.',
      'Do this after every lesson for the first week.',
    ],
    example: 'David reads a science lesson about the water cycle. He closes the book and draws the cycle from memory — evaporation, condensation, precipitation, collection. He finds he forgot "condensation" so he focuses there next.',
  },
  {
    key: 'daily_streak', icon: Flame, name: 'Daily Streak', worksheetTopic: 'language' as TopicKey,
    desc: 'Consistency beats marathon sessions. 15 minutes every day builds a mighty trail.',
    tip: 'Keep the streak — even 5 minutes counts on hard days.',
    steps: [
      'Choose a specific time each day for learning (morning is best for retention).',
      'Start with just 10–15 minutes — make it impossible to skip.',
      'Track your streak in the ZeroLink dashboard every day.',
      'On busy days, complete just one flashcard review to keep the streak alive.',
      'After 21 days, the habit becomes automatic — then you can increase the time.',
    ],
    example: 'Fatoumata commits to studying every day at 6:30 AM before breakfast. After 30 days, her streak is unbroken and she has covered 12 lessons — more than her friend who crams on weekends.',
  },
  {
    key: 'interleaving', icon: Shuffle, name: 'Interleaving', worksheetTopic: 'geography' as TopicKey,
    desc: 'Mix subjects in one session. Switching makes your brain work harder — and remember more.',
    tip: 'Math → Science → Language → back to Math.',
    steps: [
      'Plan a study session with 3 different subjects (e.g., Math, Science, Language).',
      'Set a timer for 15 minutes per subject.',
      'Switch subjects when the timer rings — even if you are not finished.',
      'Do not study the same subject twice in a row.',
      'Review how much you remember from the first subject when you return to it — the gap helps you recall better.',
    ],
    example: 'Kofi spends 15 minutes on algebra, then 15 on plant biology, then 15 on Kiswahili grammar, then returns to algebra. He feels it is harder than staying on one topic — but his test scores are 30% higher.',
  },
];

const TASK_ICONS: Record<string, string> = {
  review_sr: '⏰', retrieval_quiz: '🧠', new_lesson: '📖', interleave: '🔀', worksheet: '📄',
};

const TOPIC_ICONS: Record<string, string> = {
  math: '📐', science: '🔬', language: '📚', geography: '🌍', arts: '🎨', technology: '💻',
};

type GenerateState = { status: 'idle' } | { status: 'loading' } | { status: 'done'; worksheet: Worksheet } | { status: 'error'; message: string };

export function StudyCoachPage() {
  const navigate = useNavigate();
  const { data: plan, isLoading: planLoading } = useDailyPlan();
  const { data: srCards, isLoading: cardsLoading } = useSRCards();
  const { data: streak } = useStreak();
  const qc = useQueryClient();
  const [reviewMode, setReviewMode] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const [reviewDone, setReviewDone] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [worksheetTopic, setWorksheetTopic] = useState<TopicKey>('all');
  const [addedId, setAddedId] = useState<string | null>(null);

  // Ollama generator state
  const [genTopic, setGenTopic] = useState('math');
  const [genLevel, setGenLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [genFocus, setGenFocus] = useState('');
  const [genState, setGenState] = useState<GenerateState>({ status: 'idle' });
  const [showGenerator, setShowGenerator] = useState(false);

  const { data: ollamaStatus } = useQuery({
    queryKey: ['ollamaHealth'],
    queryFn: () => api.get('/api/ollama/health').then(r => r.data.data as { available: boolean }),
    staleTime: 30_000,
  });

  const due = srCards?.filter(c => new Date(c.nextReview) <= new Date()) ?? [];
  const current: SRCard | undefined = due[cardIndex];

  const rateMutation = useMutation({
    mutationFn: async ({ card, quality }: { card: SRCard; quality: 0 | 1 | 2 | 3 | 4 | 5 }) => {
      const result = sm2(quality, card.easeFactor, card.intervalDays, card.repetitions);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + result.intervalDays);
      const updated = { ...card, ...result, nextReview: nextReview.toISOString(), lastReviewed: new Date().toISOString() };
      await db.srCards.put(updated);
      return api.patch(`/sr-cards/${card.id}/review`, { quality });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['srCards'] });
      if (cardIndex + 1 >= due.length) setReviewDone(true);
      else setCardIndex(i => i + 1);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.post(`/daily-plan/complete/${taskId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dailyPlan'] }),
  });

  const addPlanMutation = useMutation({
    mutationFn: (w: Worksheet) =>
      api.post('/daily-plan/tasks', { type: 'worksheet', description: { en: w.title }, durationMin: w.minutes, worksheetId: w.id }),
    onSuccess: (_data, w) => {
      qc.invalidateQueries({ queryKey: ['dailyPlan'] });
      setAddedId(w.id);
      setTimeout(() => setAddedId(null), 2000);
    },
  });

  const generateWorksheet = async () => {
    setGenState({ status: 'loading' });
    try {
      const res = await api.post('/api/worksheets/generate', { topic: genTopic, level: genLevel, focus: genFocus || undefined });
      const data = res.data.data;
      if ('error' in data) {
        setGenState({ status: 'error', message: 'Ollama is offline. Try enabling it or use a static worksheet below.' });
        return;
      }
      setGenState({ status: 'done', worksheet: { ...data, id: `gen-${Date.now()}`, courseSlug: 'generated', topic: genTopic as Worksheet['topic'] } });
    } catch {
      setGenState({ status: 'error', message: 'Could not connect to the worksheet generator.' });
    }
  };

  const filteredWorksheets = worksheetTopic === 'all'
    ? WORKSHEETS.slice(0, 12)
    : WORKSHEETS.filter(w => w.topic === worksheetTopic).slice(0, 12);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-earth-800">📖 Study Coach</h1>
          <p className="text-earth-500 mt-1">Your guidebook & trail plan</p>
        </div>
        {streak && <StreakBadge count={streak.currentStreak} />}
      </div>

      {/* SR Card Review */}
      <section aria-labelledby="sr-title">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-earth-800" id="sr-title">
            ⏰ Flashcard Review
            {due.length > 0 && <span className="ml-2 text-sm bg-sky-100 text-sky-700 font-bold px-2 py-0.5 rounded-full">{due.length} due</span>}
          </h2>
          {!reviewMode && due.length > 0 && (
            <button className="btn-primary text-sm" onClick={() => { setReviewMode(true); setCardIndex(0); setReviewDone(false); }}>
              Start Review
            </button>
          )}
        </div>
        {cardsLoading ? (
          <div className="card py-8 text-center text-earth-400">Loading cards…</div>
        ) : !reviewMode ? (
          <div className="card text-center py-8">
            {due.length === 0 ? (
              <><div className="text-4xl mb-3">✨</div><p className="font-bold text-earth-700">All caught up!</p><p className="text-earth-500 text-sm mt-1">No cards due for review today.</p></>
            ) : (
              <><div className="text-4xl mb-3">📚</div><p className="font-bold text-earth-700">{due.length} cards ready for review</p><p className="text-earth-500 text-sm mt-1">These are due for spaced repetition.</p></>
            )}
          </div>
        ) : reviewDone ? (
          <div className="card text-center py-8">
            <div className="text-4xl mb-3">🎉</div>
            <p className="font-black text-earth-700 text-xl">All done!</p>
            <p className="text-earth-500 mt-1">Excellent work on the review session.</p>
            <button className="btn-secondary mt-4" onClick={() => setReviewMode(false)}>Close</button>
          </div>
        ) : current ? (
          <FlashCard front={current.term.front} back={current.term.back} onRate={q => rateMutation.mutate({ card: current, quality: q })} />
        ) : null}
      </section>

      {/* Today's Trail */}
      <section aria-labelledby="trail-coach-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="trail-coach-title">📋 Today's Trail</h2>
        {planLoading ? <SkeletonList count={3} /> : (
          <div className="space-y-3" role="list">
            {plan?.tasks?.map((task: DailyTask) => (
              <div key={task.id} role="listitem" className={`card flex items-center gap-4 ${task.completed ? 'opacity-60' : ''}`}>
                <span className="text-2xl" aria-hidden="true">{TASK_ICONS[task.type] ?? '📌'}</span>
                <div className="flex-1">
                  <p className={`font-semibold text-earth-800 ${task.completed ? 'line-through' : ''}`}>
                    {task.description['en'] ?? task.description[Object.keys(task.description)[0] ?? '']}
                  </p>
                  <p className="text-earth-500 text-sm">{task.durationMin} min</p>
                </div>
                {!task.completed && (
                  <button className="btn-primary text-sm px-3 py-1.5" onClick={() => completeMutation.mutate(task.id)}>Done ✓</button>
                )}
                {task.completed && <span className="text-olive-500 text-xl">✓</span>}
              </div>
            )) ?? <div className="card text-center py-8 text-earth-400">No plan generated yet.</div>}
          </div>
        )}
      </section>

      {/* Technique cards with expandable detail */}
      <section aria-labelledby="techniques-title">
        <h2 className="text-xl font-black text-earth-800 mb-4" id="techniques-title">📚 Study Techniques</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TECHNIQUES.map(({ key, icon: Icon, name, desc, tip, steps, example, worksheetTopic: wTopic }) => (
            <div key={key} className="card">
              <button
                className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-earth-400 rounded-xl"
                onClick={() => setExpandedKey(expandedKey === key ? null : key)}
                aria-expanded={expandedKey === key}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-8 h-8 text-earth-400 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <h3 className="font-black text-earth-800 mb-1">{name}</h3>
                    <p className="text-earth-600 text-sm mb-2">{desc}</p>
                    <p className="text-earth-400 text-xs italic">"{tip}"</p>
                  </div>
                  {expandedKey === key
                    ? <ChevronUp className="w-5 h-5 text-earth-400 shrink-0" aria-hidden="true" />
                    : <ChevronDown className="w-5 h-5 text-earth-400 shrink-0" aria-hidden="true" />
                  }
                </div>
              </button>

              {expandedKey === key && (
                <div className="mt-4 pt-4 border-t border-earth-100 space-y-4">
                  <div>
                    <h4 className="font-bold text-earth-700 text-sm mb-2">Step-by-step guide</h4>
                    <ol className="space-y-1">
                      {steps.map((step, i) => (
                        <li key={i} className="flex gap-2 text-sm text-earth-600">
                          <span className="font-bold text-earth-400 shrink-0">{i + 1}.</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="bg-earth-50 rounded-xl p-3 text-sm text-earth-600">
                    <span className="font-bold text-earth-700">Real example: </span>{example}
                  </div>
                  <button
                    className="btn-primary text-sm w-full"
                    onClick={() => navigate(`/worksheets?topic=${wTopic}`)}
                  >
                    Try it now → {TOPIC_ICONS[wTopic]} {wTopic} worksheets
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Practice Worksheets section */}
      <section aria-labelledby="worksheets-coach-title">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-black text-earth-800" id="worksheets-coach-title">📝 Practice Worksheets</h2>
          <button className="text-sm font-semibold text-earth-500 hover:text-earth-700" onClick={() => navigate('/worksheets')}>
            See all →
          </button>
        </div>

        {/* Topic filter */}
        <div className="flex gap-2 flex-wrap mb-4">
          {TOPICS.map(t => (
            <button
              key={t.key}
              onClick={() => setWorksheetTopic(t.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                worksheetTopic === t.key ? 'bg-earth-400 text-white' : 'bg-earth-100 text-earth-600 hover:bg-earth-200'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredWorksheets.map(w => (
            <div key={w.id} className="card flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">{TOPIC_ICONS[w.topic] ?? '📄'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-earth-800 text-sm truncate">{w.title}</p>
                <p className="text-earth-400 text-xs">{w.level} · {w.minutes} min</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  className="p-1.5 rounded-lg bg-earth-100 hover:bg-earth-200 text-earth-600"
                  onClick={() => buildWorksheetPdf(w, { objectives: 'Learning goals', tasks: 'Practice trail', reflection: 'Reflection' })
                    && (() => { const blob = buildWorksheetPdf(w, { objectives: 'Learning goals', tasks: 'Practice trail', reflection: 'Reflection' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${w.id}.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); })()}
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  className={`p-1.5 rounded-lg text-earth-600 ${addedId === w.id ? 'bg-olive-200' : 'bg-earth-100 hover:bg-earth-200'}`}
                  onClick={() => addPlanMutation.mutate(w)}
                  disabled={addPlanMutation.isPending}
                  title="Add to My Plan"
                >
                  <PlusCircle className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ollama worksheet generator */}
      <section aria-labelledby="gen-title">
        <button
          className="w-full text-left card flex items-center justify-between"
          onClick={() => setShowGenerator(g => !g)}
          aria-expanded={showGenerator}
          id="gen-title"
        >
          <span className="font-black text-earth-800">✨ Generate a Worksheet</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ollamaStatus?.available ? 'bg-olive-100 text-olive-700' : 'bg-amber-100 text-amber-700'}`}>
            {ollamaStatus?.available ? 'AI Ready' : 'AI Offline'}
          </span>
        </button>

        {showGenerator && (
          <div className="card mt-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="label" htmlFor="gen-topic">Topic</label>
                <select id="gen-topic" className="input" value={genTopic} onChange={e => setGenTopic(e.target.value)}>
                  <option value="math">Math</option>
                  <option value="science">Science</option>
                  <option value="language">Language</option>
                  <option value="geography">Geography</option>
                  <option value="arts">Arts</option>
                  <option value="technology">Technology</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="gen-level">Level</label>
                <select id="gen-level" className="input" value={genLevel} onChange={e => setGenLevel(e.target.value as typeof genLevel)}>
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="gen-focus">Custom focus (optional)</label>
                <input id="gen-focus" className="input" placeholder="e.g. fractions using market items" value={genFocus} onChange={e => setGenFocus(e.target.value)} />
              </div>
            </div>

            <button
              className="btn-primary w-full"
              onClick={generateWorksheet}
              disabled={genState.status === 'loading'}
            >
              {genState.status === 'loading' ? 'Generating…' : '✨ Generate'}
            </button>

            {genState.status === 'error' && (
              <p className="text-red-600 text-sm font-semibold">{genState.message}</p>
            )}

            {genState.status === 'done' && (
              <div className="bg-earth-50 rounded-xl p-4 space-y-3">
                <h3 className="font-black text-earth-800 text-lg">{genState.worksheet.title}</h3>
                <div>
                  <p className="font-bold text-earth-700 text-sm mb-1">Learning Goals</p>
                  <ul className="list-disc pl-4 text-sm text-earth-600 space-y-0.5">
                    {genState.worksheet.objectives.map((o, i) => <li key={i}>{o}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-earth-700 text-sm mb-1">Practice Trail</p>
                  <ol className="list-decimal pl-4 text-sm text-earth-600 space-y-0.5">
                    {genState.worksheet.tasks.map((t, i) => <li key={i}>{t}</li>)}
                  </ol>
                </div>
                <p className="text-sm text-earth-600 italic">{genState.worksheet.reflection}</p>
                <div className="flex gap-2">
                  <button
                    className="btn-primary text-sm flex-1"
                    onClick={() => {
                      const blob = buildWorksheetPdf(genState.worksheet, { objectives: 'Learning Goals', tasks: 'Practice Trail', reflection: 'Reflection' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url; a.download = `generated-worksheet.pdf`;
                      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="w-4 h-4 mr-1" /> Download PDF
                  </button>
                  <button
                    className="btn-secondary text-sm"
                    onClick={() => addPlanMutation.mutate(genState.worksheet)}
                  >
                    <PlusCircle className="w-4 h-4 mr-1" /> Add to Plan
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
