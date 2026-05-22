import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { LanternLoader } from '../components/ui/LanternLoader';

// ── Types ─────────────────────────────────────────────────────────────────────

type QuizQuestion = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

type QuizPayload = { questions: QuizQuestion[] };
type FlashcardPayload = { cards: Array<{ front: string; back: string }> };

// ── Quiz renderer ─────────────────────────────────────────────────────────────

function QuizView({ payload }: { payload: QuizPayload }) {
  const [selected, setSelected] = useState<Record<number, number>>({});
  const questions = payload.questions ?? [];
  const answered = Object.keys(selected).length;
  const correct = questions.filter((q, i) => selected[i] === q.answer).length;

  return (
    <div className="space-y-6">
      {answered === questions.length && questions.length > 0 && (
        <div className="card bg-olive-50 border border-olive-200 text-center py-6">
          <p className="text-2xl font-black text-olive-800">{correct} / {questions.length}</p>
          <p className="text-olive-600 mt-1 text-sm">
            {correct === questions.length ? 'Perfect score!' : correct >= questions.length / 2 ? 'Good effort!' : 'Keep practising!'}
          </p>
          <button
            className="mt-4 btn-primary"
            onClick={() => setSelected({})}
          >
            Retry
          </button>
        </div>
      )}

      {questions.map((q, i) => {
        const pick = selected[i];
        const done = pick !== undefined;
        const isRight = pick === q.answer;
        return (
          <div key={i} className="card space-y-3">
            <p className="font-semibold text-earth-800">{i + 1}. {q.question}</p>
            <div className="grid gap-2">
              {q.options.map((opt, j) => {
                let cls = 'w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors ';
                if (!done) {
                  cls += 'border-earth-200 bg-white hover:bg-earth-50 text-earth-700 cursor-pointer';
                } else if (j === q.answer) {
                  cls += 'border-olive-400 bg-olive-50 text-olive-800 font-semibold';
                } else if (j === pick) {
                  cls += 'border-red-300 bg-red-50 text-red-700';
                } else {
                  cls += 'border-earth-100 bg-earth-50 text-earth-400 cursor-default';
                }
                return (
                  <button
                    key={j}
                    className={cls}
                    disabled={done}
                    onClick={() => setSelected(s => ({ ...s, [i]: j }))}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + j)}.</span>{opt}
                  </button>
                );
              })}
            </div>
            {done && (
              <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${isRight ? 'bg-olive-50 text-olive-800' : 'bg-red-50 text-red-800'}`}>
                {isRight
                  ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-olive-600" />
                  : <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-500" />
                }
                <p>{q.explanation}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Flashcard renderer ────────────────────────────────────────────────────────

function FlashcardsView({ payload }: { payload: FlashcardPayload }) {
  const [flip, setFlip] = useState<Record<number, boolean>>({});
  const cards = payload.cards ?? [];

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {cards.map((card, i) => (
        <button
          key={i}
          onClick={() => setFlip(f => ({ ...f, [i]: !f[i] }))}
          className="bg-white border border-earth-200 rounded-2xl p-4 text-left hover:shadow-md transition-all min-h-[90px] flex items-center"
        >
          <p className="text-sm text-earth-700 font-medium flex-1">
            {flip[i] ? card.back : card.front}
          </p>
          <span className="ml-3 text-xs text-earth-300 shrink-0">
            {flip[i] ? 'front' : 'reveal'}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function TrailTaskViewPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/trail/task/${id}`)
      .then(res => { setTask(res.data.data); setLoading(false); })
      .catch(err => { setError(err?.response?.data?.message ?? 'Could not load task'); setLoading(false); });
  }, [id]);

  if (loading) return <div className="card"><LanternLoader /></div>;
  if (error) return (
    <div className="card text-center py-8">
      <p className="text-red-600 font-bold">{error}</p>
      <Link to="/dashboard" className="text-sm mt-4 block">← Back</Link>
    </div>
  );

  const payload = task?.payload ?? null;
  const title = task?.description?.en ?? payload?.title ?? 'Trail item';

  const isQuiz = payload && Array.isArray(payload.questions);
  const isFlashcards = payload && Array.isArray(payload.cards);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">{title}</h1>
        <Link to="/dashboard" className="text-sm text-earth-500">← Back</Link>
      </div>

      {!payload && <div className="card text-earth-400">No content saved for this task.</div>}

      {isQuiz && <QuizView payload={payload as QuizPayload} />}

      {isFlashcards && <FlashcardsView payload={payload as FlashcardPayload} />}

      {payload && !isQuiz && !isFlashcards && (
        <article className="card space-y-4">
          {payload.objectives && (
            <div>
              <p className="font-semibold">Learning Goals</p>
              <ul className="list-disc pl-6 space-y-1">
                {payload.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          {payload.tasks && (
            <div>
              <p className="font-semibold">Practice</p>
              <ol className="list-decimal pl-6 space-y-1">
                {payload.tasks.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          )}
          {payload.reflection && (
            <div>
              <p className="font-semibold">Reflection</p>
              <p className="italic text-earth-600">{payload.reflection}</p>
            </div>
          )}
        </article>
      )}
    </div>
  );
}

export default TrailTaskViewPage;
