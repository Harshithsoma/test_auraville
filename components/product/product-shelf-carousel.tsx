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
        className="grid auto-cols-[100%] grid-flow-col gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 [scrollbar-width:none] min-[520px]:auto-cols-[calc((100%-1rem)/2)] sm:auto-cols-[260px] lg:auto-cols-[250px]"
        ref={scrollerRef}
      >
        {products.map((product, index) => (
          <div className="snap-start" key={product.id}>
            <ProductCard priority={index < 2} product={product} />
          </div>
        ))}
      </div>
      {products.length > 4 ? (
        <>
          <button
            aria-label="Scroll products left"
            className="focus-ring absolute left-1 top-[38%] inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white/95 text-xl shadow-lg transition active:scale-90 hover:border-[var(--leaf)]"
            type="button"
            onClick={() => scrollBy("left")}
          >
            ‹
          </button>
          <button
            aria-label="Scroll products right"
            className="focus-ring absolute right-1 top-[38%] inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white/95 text-xl shadow-lg transition active:scale-90 hover:border-[var(--leaf)]"
            type="button"
            onClick={() => scrollBy("right")}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
