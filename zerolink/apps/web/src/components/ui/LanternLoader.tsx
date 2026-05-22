import { useEffect, useState } from 'react';

export function LanternLoader({ text = 'Charting your path…' }: { text?: string }) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] gap-4"
      role="status"
      aria-label={text}
    >
      <div style={{ animation: 'lanternPulse 2s ease-in-out infinite', fontSize: 64 }}>
        🏕️
      </div>
      <p className="text-earth-500 font-semibold text-lg">{text}</p>
      {slow && (
        <p className="text-earth-400 text-sm">
          Taking longer than usual — the server may be waking up.{' '}
          <button
            className="underline hover:text-earth-600"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </p>
      )}
    </div>
  );
}
