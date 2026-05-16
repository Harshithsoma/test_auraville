"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type HeroSlide = {
  title: string;
  subtitle?: string;
  buttonText?: string;
  image: string;
  href?: string;
  objectPosition?: string;
};

const defaultSlides: HeroSlide[] = [
  {
    title: "Bringing palmyra sprout back to the snack shelf.",
    image: "/hero/palmyra-energy.svg",
    href: "/product/palmyra-sprout-energy-bar",
    objectPosition: "50% 50%"
  },
  {
    title: "Palmyra sprout cookies coming soon.",
    image: "/hero/palmyra-cookies.svg",
    href: "/product/palmyra-sprout-cookies",
    objectPosition: "50% 50%"
  },
  {
    title: "Palmyra health mix coming soon.",
    image: "/hero/palmyra-health-mix.svg",
    href: "/product/palmyra-sprout-health-mix",
    objectPosition: "50% 50%"
  },
  {
    title: "Palmyra sprout laddu coming soon.",
    image: "/hero/palmyra-laddu.svg",
    href: "/product/palmyra-sprout-laddu",
    objectPosition: "50% 50%"
  }
];

export function HeroSlideshow({ slides = defaultSlides }: { slides?: HeroSlide[] }) {
  const normalizedSlides = slides.length > 0 ? slides : defaultSlides;
  const firstSlide = normalizedSlides[0] ?? defaultSlides[0]!;

  const slideCount = normalizedSlides.length;
  const loopSlides = [normalizedSlides[normalizedSlides.length - 1] ?? firstSlide, ...normalizedSlides, firstSlide];

  const [position, setPosition] = useState(1);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    function normalizeToCoreSlides(next: number) {
      const wrapped = ((next - 1) % slideCount + slideCount) % slideCount;
      return wrapped + 1;
    }

    function handleVisibilityChange() {
      const visible = document.visibilityState === "visible";
      setIsPageVisible(visible);
      if (visible) {
        setPosition((current) => {
          if (current <= 0 || current >= slideCount + 1) {
            return normalizeToCoreSlides(current);
          }
          return current;
        });
      }
    }

    handleVisibilityChange();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [slideCount]);

  useEffect(() => {
    if (isDragging || !isTransitionEnabled || !isPageVisible) return;
    const timer = window.setInterval(() => {
      setPosition((current) => (((current - 1) % slideCount + slideCount) % slideCount) + 2);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isDragging, isPageVisible, isTransitionEnabled, slideCount]);

  function silentJump(nextPosition: number) {
    setIsTransitionEnabled(false);
    setPosition(nextPosition);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsTransitionEnabled(true);
      });
    });
  }

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
    const threshold = Math.max(40, Math.round(width * 0.12));

    if (finalOffset > threshold) {
      setPosition((current) => current - 1);
    } else if (finalOffset < -threshold) {
      setPosition((current) => current + 1);
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
  }

  return (
    <section className="relative overflow-hidden bg-[var(--leaf-deep)]">
      <div
        className="relative aspect-[1440/780] w-full max-h-[620px]"
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
          className={`flex h-full ${isDragging || !isTransitionEnabled ? "" : "transition-transform duration-500 ease-out"}`}
          style={{
            transform: `translate3d(calc(-${position * 100}% + ${dragOffset}px), 0, 0)`
          }}
          onTransitionEnd={(event) => {
            if (event.target !== event.currentTarget || event.propertyName !== "transform") return;

            const current = positionRef.current;
            if (current >= slideCount + 1) {
              silentJump(1);
            } else if (current <= 0) {
              silentJump(slideCount);
            }
          }}
        >
          {loopSlides.map((item, index) => {
            const slideVisual = (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={item.title}
                  className="h-full w-full object-cover object-center select-none"
                  draggable={false}
                  src={item.image}
                  style={{ objectPosition: item.objectPosition }}
                />
                {item.subtitle?.trim() || item.buttonText?.trim() ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-5 pb-6 pt-10 text-white sm:px-8 sm:pb-8">
                    <div className="mx-auto flex w-full max-w-6xl flex-col gap-2">
                      <p className="text-lg font-semibold leading-tight sm:text-2xl">{item.title}</p>
                      {item.subtitle?.trim() ? (
                        <p className="max-w-3xl text-xs leading-5 text-white/90 sm:text-sm">{item.subtitle.trim()}</p>
                      ) : null}
                      {item.buttonText?.trim() ? (
                        <span className="mt-1 inline-flex w-fit items-center rounded-lg border border-white/50 bg-black/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm sm:text-sm">
                          {item.buttonText.trim()}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </>
            );

            return item.href?.trim() ? (
              <Link
                aria-label={item.title}
                className="relative block min-w-full shrink-0"
                href={item.href.trim()}
                key={`${item.title}-${index}`}
                onClick={(event) => {
                  if (dragMovedRef.current) {
                    event.preventDefault();
                  }
                }}
              >
                {slideVisual}
              </Link>
            ) : (
              <div className="relative block min-w-full shrink-0" key={`${item.title}-${index}`}>
                {slideVisual}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
