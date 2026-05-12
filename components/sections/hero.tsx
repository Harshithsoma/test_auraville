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
  title
}: {
  imageUrl?: string;
  linkUrl?: string;
  title?: string;
}) {
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
