import Image from "next/image";

export function BrandStoryImage() {
  return (
    <section className="py-10 sm:py-14" aria-label="Auraville brand story">
      <div className="w-full overflow-hidden">
        <Image
          alt="Auraville brand story"
          className="h-auto w-full object-cover"
          height={780}
          sizes="100vw"
          src="/sections/brand-story.svg"
          width={1440}
        />
      </div>
    </section>
  );
}
