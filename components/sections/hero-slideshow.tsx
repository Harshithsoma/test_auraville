"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { HOMEPAGE_DEFAULT_HERO_SLIDES, type HomepageHeroSlide } from "@/lib/homepage-defaults";

type Slide = {
  title: string;
  imageUrl: string;
  linkUrl?: string;
  objectPosition: string;
};

function isRenderableImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
    return !blockedHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function toSlides(items?: HomepageHeroSlide[]): Slide[] {
  const source = items && items.length > 0 ? items : HOMEPAGE_DEFAULT_HERO_SLIDES;
  const active = [...source]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .filter((item) => item.isActive !== false);

  const mapped = active
    .map((item) => ({
      title: item.title?.trim() || "Auraville hero",
      imageUrl: item.imageUrl?.trim() || "",
      linkUrl: item.linkUrl?.trim() || undefined,
      objectPosition: item.objectPosition?.trim() || "50% 50%"
    }))
    .filter((item) => isRenderableImageUrl(item.imageUrl));

  if (mapped.length > 0) {
    return mapped;
  }

  return HOMEPAGE_DEFAULT_HERO_SLIDES.map((item) => ({
    title: item.title?.trim() || "Auraville hero",
    imageUrl: item.imageUrl,
    linkUrl: item.linkUrl,
    objectPosition: item.objectPosition ?? "50% 50%"
  }));
}

export function HeroSlideshow({ slides: customSlides }: { slides?: HomepageHeroSlide[] }) {
  const slides = useMemo(() => toSlides(customSlides), [customSlides]);
  const slideCount = slides.length;
  const loopSlides = [slides[slideCount - 1], ...slides, slides[0]];

  const [position, setPosition] = useState(1);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) return;

    const updateWidth = () => {
      setViewportWidth(node.clientWidth);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, []);

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
        className="relative aspect-[1440/780] w-full max-h-[620px] overflow-hidden"
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
            transform:
              viewportWidth > 0
                ? `translate3d(${-(position * viewportWidth) + dragOffset}px, 0, 0)`
                : `translate3d(calc(-${position * 100}% + ${dragOffset}px), 0, 0)`
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
          {loopSlides.map((item, index) => (
            <Link
              aria-label={item.title}
              className="relative block h-full w-full min-w-full shrink-0"
              href={item.linkUrl ?? "#"}
              key={`${item.title}-${index}`}
              onClick={(event) => {
                if (dragMovedRef.current || !item.linkUrl) {
                  event.preventDefault();
                }
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={item.title}
                className="h-full w-full object-cover object-center select-none"
                draggable={false}
                src={item.imageUrl}
                style={{ objectPosition: item.objectPosition }}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
