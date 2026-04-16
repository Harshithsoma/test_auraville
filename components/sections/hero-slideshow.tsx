"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { products } from "@/lib/products";
import { Button } from "@/components/ui/button";

const slides = [
  {
    eyebrow: "Now live: Palmyra Sprout Energy Bar",
    title: "Bringing palmyra sprout back to the snack shelf.",
    body: "Auraville starts with one forgotten ingredient and turns it into familiar foods: energy bars now, cookies, health mix, and laddu coming next.",
    image: "https://images.unsplash.com/photo-1632370161597-9c8429934d1b?auto=format&fit=crop&w=1800&q=86",
    cta: "Shop energy bar",
    href: "/product/palmyra-sprout-energy-bar"
  },
  ...products.slice(1, 5).map((product) => ({
    eyebrow: product.releaseNote ?? "Coming soon",
    title: product.name,
    body: product.longDescription,
    image: product.image,
    cta: "Preview product",
    href: `/product/${product.slug}`
  }))
];

export function HeroSlideshow() {
  const [active, setActive] = useState(0);
  const slide = slides[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="relative min-h-[calc(100svh-170px)] overflow-hidden bg-[var(--leaf-deep)] text-white">
      {slides.map((item, index) => (
        <Image
          alt={item.title}
          className={`object-cover transition duration-700 ${index === active ? "opacity-45" : "opacity-0"}`}
          fill
          key={item.title}
          priority={index === 0}
          sizes="100vw"
          src={item.image}
        />
      ))}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(21,35,27,0.94)_0%,rgba(21,35,27,0.78)_46%,rgba(21,35,27,0.2)_100%)]" />
      <div className="container-page relative flex min-h-[calc(100svh-170px)] items-center py-12 md:py-16">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase text-[#ffd9de]">{slide.eyebrow}</p>
          <h1 className="mt-5 text-5xl font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
            {slide.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#e7f7ea]">{slide.body}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button className="bg-white text-[var(--leaf-deep)] hover:bg-[var(--mint)]" href={slide.href}>
              {slide.cta}
            </Button>
            <Button className="border-white bg-transparent text-white hover:border-white hover:bg-white hover:text-[var(--leaf-deep)]" href="/products" variant="secondary">
              View full range
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap gap-2" aria-label="Hero slides">
            {slides.map((item, index) => (
              <button
                aria-label={`Show ${item.title}`}
                className={`focus-ring h-2.5 rounded-full transition ${
                  index === active ? "w-10 bg-white" : "w-2.5 bg-white/50 hover:bg-white"
                }`}
                key={item.title}
                type="button"
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
