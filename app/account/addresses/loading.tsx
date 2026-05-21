export default function AddressesLoading() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5">
        <div className="h-6 w-44 rounded bg-[var(--mint)]" />
        <div className="mt-3 h-4 w-72 rounded bg-[var(--mint)]" />
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="animate-pulse rounded-xl border border-[var(--line)] bg-white p-5" key={index}>
            <div className="h-4 w-2/3 rounded bg-[var(--mint)]" />
            <div className="mt-2 h-4 w-5/6 rounded bg-[var(--mint)]" />
            <div className="mt-4 h-9 w-24 rounded bg-[var(--mint)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

