const trustItems = [
  "Palmyra sprout first",
  "Familiar Indian formats",
  "Clean everyday sweetness",
  "Honest launch status"
];

const testimonials = [
  {
    quote:
      "The energy bar feels Indian, modern, and easy to carry. It finally makes palmyra sprout feel relevant again.",
    name: "Anika R."
  },
  {
    quote: "I like that the brand is starting focused instead of launching a confusing shelf of random products.",
    name: "Dev M."
  },
  {
    quote: "The idea of cookies and laddu with palmyra sprout is exactly the kind of nostalgic snack I would try.",
    name: "Meera S."
  }
];

export function TrustSection() {
  return (
    <section className="container-page py-20" aria-labelledby="auraville-trust">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Why Auraville</p>
          <h2 id="auraville-trust" className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            A forgotten ingredient, rebuilt for today’s snack shelf.
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {trustItems.map((item) => (
            <div className="rounded-lg border border-[var(--line)] bg-white p-5" key={item}>
              <p className="font-semibold">{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {testimonials.map((testimonial) => (
          <figure className="rounded-lg border border-[var(--line)] bg-white p-6" key={testimonial.name}>
            <blockquote className="text-base leading-7 text-[var(--foreground)]">
              {testimonial.quote}
            </blockquote>
            <figcaption className="mt-5 text-sm font-semibold text-[var(--muted)]">
              {testimonial.name}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
