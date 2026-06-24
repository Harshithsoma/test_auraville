"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Product } from "@/types/product";
import { useSectionInView } from "@/hooks/use-section-in-view";
import { ProductCard } from "@/components/product/product-card";

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getViewportWidth() {
  return window.innerWidth;
}

function getCardsPerView(viewportWidth: number) {
  if (viewportWidth >= 1280) return 4;
  if (viewportWidth >= 768) return 3;
  if (viewportWidth >= 360) return 2;
  return 1;
}

function getCardGap(viewportWidth: number) {
  if (viewportWidth >= 1280) return 24;
  if (viewportWidth >= 768) return 20;
  return 12;
}

function getCardWidth(containerWidth: number, cardsPerView: number, gap: number) {
  if (containerWidth <= 0) return 0;
  const totalGap = gap * Math.max(0, cardsPerView - 1);
  return Math.max(0, (containerWidth - totalGap) / cardsPerView);
}

function useMeasuredElementWidth<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const subscribe = useCallback(
    (callback: () => void) => {
      if (!node) return () => undefined;
      if (typeof ResizeObserver === "undefined") return () => undefined;
      const observer = new ResizeObserver(callback);
      observer.observe(node);
      return () => observer.disconnect();
    },
    [node]
  );
  const getSnapshot = useCallback(() => node?.clientWidth ?? 0, [node]);
  const width = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  return [setNode, width] as const;
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
  const viewportWidth = useSyncExternalStore(subscribeToViewport, getViewportWidth, () => 0);
  const cardsPerView = getCardsPerView(viewportWidth);
  const gap = getCardGap(viewportWidth);
  const maxIndex = Math.max(0, products.length - cardsPerView);

  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const [setViewportNode, viewportWidthPx] = useMeasuredElementWidth<HTMLDivElement>();
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isSectionInView = useSectionInView(sectionRef);

  const cardWidth = getCardWidth(viewportWidthPx, cardsPerView, gap);
  const clampedIndex = Math.min(active, maxIndex);
  const cardBasis =
    cardWidth > 0
      ? `${cardWidth}px`
      : `calc((100% - ${gap * Math.max(0, cardsPerView - 1)}px) / ${cardsPerView})`;

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
    const width = viewportWidthPx;
    const threshold = Math.max(34, Math.round(width * 0.11));
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

  const canNavigate = maxIndex > 0;

  return (
    <div className="relative" ref={sectionRef}>
      <div className="px-8 sm:px-10 md:px-12">
        <div
          className="overflow-hidden"
          ref={setViewportNode}
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
            className={`flex ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
            style={{
              gap: `${gap}px`,
              transform: `translate3d(${-(clampedIndex * (cardWidth + gap)) + dragOffset}px, 0, 0)`
            }}
          >
            {products.map((product, index) => (
              <div
                className="h-full min-w-0 shrink-0"
                key={product.id}
                style={{ flexBasis: cardBasis, width: cardBasis }}
                onClickCapture={(event) => {
                  if (suppressClickRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                  }
                }}
              >
                <ProductCard priority={index < cardsPerView} product={product} variantContext={variantContext} />
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
            onClick={() => setActive((current) => Math.max(0, Math.min(current, maxIndex) - 1))}
          >
            ‹
          </button>
          <button
            aria-label="Show next products"
            className="focus-ring absolute right-1 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white/95 text-lg text-[var(--leaf-deep)] shadow-sm transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:h-9 sm:w-9"
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
