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

export function BrandStoryImage({
  eyebrow,
  title,
  body,
  imageUrl,
  linkUrl
}: {
  eyebrow?: string;
  title?: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
}) {
  const canUseCmsImage = Boolean(imageUrl?.trim() && isRenderableCmsImageUrl(imageUrl));
  const heroImage = canUseCmsImage ? imageUrl!.trim() : "/sections/energy-core.svg";
  const heroImageBlock = (
    <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm sm:min-h-[430px] lg:min-h-[560px]">
      {canUseCmsImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt={(title?.trim() || "Auraville clean palmyra sprout energy bar").trim()}
          className="h-full w-full object-cover"
          src={heroImage}
        />
      ) : (
        <Image
          alt={(title?.trim() || "Auraville clean palmyra sprout energy bar").trim()}
          className="object-cover"
          fill
          sizes="(min-width: 1024px) 45vw, 100vw"
          src={heroImage}
        />
      )}
    </div>
  );

  return (
    <section className="bg-[#eef7f0] py-16 sm:py-20 lg:py-24" aria-label="Auraville brand story">
      <div className="container-page">
        <div className="grid gap-10 lg:grid-cols-[1.04fr_0.96fr] lg:gap-14">
          <div className="flex min-h-[640px] flex-col justify-center lg:min-h-[980px]">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--leaf)] sm:text-sm">
              {eyebrow?.trim() || "Why Auraville"}
            </p>
            <h2 className="mt-5 text-3xl font-semibold leading-tight text-[var(--leaf-deep)] sm:text-4xl lg:text-[3.25rem] lg:leading-[1.08]">
              {title?.trim() || "A thoughtful Indian food brand built around palmyra sprout."}
            </h2>
            <p className="mt-6 text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
              {body?.trim() ||
                "Most snacks optimize for shelf noise. Auraville is designed for everyday trust. We bring palmyra sprout back in recipes that feel familiar, taste balanced, and support modern routines without compromise."}
            </p>
            <div className="mt-9 grid gap-4 sm:grid-cols-3">
              <p className="border-t border-[var(--line)] pt-3 text-sm font-medium text-[var(--leaf-deep)] sm:text-base">
                Palmyra Sprout First
              </p>
              <p className="border-t border-[var(--line)] pt-3 text-sm font-medium text-[var(--leaf-deep)] sm:text-base">
                Clean Everyday Nutrition
              </p>
              <p className="border-t border-[var(--line)] pt-3 text-sm font-medium text-[var(--leaf-deep)] sm:text-base">
                Trust, Taste, Simplicity
              </p>
            </div>
          </div>

          <div className="grid content-center gap-5 lg:gap-6">
            {linkUrl?.trim() ? (
              <Link className="block transition hover:opacity-95" href={linkUrl.trim()}>
                {heroImageBlock}
              </Link>
            ) : (
              heroImageBlock
            )}
            <div className="grid grid-cols-2 gap-5 lg:gap-6">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
                <Image
                  alt="Auraville palmyra sprout health mix"
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 22vw, 50vw"
                  src="/hero/palmyra-health-mix.svg"
                />
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-sm">
                <Image
                  alt="Auraville palmyra sprout energy bar"
                  className="object-cover"
                  fill
                  sizes="(min-width: 1024px) 22vw, 50vw"
                  src="/hero/palmyra-energy.svg"
                />
              </div>
            </div>
            <p className="text-sm leading-7 text-[var(--ink-soft)] sm:text-base">
              Crafted for households that want ingredient integrity, consistent quality, and a modern format grounded
              in Indian wellness traditions.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
