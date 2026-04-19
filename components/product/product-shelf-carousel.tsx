"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import type { Product } from "@/types/product";
import { ProductCard } from "@/components/product/product-card";

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getVisibleCards() {
  if (window.innerWidth >= 1280) return 4;
  if (window.innerWidth >= 768) return 3;
  return 2;
}

export function ProductShelfCarousel({ products }: { products: Product[] }) {
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 2);
  const maxIndex = Math.max(0, products.length - visibleCards);

  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);

  const clampedIndex = Math.min(active, maxIndex);

  function beginDrag(pointerId: number, clientX: number, target: HTMLDivElement) {
    pointerIdRef.current = pointerId;
    startXRef.current = clientX;
    dragMovedRef.current = false;
    target.setPointerCapture(pointerId);
    setIsDragging(true);
    setDragOffset(0);
  }

  function moveDrag(pointerId: number, clientX: number) {
    if (!isDragging || pointerIdRef.current !== pointerId) return;
    const nextOffset = clientX - startXRef.current;
    if (Math.abs(nextOffset) > 8) {
      dragMovedRef.current = true;
    }
    setDragOffset(nextOffset);
  }

  function endDrag(pointerId?: number, clientX?: number) {
    if (!isDragging) return;
    if (typeof pointerId === "number" && pointerIdRef.current !== pointerId) return;

    const finalOffset = typeof clientX === "number" ? clientX - startXRef.current : dragOffset;
    const width = viewportRef.current?.clientWidth ?? 0;
    const threshold = Math.max(34, Math.round(width * 0.11));

    if (finalOffset > threshold) {
      setActive((current) => Math.max(0, Math.min(current, maxIndex) - 1));
    } else if (finalOffset < -threshold) {
      setActive((current) => Math.min(maxIndex, Math.min(current, maxIndex) + 1));
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
  }

  const canNavigate = maxIndex > 0;

  return (
    <div className="relative">
      <div
        className="overflow-hidden"
        ref={viewportRef}
        style={{ touchAction: "pan-y" }}
        onPointerCancel={() => endDrag()}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          beginDrag(event.pointerId, event.clientX, event.currentTarget);
        }}
        onPointerMove={(event) => moveDrag(event.pointerId, event.clientX)}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          endDrag(event.pointerId, event.clientX);
        }}
      >
        <div
          className={`-mx-2 flex ${isDragging ? "" : "transition-transform duration-500 ease-out"} md:-mx-2.5 xl:-mx-3`}
          style={{
            transform: `translate3d(calc(-${(clampedIndex * 100) / visibleCards}% + ${dragOffset}px), 0, 0)`
          }}
        >
          {products.map((product, index) => (
            <div
              className="shrink-0 basis-1/2 px-2 md:basis-1/3 md:px-2.5 xl:basis-1/4 xl:px-3"
              key={product.id}
              onClickCapture={(event) => {
                if (dragMovedRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
            >
              <ProductCard priority={index < visibleCards} product={product} />
            </div>
          ))}
        </div>
      </div>

      {canNavigate ? (
        <>
          <button
            aria-label="Show previous products"
            className="focus-ring absolute left-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={clampedIndex <= 0}
            type="button"
            onClick={() => setActive((current) => Math.max(0, Math.min(current, maxIndex) - 1))}
          >
            ‹
          </button>
          <button
            aria-label="Show next products"
            className="focus-ring absolute right-0 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={clampedIndex >= maxIndex}
            type="button"
            onClick={() => setActive((current) => Math.min(maxIndex, Math.min(current, maxIndex) + 1))}
          >
            ›
          </button>
        </>
      ) : null}

      {canNavigate ? (
        <div className="mt-5 flex justify-center gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              aria-label={`Go to product slide ${index + 1}`}
              className={`h-2 rounded-full transition ${index === clampedIndex ? "w-7 bg-[var(--leaf-deep)]" : "w-2 bg-[var(--line)]"}`}
              key={index}
              type="button"
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
