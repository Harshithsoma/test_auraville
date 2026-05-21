export default function BestSellingLoading() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl animate-pulse">
        <div className="h-4 w-40 rounded bg-[var(--mint)]" />
        <div className="mt-4 h-12 w-3/4 rounded bg-[var(--mint)]" />
        <div className="mt-4 h-5 w-full rounded bg-[var(--mint)]" />
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="animate-pulse rounded-lg border border-[var(--line)] bg-white p-3" key={index}>
            <div className="aspect-[4/4.2] rounded bg-[var(--mint)]" />
            <div className="mt-3 h-4 w-3/4 rounded bg-[var(--mint)]" />
            <div className="mt-2 h-3 w-1/2 rounded bg-[var(--mint)]" />
            <div className="mt-3 h-8 w-full rounded bg-[var(--mint)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

