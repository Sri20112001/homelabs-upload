export function SkeletonGrid() {
  return (
    <div className="flex flex-col gap-(--spacing-space-xl)">
      <section>
        <div className="flex items-center gap-2 mb-(--spacing-space-md)">
          <div className="h-5 w-24 rounded-lg bg-(--color-surface-container-high) animate-pulse" />
          <div className="h-5 w-6 rounded-full bg-(--color-surface-container-high) animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-(--spacing-space-md)">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl p-(--spacing-space-md) bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) animate-pulse">
              <div className="w-10 h-10 rounded-lg bg-(--color-surface-container-high) mb-(--spacing-space-lg)" />
              <div className="h-3.5 w-3/4 rounded bg-(--color-surface-container-high) mb-2" />
              <div className="h-3 w-1/2 rounded bg-(--color-surface-container-high)" />
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-(--spacing-space-md)">
          <div className="h-5 w-16 rounded-lg bg-(--color-surface-container-high) animate-pulse" />
          <div className="h-5 w-12 rounded-full bg-(--color-surface-container-high) animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-(--spacing-space-md)">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl p-(--spacing-space-md) bg-(--color-surface-container-lowest) border border-(--color-surface-container-high) animate-pulse">
              <div className="w-full aspect-[4/3] rounded-lg bg-(--color-surface-container-high) mb-(--spacing-space-md)" />
              <div className="h-3.5 w-3/4 rounded bg-(--color-surface-container-high) mb-2" />
              <div className="h-3 w-1/2 rounded bg-(--color-surface-container-high)" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
