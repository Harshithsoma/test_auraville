"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";
import { Input } from "@/components/ui/input";

export function SearchClient({ products }: { products: Product[] }) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.category, product.tagline, product.description, product.ingredients.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, query]);

  return (
    <section>
      <label className="block max-w-2xl">
        <span className="text-sm font-semibold">Search Auraville</span>
        <Input
          autoFocus
          className="mt-2"
          placeholder="Search energy bar, cookies, laddu..."
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <p className="mt-5 text-sm text-[var(--muted)]">{results.length} results</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
