import { HeroSlideshow } from "@/components/sections/hero-slideshow";
import Link from "next/link";

function isRenderableCmsImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
    if (blockedHosts.has(parsed.hostname.toLowerCase())) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function Hero({
  imageUrl,
  linkUrl,
  title,
  slides
}: {
  imageUrl?: string;
  linkUrl?: string;
  title?: string;
  slides?: Array<{
    imageUrl: string;
    title?: string;
    subtitle?: string;
    linkUrl?: string;
    buttonText?: string;
    sortOrder?: number;
  }>;
}) {
  const validSlides =
    slides
      ?.filter((slide) => slide.imageUrl?.trim() && isRenderableCmsImageUrl(slide.imageUrl))
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((slide) => ({
        title: slide.title?.trim() || "Auraville hero",
        subtitle: slide.subtitle?.trim() || undefined,
        buttonText: slide.buttonText?.trim() || undefined,
        image: slide.imageUrl.trim(),
        href: slide.linkUrl?.trim() || undefined
      })) ?? [];

  if (validSlides.length > 0) {
    return <HeroSlideshow slides={validSlides} />;
  }

  if (imageUrl?.trim() && isRenderableCmsImageUrl(imageUrl)) {
    const heroImage = (
      <div className="relative aspect-[1440/780] w-full max-h-[620px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={(title?.trim() || "Auraville hero").trim()}
          className="h-full w-full object-cover object-center"
          src={imageUrl.trim()}
        />
      </div>
    );

    return (
      <section className="relative overflow-hidden bg-[var(--leaf-deep)]">
        {linkUrl?.trim() ? (
          <Link aria-label={title?.trim() || "Shop featured hero product"} className="block" href={linkUrl.trim()}>
            {heroImage}
          </Link>
        ) : (
          heroImage
        )}
      </section>
    );
  }

  return <HeroSlideshow />;
}
