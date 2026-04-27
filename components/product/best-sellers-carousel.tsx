"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Product } from "@/types/product";
import { useSectionInView } from "@/hooks/use-section-in-view";
import { BestSellerCard } from "@/components/product/best-seller-card";

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getVisibleCards() {
  if (window.innerWidth >= 1280) return 4;
  if (window.innerWidth >= 768) return 3;
  return 2;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("button, a, input, select, textarea, label, [role='button']") !== null
  );
}

export function BestSellersCarousel({ products }: { products: Product[] }) {
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 2);
  const maxIndex = Math.max(0, products.length - visibleCards);
  const clampedVisibleCards = Math.min(visibleCards, Math.max(products.length, 1));

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

  const clampedIndex = Math.min(active, maxIndex);
  const canNavigate = maxIndex > 0;

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
    const threshold = Math.max(36, Math.round(width * 0.1));
    const shouldSuppressClick = dragMovedRef.current;

    if (finalOffset > threshold) {
      setActive((current) => Math.max(0, Math.min(current, maxIndex) - 1));
    } else if (finalOffset < -threshold) {
      setActive((current) => Math.min(maxIndex, Math.min(current, maxIndex) + 1));
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

  return (
    <div className="relative" ref={sectionRef}>
      <div
        className="overflow-hidden"
        ref={viewportRef}
        style={{ touchAction: "pan-y" }}
        onPointerCancel={() => endDrag()}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
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
          className={`-mx-2 flex ${isDragging ? "" : "transition-transform duration-500 ease-out"} md:-mx-2.5`}
          style={{
            transform: `translate3d(calc(-${(clampedIndex * 100) / clampedVisibleCards}% + ${dragOffset}px), 0, 0)`
          }}
        >
          {products.map((product, index) => (
            <div
              className="min-w-0 shrink-0 basis-1/2 px-2 md:basis-1/3 md:px-2.5 xl:basis-1/4"
              key={product.id}
              onClickCapture={(event) => {
                if (suppressClickRef.current) {
                  event.preventDefault();
                  event.stopPropagation();
                }
              }}
            >
              <BestSellerCard priority={index < clampedVisibleCards} product={product} />
            </div>
          ))}
        </div>
      </div>

      {canNavigate && isSectionInView ? (
        <>
          <button
            aria-label="Show previous best sellers"
            className="focus-ring absolute -left-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[var(--leaf-deep)] shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:-left-5"
            disabled={clampedIndex <= 0}
            type="button"
            onClick={() => setActive((current) => Math.max(0, Math.min(current, maxIndex) - 1))}
          >
            ‹
          </button>
          <button
            aria-label="Show next best sellers"
            className="focus-ring absolute -right-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[var(--leaf-deep)] shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:-right-5"
            disabled={clampedIndex >= maxIndex}
            type="button"
            onClick={() => setActive((current) => Math.min(maxIndex, Math.min(current, maxIndex) + 1))}
          >
            ›
          </button>
        </>
      ) : null}
    </div>
  );
}
