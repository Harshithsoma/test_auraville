const cards = [
  {
    title: "Products",
    description: "Manage catalog records, variants, stock, and visibility from one place."
  },
  {
    title: "Orders",
    description: "Track order flow, status updates, and fulfillment operations."
  },
  {
    title: "Coupons",
    description: "Create and manage promo campaigns with usage controls."
  },
  {
    title: "Reviews",
    description: "Moderate incoming reviews and publish approved customer feedback."
  },
  {
    title: "Homepage Content",
    description: "Maintain hero sections, highlights, and content blocks for launch messaging."
  },
  {
    title: "Uploads",
    description: "Upload and manage image assets for products and site content."
  }
];

export default function AdminDashboardPage() {
  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
      <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin Dashboard</p>
      <h1 className="mt-3 text-3xl font-semibold">Auraville admin workspace</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        Foundation is ready. Feature forms and data wiring will be added in the next phases.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <article className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4" key={card.title}>
            <h2 className="text-base font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--leaf-deep)]">Placeholder</p>
          </article>
        ))}
      </div>
    </section>
  );
}
