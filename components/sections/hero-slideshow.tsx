"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

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

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative overflow-hidden bg-[var(--leaf-deep)]">
      {slides.map((item, index) => (
        <a
          aria-label={item.title}
          className={`block transition duration-700 ${index === active ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"}`}
          href={item.href}
          key={item.title}
        >
          <Image
            alt={item.title}
            className="h-auto w-full object-cover"
            height={780}
            priority={index === 0}
            sizes="100vw"
            src={item.image}
            width={1440}
          />
        </a>
      ))}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" aria-label="Hero slides">
        {slides.map((item, index) => (
          <button
            aria-label={`Show ${item.title}`}
            className={`focus-ring h-2.5 rounded-full transition active:scale-90 ${
              index === active ? "w-9 bg-white" : "w-2.5 bg-white/55"
            }`}
            key={item.title}
            type="button"
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  );
}
