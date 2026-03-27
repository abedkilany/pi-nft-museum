type PageSkeletonProps = {
  titleLines?: number;
  cards?: number;
  dense?: boolean;
};

export default function PageSkeleton({
  titleLines = 2,
  cards = 6,
  dense = false,
}: PageSkeletonProps) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="animate-pulse space-y-6">
        <div className="space-y-3">
          {Array.from({ length: titleLines }).map((_, index) => (
            <div
              key={index}
              className={`h-4 rounded-full bg-white/10 ${index === 0 ? 'w-56' : 'w-80 max-w-full'}`}
            />
          ))}
        </div>

        <div
          className={`grid gap-4 ${dense ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
        >
          {Array.from({ length: cards }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              <div className="aspect-[4/3] bg-white/10" />
              <div className="space-y-3 p-4">
                <div className="h-4 w-2/3 rounded-full bg-white/10" />
                <div className="h-3 w-1/2 rounded-full bg-white/10" />
                <div className="h-3 w-5/6 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
