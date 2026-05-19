interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  className?: string;
}

export function ProgressBar({ value, max = 100, label, className = '' }: ProgressBarProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100);
  return (
    <div className={className}>
      {label && <span className="sr-only">{label}: {Math.round(pct)}%</span>}
      <div
        className="h-2 bg-earth-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #6d9e3f, #c08040)',
          }}
        />
      </div>
    </div>
  );
}
