export function SkeletonCard() {
  return (
    <div className="card animate-pulse" aria-hidden="true">
      <div className="skeleton h-5 w-2/3 mb-3" />
      <div className="skeleton h-4 w-full mb-2" />
      <div className="skeleton h-4 w-3/4 mb-4" />
      <div className="flex gap-2">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}
