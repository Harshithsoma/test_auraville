import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Learn why Auraville is bringing palmyra sprout back through modern snacks and everyday food formats.",
  alternates: {
    canonical: absoluteUrl("/about")
  }
};

export default function AboutPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">About Auraville</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            We are rebuilding a place for palmyra sprout in modern food.
          </h1>
          <p className="mt-6 text-base leading-8 text-[var(--muted)]">
            Auraville began with a simple question: why did an ingredient once known in local
            food culture disappear from everyday shelves? Our answer is to bring palmyra sprout
            back through formats people already reach for: energy bars, cookies, health mix,
            laddu, and family-friendly snack packs.
          </p>
          <Button className="mt-8" href="/product/palmyra-sprout-energy-bar">
            Try the first product
          </Button>
        </div>
        <div className="rounded-lg border border-[var(--line)] bg-white p-6">
          <h2 className="text-2xl font-semibold">What we stand for</h2>
          <div className="mt-6 grid gap-4">
            {[
              ["Ingredient revival", "Make palmyra sprout useful, visible, and easy to consume again."],
              ["Familiar formats", "Build products people already understand instead of asking them to change habits overnight."],
              ["Clean launch discipline", "Start focused, mark coming-soon products clearly, and scale the range with intention."]
            ].map(([title, body]) => (
              <div className="rounded-lg bg-[var(--mint)] p-4" key={title}>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
