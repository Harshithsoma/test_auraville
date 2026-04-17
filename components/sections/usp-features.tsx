const features = [
  {
    label: "Gluten Free",
    icon: (
      <path d="M12 4c3 3 4.5 5.8 4.5 8.3A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.7C7.5 9.8 9 7 12 4Z" />
    )
  },
  {
    label: "No Preservatives",
    icon: <path d="M6 7h12M8 7l1 12h6l1-12M10 7V5h4v2" />
  },
  {
    label: "Rich in Fiber",
    icon: <path d="M5 18c7 0 12-5 14-12-7 0-12 5-14 12Zm0 0 8-8" />
  },
  {
    label: "Rich in Iron",
    icon: <path d="M12 4v16M7 8h10M7 16h10M5 12h14" />
  },
  {
    label: "Natural Energy",
    icon: <path d="m13 3-7 11h5l-1 7 8-12h-5l0-6Z" />
  }
];

export function UspFeatures() {
  return (
    <section className="bg-[var(--mint)] py-5" aria-label="Product benefits">
      <div className="container-page flex snap-x gap-4 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible">
        {features.map((feature) => (
          <div
            className="flex min-w-[104px] snap-start flex-col items-center justify-center gap-2 rounded-lg bg-white px-3 py-4 text-center shadow-sm"
            key={feature.label}
          >
            <svg className="h-7 w-7 text-[var(--leaf-deep)]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                {feature.icon}
              </g>
            </svg>
            <p className="text-xs font-bold leading-4 text-[var(--foreground)]">{feature.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
