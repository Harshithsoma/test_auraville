import Image from "next/image";
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

export function FeaturedCoreProduct({
  title,
  subtitle,
  description,
  imageUrl,
  ctaText,
  ctaLink,
  eyebrow,
  secondaryText
}: {
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  eyebrow?: string;
  secondaryText?: string;
}) {
  const canUseCmsImage = Boolean(imageUrl?.trim() && isRenderableCmsImageUrl(imageUrl));
  const image = canUseCmsImage ? imageUrl!.trim() : "/sections/energy-core.svg";
  const link = ctaLink?.trim() || "/product/palmyra-sprout-energy-bar";
  const buttonText = ctaText?.trim() || "Shop Now";
  const heading = title?.trim() || "Palmyra Sprout Energy Bar";
  const subheading = subtitle?.trim() || "Our flagship clean energy snack";
  const body =
    description?.trim() ||
    "Made for modern daily routines with palmyra sprout, balanced sweetness, and ingredient-first nutrition.";

  return (
    <section className="py-10 sm:py-14" aria-label="Featured core product">
      <div className="w-full overflow-hidden">
        <div className="relative">
          <Link className="block focus-visible:outline-none" href={link}>
            {canUseCmsImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={heading} className="h-auto w-full object-cover" src={image} />
            ) : (
              <Image
                alt={heading}
                className="h-auto w-full object-cover"
                height={780}
                sizes="100vw"
                src={image}
                width={1440}
              />
            )}
          </Link>
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/55 via-black/25 to-transparent px-4 py-5 text-white sm:px-8 sm:py-7">
            {eyebrow?.trim() ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85 sm:text-xs">
                {eyebrow.trim()}
              </p>
            ) : null}
            <h2 className="mt-1 max-w-3xl text-xl font-semibold leading-tight sm:text-3xl">{heading}</h2>
            <p className="mt-2 max-w-3xl text-xs text-white/90 sm:text-sm">{subheading}</p>
            <p className="mt-2 hidden max-w-3xl text-xs text-white/80 sm:block sm:text-sm">{body}</p>
            {secondaryText?.trim() ? (
              <p className="mt-2 hidden max-w-3xl text-xs text-white/80 sm:block sm:text-sm">
                {secondaryText.trim()}
              </p>
            ) : null}
          </div>
          <Link
            className="focus-ring absolute bottom-5 left-1/2 z-10 inline-flex h-11 -translate-x-1/2 items-center justify-center rounded-lg border border-white/75 bg-[var(--leaf)]/95 px-6 text-sm font-semibold text-white shadow-lg backdrop-blur-sm transition hover:bg-[var(--leaf)] active:scale-95 sm:bottom-8"
            href={link}
          >
            {buttonText}
          </Link>
        </div>
      </div>
    </section>
  );
}
