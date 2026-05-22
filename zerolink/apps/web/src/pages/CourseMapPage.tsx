import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Download, CheckCircle } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { SkeletonList } from '../components/ui/SkeletonCard';
import type { Course, Category } from '@zerolink/shared';
import { usePrefsStore } from '../stores/prefsStore';

const TERRAIN_COLORS: Record<number, string> = {
  0: '#c08040', 1: '#6d9e3f', 2: '#5b8db8', 3: '#4a7a28',
  4: '#c4820d', 5: '#3a2010', 6: '#8b3a1a', 7: '#2a5a8a',
};

function DifficultyBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    beginner: 'bg-olive-100 text-olive-700',
    intermediate: 'bg-sky-100 text-sky-700',
    advanced: 'bg-earth-100 text-earth-700',
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[level] ?? 'bg-earth-100 text-earth-700'}`}>
      {level}
    </span>
  );
}

export function CourseMapPage() {
  const navigate = useNavigate();
  const { data: categories, isLoading } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [langFilter, setLangFilter] = useState('all');
  const { prefs } = usePrefsStore();

  const { data: courses } = useQuery<Course[]>({
    queryKey: ['courses', selectedCategory?.id],
    queryFn: async () => {
      const res = await api.get('/courses', {
        params: { categoryId: selectedCategory?.id },
      });
      const d = res.data.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    enabled: !!selectedCategory,
  });

  const langs = [
    { code: 'all', label: 'All' }, { code: 'en', label: 'English' },
    { code: 'sw', label: 'Kiswahili' }, { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' }, { code: 'hi', label: 'हिन्दी' },
  ];

  if (isLoading) return <LanternLoaderPage />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-earth-800">🗺️ Expedition Map</h1>
        <p className="text-earth-500 mt-1">Choose a territory to explore</p>
      </div>

      {/* Language filter */}
      <div className="flex gap-2 flex-wrap" role="group" aria-label="Filter by language">
        {langs.map(l => (
          <button
            key={l.code}
            onClick={() => setLangFilter(l.code)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
              langFilter === l.code
                ? 'bg-earth-400 text-white'
                : 'bg-earth-100 text-earth-600 hover:bg-earth-200'
            }`}
            aria-pressed={langFilter === l.code}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Territory grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories?.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat)}
            className="card card-hover text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-earth-400"
            aria-label={`Explore ${cat.name['en'] ?? cat.slug} territory`}
          >
            <div
              className="w-full h-24 rounded-xl mb-4 flex items-center justify-center text-4xl"
              style={{ background: TERRAIN_COLORS[i % 8] }}
              aria-hidden="true"
            >
              {cat.icon ?? '🗺️'}
            </div>
            <h2 className="font-black text-earth-800 text-lg">
              {cat.name[prefs.primaryLanguage] ?? cat.name['en'] ?? cat.slug}
            </h2>
            <p className="text-earth-500 text-sm mt-1">
              {((cat as Category & { lesson_count?: number }).lesson_count ?? cat.lessonCount ?? 0)} courses
            </p>
          </button>
        ))}
      </div>

      {/* Course panel */}
      <AnimatePresence>
        {selectedCategory && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setSelectedCategory(null)}
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-parchment z-50 overflow-y-auto shadow-xl"
              aria-label={`Courses in ${selectedCategory.name['en']}`}
              role="dialog"
            >
              <div className="sticky top-0 bg-parchment border-b border-earth-200 px-6 py-4 flex items-center justify-between">
                <h2 className="font-black text-earth-800 text-xl">
                  {selectedCategory.name[prefs.primaryLanguage] ?? selectedCategory.name['en']}
                </h2>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="btn-ghost p-2"
                  aria-label="Close panel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                {!courses ? (
                  <SkeletonList count={3} />
                ) : courses.map(course => (
                  <div key={course.id} className="card card-hover">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-earth-800">
                        {course.title[prefs.primaryLanguage] ?? course.title['en'] ?? course.slug}
                      </h3>
                      <DifficultyBadge level={course.difficulty} />
                    </div>
                    {course.description && (
                      <p className="text-earth-500 text-sm mb-3">
                        {course.description[prefs.primaryLanguage] ?? course.description['en']}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      {Object.keys(course.title).map(lang => (
                        <span key={lang} className="text-xs bg-earth-100 text-earth-600 px-2 py-0.5 rounded-full font-semibold">
                          {lang}
                        </span>
                      ))}
                      {course.estimatedMinutes && (
                        <span className="text-xs text-earth-400 ml-auto">⏱ {course.estimatedMinutes} min</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn-primary flex-1 text-sm py-2"
                        onClick={() => navigate(`/courses/${course.slug}`)}
                      >
                        Worksheets →
                      </button>
                      <button
                        className="btn-secondary text-sm py-2 px-3"
                        aria-label="Download for offline"
                        title="Download for offline"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function LanternLoaderPage() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div style={{ fontSize: 48, animation: 'lanternPulse 2s ease-in-out infinite' }}>🏕️</div>
        <p className="text-earth-500 mt-3 font-semibold">Loading the map…</p>
      </div>
    </div>
  );
}
