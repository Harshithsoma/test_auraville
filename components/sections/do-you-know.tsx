"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const instagramPostUrl =
  "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

const cards = [
  {
    title: "Palmyra Sprout, Reintroduced",
    excerpt: "Why this traditional ingredient deserves a modern daily place.",
    image: "/sections/dyk-1.svg",
    postedAt: "2 days ago"
  },
  {
    title: "Clean Ingredient Notes",
    excerpt: "How we keep labels simple and meaningful for real families.",
    image: "/sections/dyk-2.svg",
    postedAt: "4 days ago"
  },
  {
    title: "Everyday Energy Thinking",
    excerpt: "Built for office breaks, school boxes, and travel days.",
    image: "/sections/dyk-3.svg",
    postedAt: "6 days ago"
  },
  {
    title: "Taste and Simplicity",
    excerpt: "Balanced sweetness with an Indian-rooted nutrition story.",
    image: "/sections/dyk-4.svg",
    postedAt: "1 week ago"
  },
  {
    title: "Palmyra-First Recipes",
    excerpt: "From snacks to shelves, every format starts with purpose.",
    image: "/sections/dyk-1.svg",
    postedAt: "1 week ago"
  },
  {
    title: "Auraville Journal",
    excerpt: "Small updates from our ingredient sourcing and recipe desk.",
    image: "/sections/dyk-2.svg",
    postedAt: "2 weeks ago"
  }
];

function subscribeToViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function getVisibleCards() {
  if (window.innerWidth >= 1280) return 4;
  if (window.innerWidth >= 1024) return 3;
  return 2;
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    target.closest("button, a, input, select, textarea, label, [role='button']") !== null
  );
}

export function DoYouKnowSection() {
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 2);
  const maxIndex = Math.max(0, cards.length - visibleCards);
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);

  const clampedIndex = Math.min(active, maxIndex);
  const centerIndex = clampedIndex + Math.floor(visibleCards / 2);

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

    if (finalOffset > threshold) {
      setActive((current) => Math.max(0, current - 1));
    } else if (finalOffset < -threshold) {
      setActive((current) => Math.min(maxIndex, current + 1));
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
    const shouldSuppressClick = dragMovedRef.current;
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
    <section className="container-page py-12 sm:py-16" aria-labelledby="do-you-know-title">
      <div className="mb-6 flex items-end justify-between gap-3 sm:mb-8">
        <h2 id="do-you-know-title" className="text-2xl font-bold sm:text-3xl">
          Do You Know?
        </h2>
      </div>

      <div className="relative">
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
              transform: `translate3d(calc(-${(clampedIndex * 100) / visibleCards}% + ${dragOffset}px), 0, 0)`
            }}
          >
            {cards.map((card, index) => {
              const isCenter = visibleCards >= 3 && index === Math.min(centerIndex, cards.length - 1);
              return (
                <div
                  className={`min-w-0 shrink-0 basis-1/2 px-2 transition-[transform,opacity] duration-300 md:px-2.5 lg:basis-1/3 xl:basis-1/4 ${
                    isCenter ? "opacity-100 lg:scale-[1.02]" : "opacity-95 lg:scale-[0.98]"
                  }`}
                  key={`${card.title}-${index}`}
                  onClickCapture={(event) => {
                    if (suppressClickRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                <Link
                  className="focus-ring group block h-full overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
                  href={instagramPostUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <div className="p-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--leaf-deep)] text-xs font-semibold text-white">
                        Au
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[var(--leaf-deep)]">auraville.india</p>
                        <p className="text-[11px] text-[var(--muted)]">{card.postedAt}</p>
                      </div>
                    </div>
                    <div className="relative mt-3 aspect-[4/5] overflow-hidden rounded-lg bg-[var(--mint)]">
                      <Image
                        alt={card.title}
                        className="object-cover transition duration-500 group-hover:scale-[1.04]"
                        fill
                        sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, 48vw"
                        src={card.image}
                      />
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-[var(--leaf-deep)]">{card.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{card.excerpt}</p>
                    <span className="mt-3 inline-flex items-center text-xs font-semibold text-[var(--leaf)]">
                      View on Instagram
                      <span className="ml-1.5 text-sm">↗</span>
                    </span>
                  </div>
                </Link>
                </div>
              );
            })}
          </div>
        </div>

        {maxIndex > 0 ? (
          <>
            <button
              aria-label="Show previous post cards"
              className="focus-ring absolute left-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[var(--leaf-deep)] shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={active <= 0}
              type="button"
              onClick={() => setActive((current) => Math.max(0, current - 1))}
            >
              ‹
            </button>
            <button
              aria-label="Show next post cards"
              className="focus-ring absolute right-0 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[var(--leaf-deep)] shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
              disabled={active >= maxIndex}
              type="button"
              onClick={() => setActive((current) => Math.min(maxIndex, current + 1))}
            >
              ›
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
