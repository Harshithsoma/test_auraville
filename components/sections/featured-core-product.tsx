import Image from "next/image";
import Link from "next/link";
import { HOMEPAGE_DEFAULT_FEATURED_CORE } from "@/lib/homepage-defaults";

function isRenderableCmsImageUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
    return !blockedHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function FeaturedCoreProduct({
  eyebrow,
  title,
  subtitle,
  body,
  imageUrl,
  linkUrl,
  buttonText
}: {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
}) {
  const heroImage = imageUrl?.trim();
  const imageSrc = heroImage && isRenderableCmsImageUrl(heroImage) ? heroImage : HOMEPAGE_DEFAULT_FEATURED_CORE.imageUrl;
  const ctaLink = linkUrl?.trim() || HOMEPAGE_DEFAULT_FEATURED_CORE.linkUrl;
  const ctaText = buttonText?.trim() || HOMEPAGE_DEFAULT_FEATURED_CORE.buttonText || "Shop Now";
  const hasTextBlock = Boolean(eyebrow?.trim() || title?.trim() || subtitle?.trim() || body?.trim());

  return (
    <section className="py-10 sm:py-14" aria-label="Featured core product">
      <div className="w-full overflow-hidden">
        <div className="relative">
          <Link className="block focus-visible:outline-none" href={ctaLink}>
            {imageSrc.startsWith("/") ? (
              <Image
                alt={title?.trim() || "Auraville featured product"}
                className="h-auto w-full object-cover"
                height={780}
                sizes="100vw"
                src={imageSrc}
                width={1440}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={title?.trim() || "Auraville featured product"}
                className="h-auto w-full object-cover"
                src={imageSrc}
              />
            )}
          </Link>

          {hasTextBlock ? (
            <div className="absolute left-4 top-4 z-10 max-w-[84%] rounded-lg border border-white/30 bg-black/45 px-4 py-3 text-white backdrop-blur-sm sm:left-8 sm:top-8 sm:max-w-md">
              {eyebrow?.trim() ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">{eyebrow.trim()}</p>
              ) : null}
              {title?.trim() ? <h2 className="mt-1 text-xl font-semibold leading-tight sm:text-2xl">{title.trim()}</h2> : null}
              {subtitle?.trim() ? <p className="mt-1 text-sm text-white/90">{subtitle.trim()}</p> : null}
              {body?.trim() ? <p className="mt-2 text-xs leading-5 text-white/85 sm:text-sm">{body.trim()}</p> : null}
            </div>
          ) : null}

          <Link
            className="focus-ring absolute bottom-5 left-1/2 z-10 inline-flex h-11 -translate-x-1/2 items-center justify-center rounded-lg border border-white/75 bg-[var(--leaf)]/95 px-6 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[var(--leaf)] active:scale-95 sm:bottom-8"
            href={ctaLink}
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </section>
  );
}
