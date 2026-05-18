"use client";

import Image from "next/image";
import { KeyboardEvent, PointerEvent, useCallback, useMemo, useRef, useState } from "react";

type ProductMediaGalleryProps = {
  name: string;
  image: string;
  gallery: string[];
};

export function ProductMediaGallery({ name, image, gallery }: ProductMediaGalleryProps) {
  const images = useMemo(() => {
    const all = [image, ...gallery].filter(Boolean);
    const unique = Array.from(new Set(all));
    return unique.length > 0 ? unique : [image];
  }, [gallery, image]);

  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const activeImage = images[activeIndex] ?? images[0];
  const hasMultipleImages = images.length > 1;

  const goToPrevious = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  }, [hasMultipleImages, images.length]);

  const goToNext = useCallback(() => {
    if (!hasMultipleImages) {
      return;
    }
    setActiveIndex((current) => (current + 1) % images.length);
  }, [hasMultipleImages, images.length]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!hasMultipleImages) {
        return;
      }

      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      pointerStartRef.current = { x: event.clientX, y: event.clientY };
    },
    [hasMultipleImages]
  );

  const handlePointerEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!hasMultipleImages || !pointerStartRef.current) {
        pointerStartRef.current = null;
        return;
      }

      const deltaX = event.clientX - pointerStartRef.current.x;
      const deltaY = event.clientY - pointerStartRef.current.y;
      pointerStartRef.current = null;

      const SWIPE_THRESHOLD_PX = 42;
      if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        goToNext();
        return;
      }

      goToPrevious();
    },
    [goToNext, goToPrevious, hasMultipleImages]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!hasMultipleImages) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPrevious();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToNext();
      }
    },
    [goToNext, goToPrevious, hasMultipleImages]
  );

  return (
    <section aria-label={`${name} image gallery`}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white soft-shadow">
        <div className="absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/50 to-transparent" />
        <div
          aria-label={hasMultipleImages ? "Swipe left or right to change product image" : undefined}
          className="relative aspect-[4/4.35] touch-pan-y sm:aspect-[4/4] lg:aspect-[5/4]"
          role={hasMultipleImages ? "group" : undefined}
          tabIndex={hasMultipleImages ? 0 : -1}
          onKeyDown={handleKeyDown}
          onPointerCancel={() => {
            pointerStartRef.current = null;
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerEnd}
        >
          <Image
            alt={name}
            className="object-cover"
            fill
            priority
            sizes="(min-width: 1024px) 54vw, 100vw"
            src={activeImage}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3" role="list" aria-label="Product thumbnails">
        {images.map((media, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              aria-label={`Show image ${index + 1}`}
              aria-pressed={isActive}
              className={`focus-ring relative aspect-square overflow-hidden rounded-xl border bg-white transition ${
                isActive
                  ? "border-[var(--leaf)] ring-2 ring-[var(--mint)]"
                  : "border-[var(--line)] hover:border-[var(--leaf)]"
              }`}
              key={`${media}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
            >
              <Image
                alt={`${name} view ${index + 1}`}
                className="object-cover"
                fill
                sizes="(min-width: 1024px) 10vw, 22vw"
                src={media}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
