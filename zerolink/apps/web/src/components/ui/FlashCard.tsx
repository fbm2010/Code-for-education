import { useState } from 'react';
import { Check, X } from 'lucide-react';

interface FlashCardProps {
  front: string;
  back: string;
  onRate: (known: boolean) => void;
}

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
          <p className="text-earth-500 text-sm">Did you recall this card correctly?</p>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => { setFlipped(false); onRate(true); }}
              aria-label="Correct — proceed to next card"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-olive-600 text-white shadow-sm hover:bg-olive-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-olive-400"
            >
              <Check className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-semibold">Correct</span>
            </button>
            <button
              type="button"
              onClick={() => { setFlipped(false); onRate(false); }}
              aria-label="Incorrect — try again"
              className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-600 text-white shadow-sm hover:bg-rose-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-400"
            >
              <X className="w-5 h-5" aria-hidden="true" />
              <span className="text-sm font-semibold">Incorrect</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
