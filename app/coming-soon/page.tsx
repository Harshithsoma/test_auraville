import type { Metadata } from "next";
import { ProductCard } from "@/components/product/product-card";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Coming Soon",
  description: "Preview Auraville cookies, health mix, laddu, and combo packs launching soon.",
  alternates: {
    canonical: absoluteUrl("/coming-soon")
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
