"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Product } from "@/types/product";
import { useSectionInView } from "@/hooks/use-section-in-view";
import { ProductCard } from "@/components/product/product-card";

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getVisibleCards() {
  if (window.innerWidth >= 1280) return 4;
  if (window.innerWidth >= 768) return 3;
  if (window.innerWidth >= 360) return 2;
  return 1;
}

function getPagingStep(visibleCards: number) {
  return visibleCards === 2 ? 2 : 1;
}

function getNextIndex(current: number, maxIndex: number, step: number) {
  return Math.min(maxIndex, Math.min(current, maxIndex) + step);
}

function getPreviousIndex(current: number, maxIndex: number, step: number) {
  return Math.max(0, Math.min(current, maxIndex) - step);
}

function getPageIndexes(maxIndex: number, step: number) {
  const indexes: number[] = [];
  for (let index = 0; index <= maxIndex; index += step) {
    indexes.push(index);
  }
  if (indexes[indexes.length - 1] !== maxIndex) {
    indexes.push(maxIndex);
  }
  return indexes;
}

function snapToPageIndex(index: number, maxIndex: number, step: number) {
  if (step <= 1) return Math.min(index, maxIndex);
  const snapped = Math.round(Math.min(index, maxIndex) / step) * step;
  return Math.min(maxIndex, snapped);
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("button, input, select, textarea, label, [role='button']") !== null
  );
}

function isDragPointerType(pointerType: string): boolean {
  return pointerType === "touch" || pointerType === "pen";
}

export function ProductShelfCarousel({
  products,
  variantContext = "default"
}: {
  products: Product[];
  variantContext?: "default" | "featured" | "bestSeller";
}) {
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 1);
  const maxIndex = Math.max(0, products.length - visibleCards);

  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isSectionInView = useSectionInView(sectionRef);

  const pagingStep = getPagingStep(visibleCards);
  const clampedIndex = snapToPageIndex(active, maxIndex, pagingStep);
  const pageIndexes = getPageIndexes(maxIndex, pagingStep);

  useEffect(
    () => () => {
      if (suppressTimerRef.current) {
        window.clearTimeout(suppressTimerRef.current);
      }
    },
    []
  );

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
    const shouldSuppressClick = dragMovedRef.current;

    if (finalOffset > threshold) {
      setActive((current) => getPreviousIndex(snapToPageIndex(current, maxIndex, pagingStep), maxIndex, pagingStep));
    } else if (finalOffset < -threshold) {
      setActive((current) => getNextIndex(snapToPageIndex(current, maxIndex, pagingStep), maxIndex, pagingStep));
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
    dragMovedRef.current = false;

    if (shouldSuppressClick) {
      suppressClickRef.current = true;
      if (suppressTimerRef.current) {
        window.clearTimeout(suppressTimerRef.current);
      }
      suppressTimerRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        suppressTimerRef.current = null;
      }, 0);
    }
  }

  const canNavigate = maxIndex > 0;

  return (
    <div className="relative" ref={sectionRef}>
      <div className="px-10 sm:px-10 md:px-12">
        <div
          className="overflow-hidden"
          ref={viewportRef}
          style={{ touchAction: "pan-y" }}
          onPointerCancel={() => endDrag()}
          onPointerDown={(event) => {
            if (!isDragPointerType(event.pointerType)) return;
            if (isInteractiveTarget(event.target)) return;
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
                className="h-full shrink-0 basis-full px-1.5 min-[360px]:basis-1/2 md:basis-1/3 md:px-2.5 xl:basis-1/4 xl:px-3"
                key={product.id}
                onClickCapture={(event) => {
                  if (suppressClickRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
              >
                <ProductCard priority={index < visibleCards} product={product} variantContext={variantContext} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {canNavigate && isSectionInView ? (
        <>
          <button
            aria-label="Show previous products"
            className="focus-ring absolute left-1 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:w-9"
            disabled={clampedIndex <= 0}
            type="button"
            onClick={() => setActive((current) => getPreviousIndex(snapToPageIndex(current, maxIndex, pagingStep), maxIndex, pagingStep))}
          >
            ‹
          </button>
          <button
            aria-label="Show next products"
            className="focus-ring absolute right-1 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:w-9"
            disabled={clampedIndex >= maxIndex}
            type="button"
            onClick={() => setActive((current) => getNextIndex(snapToPageIndex(current, maxIndex, pagingStep), maxIndex, pagingStep))}
          >
            ›
          </button>
        </>
      ) : null}

      {canNavigate ? (
        <div className="mt-5 flex justify-center gap-2">
          {pageIndexes.map((index) => (
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
