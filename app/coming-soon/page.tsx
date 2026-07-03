import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/products";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Coming Soon Palmyra Snacks",
  description:
    "Preview upcoming Auraville Palmyra Sprouts cookies, health mix, laddu, and healthy Indian snack packs before they launch online.",
  alternates: {
    canonical: absoluteUrl("/coming-soon")
  },
  openGraph: {
    title: "Coming Soon Palmyra Snacks",
    description:
      "Preview upcoming Auraville Palmyra Sprouts cookies, health mix, laddu, and healthy Indian snack packs before they launch online.",
    url: absoluteUrl("/coming-soon"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville coming soon Palmyra snacks" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Coming Soon Palmyra Snacks",
    description:
      "Preview upcoming Auraville Palmyra Sprouts cookies, health mix, laddu, and healthy Indian snack packs before they launch online.",
    images: [defaultShareImageUrl()]
  }
};

export default function ComingSoonPage() {
  const comingSoon = products.filter((product) => product.availability === "coming-soon");

  return (
    <div className="container-page py-12 md:py-16">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Coming soon</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          The next palmyra sprout products.
        </h1>
        <p className="mt-5 text-base leading-7 text-[var(--muted)]">
          These recipes are in development. Preview the planned range before launch.
        </p>
      </div>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {comingSoon.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
