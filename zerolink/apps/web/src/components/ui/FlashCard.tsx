import { useState } from 'react';

interface FlashCardProps {
  front: string;
  back: string;
  onRate: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
}

const RATINGS: { q: 0 | 1 | 2 | 3 | 4 | 5; emoji: string; label: string }[] = [
  { q: 0, emoji: '😖', label: 'Blackout' },
  { q: 1, emoji: '😕', label: 'Very hard' },
  { q: 2, emoji: '😐', label: 'Hard' },
  { q: 3, emoji: '😊', label: 'Good' },
  { q: 4, emoji: '😄', label: 'Easy' },
  { q: 5, emoji: '🤩', label: 'Perfect' },
];

export function FlashCard({ front, back, onRate }: FlashCardProps) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="flip-card w-full" style={{ height: 280 }}>
      <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
        <div
          className="flip-card-front card flex items-center justify-center cursor-pointer text-center p-8"
          onClick={() => setFlipped(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setFlipped(true); }}
          aria-label="Card front — click to reveal answer"
        >
          <div>
            <p className="text-earth-600 text-sm mb-3">Click to reveal →</p>
            <p className="text-earth-900 text-xl font-bold">{front}</p>
          </div>
        </div>
        <div className="flip-card-back card flex flex-col items-center justify-center p-8 gap-4">
          <p className="text-earth-900 text-xl font-bold text-center">{back}</p>
          <p className="text-earth-500 text-sm">How well did you remember?</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {RATINGS.map(r => (
              <button
                key={r.q}
                onClick={() => { setFlipped(false); onRate(r.q); }}
                title={r.label}
                aria-label={`Rate: ${r.label}`}
                className="text-2xl hover:scale-110 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-earth-400 rounded"
              >
                {r.emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
