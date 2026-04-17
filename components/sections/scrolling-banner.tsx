const messages = ["Made in India", "100% Natural", "No Preservatives", "Palmyra Sprout First", "Clean Everyday Energy"];

export function ScrollingBanner() {
  const repeated = [...messages, ...messages];

  return (
    <section className="overflow-hidden border-y border-[var(--line)] bg-white py-3" aria-label="Auraville highlights">
      <div className="marquee-track flex gap-8">
        {repeated.map((message, index) => (
          <span
            className="shrink-0 whitespace-nowrap text-xs font-bold uppercase text-[var(--leaf-deep)] sm:text-sm"
            key={`${message}-${index}`}
          >
            <span className="inline-flex items-center gap-8">
              {message}
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" />
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
