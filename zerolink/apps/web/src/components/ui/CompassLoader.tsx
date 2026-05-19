export function CompassLoader({ size = 40 }: { size?: number }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex flex-col items-center gap-3"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        style={{ animation: 'compassSpin 2s linear infinite' }}
      >
        <circle cx="20" cy="20" r="18" fill="none" stroke="#e8c9a0" strokeWidth="2" />
        <circle cx="20" cy="20" r="14" fill="none" stroke="#c08040" strokeWidth="1" strokeDasharray="4 2" />
        <polygon points="20,4 22,20 20,22 18,20" fill="#c08040" />
        <polygon points="20,36 22,20 20,18 18,20" fill="#8b4e1f" />
        <circle cx="20" cy="20" r="2.5" fill="#6b3a14" />
      </svg>
    </div>
  );
}
