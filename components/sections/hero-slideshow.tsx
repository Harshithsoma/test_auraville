"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const slides = [
  {
    title: "Bringing palmyra sprout back to the snack shelf.",
    image: "/hero/palmyra-energy.svg",
    href: "/product/palmyra-sprout-energy-bar"
  },
  {
    title: "Palmyra sprout cookies coming soon.",
    image: "/hero/palmyra-cookies.svg",
    href: "/product/palmyra-sprout-cookies"
  },
  {
    title: "Palmyra health mix coming soon.",
    image: "/hero/palmyra-health-mix.svg",
    href: "/product/palmyra-sprout-health-mix"
  },
  {
    title: "Palmyra sprout laddu coming soon.",
    image: "/hero/palmyra-laddu.svg",
    href: "/product/palmyra-sprout-laddu"
  }
];

export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const viewportRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    if (isDragging) return;
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [isDragging]);

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
      setActive((current) => (current - 1 + slides.length) % slides.length);
    } else if (finalOffset < -threshold) {
      setActive((current) => (current + 1) % slides.length);
    }

    setDragOffset(0);
    setIsDragging(false);
    pointerIdRef.current = null;
  }

  return (
    <section className="relative overflow-hidden bg-[var(--leaf-deep)]">
      <div
        className="relative aspect-[16/10] w-full max-h-[480px] sm:aspect-[16/8.2] sm:max-h-[560px] lg:max-h-[620px]"
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
          className={`flex h-full ${isDragging ? "" : "transition-transform duration-500 ease-out"}`}
          style={{
            transform: `translate3d(calc(-${active * 100}% + ${dragOffset}px), 0, 0)`
          }}
        >
          {slides.map((item) => (
            <Link
              aria-label={item.title}
              className="relative block min-w-full shrink-0"
              href={item.href}
              key={item.title}
              onClick={(event) => {
                if (dragMovedRef.current) {
                  event.preventDefault();
                }
              }}
            >
              <Image
                alt={item.title}
                className="object-contain select-none"
                draggable={false}
                fill
                priority={item.image === slides[0].image}
                sizes="100vw"
                src={item.image}
              />
            </Link>
          ))}
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Hero slides">
        {slides.map((item, index) => (
          <button
            aria-label={`Show ${item.title}`}
            className={`focus-ring h-2.5 rounded-full transition active:scale-90 ${
              index === active ? "w-9 bg-white" : "w-2.5 bg-white/55"
            }`}
            key={item.title}
            type="button"
            onClick={() => {
              setActive(index);
              setDragOffset(0);
            }}
          />
        ))}
      </div>
    </section>
  );
}
