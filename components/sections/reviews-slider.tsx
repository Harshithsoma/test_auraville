"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const reviews = [
  {
    name: "Anika R.",
    rating: 5,
    text: "The energy bar feels clean and filling without being too sweet. Easy daily snack."
  },
  {
    name: "Dev M.",
    rating: 4,
    text: "Good ingredient profile and honest launch approach. Looking forward to the cookies."
  },
  {
    name: "Meera S.",
    rating: 5,
    text: "Palmyra sprout in a modern format is exactly what I wanted for office snacking."
  },
  {
    name: "Pranav K.",
    rating: 4,
    text: "Texture is solid and travel-friendly. Works well for pre-workout days."
  },
  {
    name: "Ishita N.",
    rating: 5,
    text: "Loved the taste and clean label. The brand story also feels meaningful."
  },
  {
    name: "Harish V.",
    rating: 4,
    text: "Simple product, good quality, and straightforward checkout experience."
  }
];

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getVisibleCards() {
  return window.innerWidth >= 1024 ? 3 : 1;
}

export function ReviewsSlider() {
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 1);
  const maxIndex = Math.max(0, reviews.length - visibleCards);

  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const currentIndex = Math.min(active, maxIndex);

  useEffect(() => {
    if (isDragging) return;
    const timer = window.setInterval(() => {
      setActive((current) => {
        const safeCurrent = Math.min(current, maxIndex);
        return safeCurrent >= maxIndex ? 0 : safeCurrent + 1;
      });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [isDragging, maxIndex]);

  function beginDrag(pointerId: number, clientX: number, target: HTMLDivElement) {
    pointerIdRef.current = pointerId;
    startXRef.current = clientX;
    target.setPointerCapture(pointerId);
    setIsDragging(true);
    setDragOffset(0);
  }

  function moveDrag(pointerId: number, clientX: number) {
    if (!isDragging || pointerIdRef.current !== pointerId) return;
    setDragOffset(clientX - startXRef.current);
  }

  function endDrag(pointerId?: number, clientX?: number) {
    if (!isDragging) return;
    if (typeof pointerId === "number" && pointerIdRef.current !== pointerId) return;

    const finalOffset = typeof clientX === "number" ? clientX - startXRef.current : dragOffset;
    const width = viewportRef.current?.clientWidth ?? 0;
    const threshold = Math.max(40, Math.round(width * 0.12));

    if (finalOffset > threshold) {
      setActive((current) => Math.max(0, Math.min(current, maxIndex) - 1));
    } else if (finalOffset < -threshold) {
      setActive((current) => Math.min(maxIndex, Math.min(current, maxIndex) + 1));
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
  }

  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="reviews-title">
      <h2 id="reviews-title" className="text-center text-2xl font-bold sm:text-3xl">
        Reviews
      </h2>
      <div
        className="relative mt-8 overflow-hidden rounded-lg border border-[var(--line)] bg-white"
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
          className={`flex ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
          style={{
            transform: `translate3d(calc(-${(currentIndex * 100) / visibleCards}% + ${dragOffset}px), 0, 0)`
          }}
        >
          {reviews.map((review) => (
            <article
              className={`shrink-0 border-r border-[var(--line)] p-5 ${visibleCards === 3 ? "w-1/3" : "w-full"}`}
              key={`${review.name}-${review.text}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">{review.name}</h3>
                <p className="text-sm font-semibold text-[var(--leaf-deep)]">
                  {"★".repeat(review.rating)}
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{review.text}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: maxIndex + 1 }).map((_, index) => (
          <button
            aria-label={`Go to review group ${index + 1}`}
            className={`h-2.5 rounded-full transition ${index === currentIndex ? "w-8 bg-[var(--leaf-deep)]" : "w-2.5 bg-[var(--line)]"}`}
            key={index}
            type="button"
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  );
}
