"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const slides = [
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

export function HeroSlideshow() {
  const slideCount = slides.length;
  const loopSlides = [slides[slideCount - 1], ...slides, slides[0]];

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
          {loopSlides.map((item, index) => (
            <Link
              aria-label={item.title}
              className="relative block min-w-full shrink-0"
              href={item.href}
              key={`${item.title}-${index}`}
              onClick={(event) => {
                if (dragMovedRef.current) {
                  event.preventDefault();
                }
              }}
            >
              <Image
                alt={item.title}
                className="object-cover object-center select-none"
                draggable={false}
                fill
                priority={index <= 2}
                sizes="100vw"
                src={item.image}
                style={{ objectPosition: item.objectPosition }}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
