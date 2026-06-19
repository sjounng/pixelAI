function SkeletonBox({ className = "" }: { className?: string }) {
  return <div className={"skeleton rounded-md " + className} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <SkeletonBox className="h-9 w-48" />
        <SkeletonBox className="h-4 w-full max-w-sm" />
      </div>
      <ArtworkGridSkeleton />
    </div>
  );
}

export function ArtworkGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <article key={index} className="card space-y-3">
          <SkeletonBox className="aspect-square w-full border-2 border-ink/20" />
          <SkeletonBox className="h-3 w-5/6" />
          <SkeletonBox className="h-3 w-2/3" />
        </article>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <header className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-4">
          <SkeletonBox className="h-3 w-32" />
          <SkeletonBox className="h-10 w-28" />
          <SkeletonBox className="h-10 w-32" />
        </section>
        <section className="card space-y-3">
          <SkeletonBox className="h-3 w-28" />
          <SkeletonBox className="h-3 w-full" />
          <SkeletonBox className="h-3 w-4/5" />
          <SkeletonBox className="h-3 w-2/3" />
        </section>
      </header>
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <SkeletonBox className="h-8 w-28" />
          <SkeletonBox className="h-10 w-full max-w-xs" />
        </div>
        <ArtworkGridSkeleton />
      </section>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <SkeletonBox className="h-4 w-24" />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="card">
          <SkeletonBox className="mx-auto aspect-square w-full max-w-[512px] border-2 border-ink/20" />
        </section>
        <section className="card space-y-4">
          <SkeletonBox className="h-3 w-24" />
          <SkeletonBox className="h-4 w-full" />
          <SkeletonBox className="h-4 w-5/6" />
          <SkeletonBox className="h-10 w-32" />
          <div className="grid grid-cols-2 gap-3 border-t-2 border-dashed border-ink pt-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <SkeletonBox key={index} className="h-4 w-full" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function WishlistSkeleton() {
  return (
    <div className="space-y-4">
      <header className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <SkeletonBox className="h-8 w-36" />
            <SkeletonBox className="h-3 w-64 max-w-full" />
          </div>
          <SkeletonBox className="h-10 w-48" />
        </div>
        <div className="flex gap-2">
          <SkeletonBox className="h-10 w-24" />
          <SkeletonBox className="h-10 w-24" />
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-[200px_1fr]">
        <aside className="card space-y-3">
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-9 w-full" />
          <SkeletonBox className="h-9 w-full" />
          <SkeletonBox className="h-9 w-full" />
        </aside>
        <ArtworkGridSkeleton count={6} />
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBox className="h-7 w-32" />
          <SkeletonBox className="h-4 w-72 max-w-full" />
        </div>
        <SkeletonBox className="h-4 w-20" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="card">
          <SkeletonBox className="mx-auto aspect-square w-full max-w-[512px] border-2 border-ink/20" />
        </section>
        <aside className="card space-y-4">
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-32 w-full" />
          <SkeletonBox className="h-10 w-full" />
        </aside>
      </div>
    </div>
  );
}

export function GenerateSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="card space-y-4">
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-24 w-full" />
          <SkeletonBox className="ml-auto h-3 w-20" />
        </div>

        <div className="space-y-2">
          <SkeletonBox className="h-4 w-28" />
          <SkeletonBox className="h-32 w-full border-2 border-dashed border-ink/20" />
        </div>

        <div className="space-y-2">
          <SkeletonBox className="h-4 w-20" />
          <div className="grid grid-cols-2 gap-2">
            <SkeletonBox className="h-11 w-full" />
            <SkeletonBox className="h-11 w-full" />
          </div>
        </div>

        <SkeletonBox className="h-11 w-full" />

        <div className="space-y-2 border-t-2 border-dashed border-ink pt-3">
          <SkeletonBox className="h-3 w-10" />
          <SkeletonBox className="h-3 w-full" />
          <SkeletonBox className="h-3 w-5/6" />
        </div>
      </section>

      <section className="card flex flex-col items-center justify-center gap-4">
        <SkeletonBox className="h-3 w-24" />
        <SkeletonBox className="aspect-square w-full max-w-[520px] border-2 border-ink/20" />
        <div className="flex w-full max-w-[520px] gap-2">
          <SkeletonBox className="h-10 flex-1" />
          <SkeletonBox className="h-10 flex-1" />
        </div>
      </section>
    </div>
  );
}

export function ConvertSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="card space-y-4">
        <div className="space-y-2">
          <SkeletonBox className="h-7 w-24" />
          <SkeletonBox className="h-4 w-full max-w-md" />
        </div>

        <div className="space-y-2">
          <SkeletonBox className="h-4 w-14" />
          <SkeletonBox className="h-40 w-full border-2 border-dashed border-ink/20" />
        </div>

        <div className="space-y-2">
          <SkeletonBox className="h-4 w-24" />
          <div className="grid grid-cols-2 gap-2">
            <SkeletonBox className="h-11 w-full" />
            <SkeletonBox className="h-11 w-full" />
          </div>
        </div>

        <div className="space-y-2">
          <SkeletonBox className="h-4 w-20" />
          <SkeletonBox className="h-10 w-full" />
        </div>

        <SkeletonBox className="h-11 w-full" />
        <SkeletonBox className="h-3 w-full" />
      </section>

      <section className="card flex flex-col items-center justify-center gap-3">
        <SkeletonBox className="h-3 w-28" />
        <SkeletonBox className="aspect-square w-full max-w-[420px] border-2 border-ink/20" />
        <SkeletonBox className="h-3 w-32" />
      </section>
    </div>
  );
}
