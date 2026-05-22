import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { LanternLoader } from '../components/ui/LanternLoader';

export function TrailTaskViewPage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get(`/trail/task/${id}`)
      .then(res => {
        setTask(res.data.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.response?.data?.message ?? 'Could not load task');
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="card"><LanternLoader /></div>;
  if (error) return (
    <div className="card text-center py-8">
      <p className="text-red-600 font-bold">{error}</p>
      <Link to="/dashboard" className="text-sm mt-4 block">← Back</Link>
    </div>
  );

  const payload = task?.payload ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">{task?.description?.en ?? payload?.title ?? 'Trail item'}</h1>
        <Link to="/dashboard" className="text-sm text-earth-500">Back to dashboard</Link>
      </div>

      {!payload && (
        <div className="card">No saved payload for this task.</div>
      )}

      {payload && payload.title && (
        <article className="card space-y-4">
          <h2 className="font-bold text-lg">{payload.title?.en ?? payload.title}</h2>
          {payload.objectives && (
            <div>
              <p className="font-semibold">Learning Goals</p>
              <ul className="list-disc pl-6">
                {payload.objectives.map((o: string, i: number) => <li key={i}>{o}</li>)}
              </ul>
            </div>
          )}
          {payload.tasks && (
            <div>
              <p className="font-semibold">Practice Trail</p>
              <ol className="list-decimal pl-6">
                {payload.tasks.map((t: string, i: number) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          )}
          {payload.reflection && (
            <div>
              <p className="font-semibold">Reflection</p>
              <p className="italic">{payload.reflection}</p>
            </div>
          )}
        </article>
      )}

      {payload && !payload.title && (
        <div className="card">
          <pre className="whitespace-pre-wrap text-sm">{JSON.stringify(payload, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default TrailTaskViewPage;
