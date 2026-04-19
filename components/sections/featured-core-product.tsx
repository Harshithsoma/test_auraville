import Image from "next/image";
import Link from "next/link";

export function FeaturedCoreProduct() {
  return (
    <section className="py-10 sm:py-14" aria-label="Featured core product">
      <div className="w-full overflow-hidden">
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
      </div>
    </section>
  );
}
