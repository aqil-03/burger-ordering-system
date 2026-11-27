const skeletonItems = [0, 1, 2, 3]

export default function MenuGridSkeleton() {
  return (
    <div
      className="grid gap-5 md:grid-cols-2 lg:gap-6"
      aria-hidden="true"
    >
      {skeletonItems.map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-[1.75rem] border border-cream-200 bg-white"
        >
          <div className="aspect-[4/3] animate-pulse bg-cream-100" />
          <div className="space-y-3 p-6">
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-cream-100" />
            <div className="h-7 w-48 animate-pulse rounded-lg bg-cream-100" />
            <div className="h-3 w-full animate-pulse rounded-full bg-cream-100" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-cream-100" />
            <div className="mt-5 h-8 w-full animate-pulse rounded-lg bg-cream-50" />
          </div>
        </div>
      ))}
    </div>
  )
}
