"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

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
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <section aria-label={`${name} image gallery`}>
      <div className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-white soft-shadow">
        <div className="absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white/50 to-transparent" />
        <div className="relative aspect-[4/4.35] sm:aspect-[4/4] lg:aspect-[5/4]">
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
