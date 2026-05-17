"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSectionInView } from "@/hooks/use-section-in-view";
import {
  HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS,
  HOMEPAGE_DEFAULT_DO_YOU_KNOW_SUBTITLE,
  HOMEPAGE_DEFAULT_DO_YOU_KNOW_TITLE,
  type HomepageDoYouKnowCard
} from "@/lib/homepage-defaults";

type DoYouKnowCardView = {
  title: string;
  excerpt: string;
  image: string;
  postedAt: string;
  linkUrl: string;
  buttonText: string;
};

const defaultInstagramUrl =
  "https://www.instagram.com/p/DT--hjFk77y/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

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
    target.closest("button, input, select, textarea, label, [role='button']") !== null
  );
}

function isRenderableImage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
    return !blockedHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function normalizeCards(cards?: HomepageDoYouKnowCard[]): DoYouKnowCardView[] {
  const source = cards && cards.length > 0 ? cards : HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS;
  const normalized = [...source]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter((card) => card.isActive !== false)
    .map((card) => ({
      title: card.title?.trim() || "",
      excerpt: card.body?.trim() || "",
      image: card.imageUrl?.trim() || "",
      postedAt: card.postedAt?.trim() || "",
      linkUrl: card.linkUrl?.trim() || defaultInstagramUrl,
      buttonText: card.buttonText?.trim() || "View on Instagram"
    }))
    .filter((card) => card.title.length > 0 && card.excerpt.length > 0 && isRenderableImage(card.image));

  if (normalized.length > 0) {
    return normalized;
  }

  return HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS.map((card) => ({
    title: card.title,
    excerpt: card.body,
    image: card.imageUrl || "/sections/dyk-1.svg",
    postedAt: card.postedAt || "",
    linkUrl: card.linkUrl || defaultInstagramUrl,
    buttonText: card.buttonText || "View on Instagram"
  }));
}

export function DoYouKnowSection({
  title,
  subtitle,
  cards
}: {
  title?: string;
  subtitle?: string;
  cards?: HomepageDoYouKnowCard[];
}) {
  const renderedCards = useMemo(() => normalizeCards(cards), [cards]);
  const visibleCards = useSyncExternalStore(subscribeToViewport, getVisibleCards, () => 2);
  const maxIndex = Math.max(0, renderedCards.length - visibleCards);
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const isSectionInView = useSectionInView(sectionRef);

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
        <div>
          <h2 id="do-you-know-title" className="text-2xl font-bold sm:text-3xl">
            {title?.trim() || HOMEPAGE_DEFAULT_DO_YOU_KNOW_TITLE}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {subtitle?.trim() || HOMEPAGE_DEFAULT_DO_YOU_KNOW_SUBTITLE}
          </p>
        </div>
      </div>

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
              transform: `translate3d(calc(-${(clampedIndex * 100) / visibleCards}% + ${dragOffset}px), 0, 0)`
            }}
          >
            {renderedCards.map((card, index) => {
              const isCenter = visibleCards >= 3 && index === Math.min(centerIndex, renderedCards.length - 1);
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
                    href={card.linkUrl}
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
                        {card.buttonText}
                        <span className="ml-1.5 text-sm">↗</span>
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {maxIndex > 0 && isSectionInView ? (
          <>
            <button
              aria-label="Show previous post cards"
              className="focus-ring absolute -left-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[var(--leaf-deep)] shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:-left-5"
              disabled={active <= 0}
              type="button"
              onClick={() => setActive((current) => Math.max(0, current - 1))}
            >
              ‹
            </button>
            <button
              aria-label="Show next post cards"
              className="focus-ring absolute -right-3 top-1/2 z-10 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--line)] bg-white text-lg text-[var(--leaf-deep)] shadow-md transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:-right-5"
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
