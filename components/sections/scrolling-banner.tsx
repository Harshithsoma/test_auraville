import { HOMEPAGE_DEFAULT_SCROLLING_BANNER_ITEMS } from "@/lib/homepage-defaults";

const FALLBACK_MESSAGES = HOMEPAGE_DEFAULT_SCROLLING_BANNER_ITEMS.map((item) => item.text);

export function ScrollingBanner({ items }: { items?: string[] }) {
  const messages = items && items.length > 0 ? items : FALLBACK_MESSAGES;

  return (
    <section className="overflow-hidden border-y border-[var(--line)] bg-white py-3" aria-label="Auraville highlights">
      <div className="marquee-track">
        {[0, 1, 2, 3].map((copy) => (
          <div className="marquee-content" key={copy} aria-hidden={copy > 0}>
            {messages.map((message) => (
              <span className="inline-flex shrink-0 items-center gap-3 px-4" key={`${copy}-${message}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--coral)]" />
                <span className="whitespace-nowrap text-xs font-bold uppercase text-[var(--leaf-deep)] sm:text-sm">
                  {message}
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
