import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { CompassLoader } from '../components/ui/CompassLoader';
import { ProgressBar } from '../components/ui/ProgressBar';
import type { Quiz, QuizQuestion } from '@zerolink/shared';
import { usePrefsStore } from '../stores/prefsStore';

export function QuizPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prefs } = usePrefsStore();
  const lang = prefs.primaryLanguage;

  const { data: quiz, isLoading } = useQuery<Quiz>({
    queryKey: ['quiz', id, lang],
    queryFn: async () => {
      const res = await api.get(`/lessons/${id}/quiz`, { params: { lang } });
      return res.data.data;
    },
    enabled: !!id,
  });

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string; correct: boolean }[]>([]);
  const [done, setDone] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (data: { lessonId: string; language: string; answers: typeof answers }) =>
      api.post('/quiz-attempts', data),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <CompassLoader size={48} />
      </div>
    );
  }

  if (!quiz || !quiz.questions.length) {
    return (
      <div className="card text-center py-16">
        <p className="text-earth-500">No quiz available for this lesson.</p>
        <button className="btn-primary mt-4" onClick={() => navigate(`/lessons/${id}`)}>
          ← Back to Lesson
        </button>
      </div>
    );
  }

  const q: QuizQuestion = quiz.questions[current];
  const score = answers.filter(a => a.correct).length;
  const total = quiz.questions.length;

  const handleSelect = (optId: string) => {
    if (showFeedback) return;
    setSelected(optId);
  };

  const handleNext = () => {
    if (!selected) return;
    const isCorrect = selected === q.correct;
    const newAnswers = [...answers, { questionId: q.id, answer: selected, correct: isCorrect }];
    setAnswers(newAnswers);
    setShowFeedback(true);

    setTimeout(() => {
      setShowFeedback(false);
      setSelected(null);
      if (current + 1 >= total) {
        setDone(true);
        submitMutation.mutate({ lessonId: id, language: lang, answers: newAnswers });
      } else {
        setCurrent(c => c + 1);
      }
    }, 1500);
  };

  if (done) {
    const pct = Math.round((score / total) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card max-w-lg mx-auto text-center py-12"
      >
        <div className="text-6xl mb-4">{pct >= 70 ? '🎉' : '🧭'}</div>
        <h1 className="text-3xl font-black text-earth-800 mb-2">
          {pct >= 70 ? 'Well done, Explorer!' : 'Keep Exploring!'}
        </h1>
        <p className="text-earth-500 mb-6">
          You got {score} of {total} correct — {pct}%
        </p>
        <div className="w-48 mx-auto mb-8">
          <ProgressBar value={pct} label={`Score: ${pct}%`} />
        </div>
        <div className="flex gap-3 justify-center">
          <button className="btn-primary" onClick={() => navigate(`/lessons/${id}`)}>
            Return to Campfire 🔥
          </button>
          {pct < 70 && (
            <button className="btn-secondary" onClick={() => { setCurrent(0); setAnswers([]); setDone(false); setSelected(null); }}>
              Try Again
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  const getOptionStyle = (optId: string) => {
    if (!showFeedback) {
      return selected === optId
        ? 'border-earth-400 bg-earth-50 text-earth-800'
        : 'border-earth-200 hover:border-earth-300 text-earth-700';
    }
    if (optId === q.correct) return 'border-olive-400 bg-olive-50 text-olive-800';
    if (optId === selected && optId !== q.correct) return 'border-red-300 bg-red-50 text-red-700';
    return 'border-earth-200 text-earth-400';
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <p className="text-earth-500 text-sm mb-2">Question {current + 1} of {total}</p>
        <ProgressBar value={current + 1} max={total} label="Quiz progress" />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="card"
        >
          <h2 className="text-xl font-bold text-earth-800 mb-6">
            {q.prompt[lang] ?? q.prompt['en']}
          </h2>
          <div className="space-y-3">
            {q.options?.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleSelect(opt.id)}
                disabled={showFeedback}
                className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold transition-all ${getOptionStyle(opt.id)}`}
                aria-pressed={selected === opt.id}
              >
                {opt.text[lang] ?? opt.text['en']}
              </button>
            ))}
          </div>

          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-xl text-sm ${selected === q.correct ? 'bg-olive-50 text-olive-800' : 'bg-red-50 text-red-800'}`}
            >
              {selected === q.correct ? '✓ Correct! ' : '✗ Not quite. '}
              {q.explanation[lang] ?? q.explanation['en']}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {!showFeedback && (
        <button
          className="btn-primary w-full"
          onClick={handleNext}
          disabled={!selected}
        >
          {current + 1 === total ? 'Finish Quiz 🏁' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}
