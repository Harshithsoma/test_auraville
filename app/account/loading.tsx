export default function AccountLoading() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5" key={index}>
            <div className="h-5 w-1/3 rounded bg-[var(--mint)]" />
            <div className="mt-3 h-4 w-3/4 rounded bg-[var(--mint)]" />
            <div className="mt-5 h-10 w-36 rounded bg-[var(--mint)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

