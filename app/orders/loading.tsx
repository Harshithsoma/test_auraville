export default function OrdersLoading() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5">
        <div className="h-6 w-40 rounded bg-[var(--mint)]" />
        <div className="mt-3 h-4 w-64 rounded bg-[var(--mint)]" />
      </div>
      <div className="mt-6 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5" key={index}>
            <div className="h-4 w-1/3 rounded bg-[var(--mint)]" />
            <div className="mt-3 h-4 w-1/2 rounded bg-[var(--mint)]" />
            <div className="mt-4 h-16 w-full rounded bg-[var(--mint)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

