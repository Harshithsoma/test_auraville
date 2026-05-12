import Image from "next/image";
import Link from "next/link";

export function FeaturedCoreProduct() {
  return (
    <section className="py-10 sm:py-14" aria-label="Featured core product">
      <div className="w-full overflow-hidden">
        <div className="relative">
          <Link className="block focus-visible:outline-none" href="/product/palmyra-sprout-energy-bar">
            <Image
              alt="Auraville featured energy bar"
              className="h-auto w-full object-cover"
              height={780}
              sizes="100vw"
              src="/sections/energy-core.svg"
              width={1440}
            />
          </Link>
          <Link
            className="focus-ring absolute bottom-5 left-1/2 z-10 inline-flex h-11 -translate-x-1/2 items-center justify-center rounded-lg border border-white/75 bg-[var(--leaf)]/95 px-6 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[var(--leaf)] active:scale-95 sm:bottom-8"
            href="/product/palmyra-sprout-energy-bar"
          >
            Shop Now
          </Link>
        </div>
      </div>
    </section>
  );
}
