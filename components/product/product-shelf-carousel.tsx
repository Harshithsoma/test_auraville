"use client";

import { useRef } from "react";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

export function ProductShelfCarousel({ products }: { products: Product[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollBy(direction: "left" | "right") {
    scrollerRef.current?.scrollBy({
      left: direction === "left" ? -340 : 340,
      behavior: "smooth"
    });
  }

  return (
    <div className="relative">
      <div
        className="mt-10 flex snap-x gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:thin]"
        ref={scrollerRef}
      >
        {products.map((product, index) => (
          <div className="w-[82vw] shrink-0 snap-start sm:w-[360px] lg:w-[280px]" key={product.id}>
            <ProductCard priority={index < 2} product={product} />
          </div>
        ))}
      </div>
      {products.length > 3 ? (
        <div className="mt-4 flex justify-end gap-3">
          <button
            aria-label="Scroll products left"
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-xl transition hover:border-[var(--leaf)]"
            type="button"
            onClick={() => scrollBy("left")}
          >
            ‹
          </button>
          <button
            aria-label="Scroll products right"
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-xl transition hover:border-[var(--leaf)]"
            type="button"
            onClick={() => scrollBy("right")}
          >
            ›
          </button>
        </div>
      ) : null}
    </div>
  );
}
