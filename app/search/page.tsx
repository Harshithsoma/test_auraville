import type { Metadata } from "next";
import { SearchClient } from "@/components/search/search-client";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Auraville products and upcoming palmyra sprout launches.",
  alternates: {
    canonical: absoluteUrl("/search")
  },
  robots: {
    index: false,
    follow: true
  }
};

export default function SearchPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <div className="mb-10 max-w-2xl">
        <p className="text-sm font-semibold uppercase text-[var(--coral)]">Search</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
          Find products and upcoming launches.
        </h1>
      </div>
      <SearchClient products={products} />
    </div>
  );
}
