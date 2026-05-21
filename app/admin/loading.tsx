export default function AdminLoading() {
  return (
    <div className="container-page py-8 md:py-12">
      <div className="grid gap-6 md:grid-cols-[250px_1fr]">
        <aside className="hidden animate-pulse rounded-xl border border-[var(--line)] bg-white p-4 md:block">
          <div className="h-4 w-20 rounded bg-[var(--mint)]" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="h-9 rounded bg-[var(--mint)]" key={index} />
            ))}
          </div>
        </aside>
        <main className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5">
          <div className="h-7 w-1/3 rounded bg-[var(--mint)]" />
          <div className="mt-4 h-24 w-full rounded bg-[var(--mint)]" />
          <div className="mt-3 h-24 w-full rounded bg-[var(--mint)]" />
        </main>
      </div>
    </div>
  );
}

