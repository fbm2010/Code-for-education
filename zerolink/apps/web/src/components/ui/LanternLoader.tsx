export function LanternLoader({ text = 'Charting your path…' }: { text?: string }) {
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
    </div>
  );
}
