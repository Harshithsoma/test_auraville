export default function ProductDetailsLoading() {
  return (
    <div className="container-page py-10 md:py-14">
      <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-3">
          <div className="aspect-square rounded-lg bg-[var(--mint)]" />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="aspect-square rounded bg-[var(--mint)]" key={index} />
            ))}
          </div>
        </div>
        <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5">
          <div className="h-6 w-3/4 rounded bg-[var(--mint)]" />
          <div className="mt-3 h-4 w-1/2 rounded bg-[var(--mint)]" />
          <div className="mt-6 h-10 w-full rounded bg-[var(--mint)]" />
          <div className="mt-4 h-24 w-full rounded bg-[var(--mint)]" />
          <div className="mt-4 h-11 w-full rounded bg-[var(--mint)]" />
        </div>
      </div>
    </div>
  );
}

