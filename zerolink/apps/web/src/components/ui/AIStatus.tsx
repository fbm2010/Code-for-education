import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Sparkles } from 'lucide-react';

type Status = 'checking' | 'online' | 'offline';

export function AIStatus() {
  const [status, setStatus] = useState<Status>('checking');

  const check = async () => {
    try {
      const res = await api.get<{ data: { available: boolean } }>('/api/ai/health');
      setStatus(res.data.data.available ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    void check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, []);

  if (status === 'checking') return null;

  return (
    <div
      title={status === 'online' ? 'Groq AI ready' : 'Groq AI offline'}
      className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border ${
        status === 'online'
          ? 'bg-olive-50 text-olive-700 border-olive-200'
          : 'bg-earth-100 text-earth-400 border-earth-200'
      }`}
    >
      <Sparkles className="w-3 h-3" aria-hidden="true" />
      {status === 'online' ? 'AI Ready' : 'AI Offline'}
    </div>
  );
}
