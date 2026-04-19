import Link from "next/link";
import { ReviewMailer } from "@/components/layout/review-mailer";

const links = [
  { label: "Shop", href: "/products" },
  { label: "Best Selling", href: "/product/palmyra-sprout-energy-bar" },
  { label: "Coming Soon", href: "/coming-soon" },
  { label: "Orders", href: "/orders" },
  { label: "About Us", href: "/about" },
  { label: "Login", href: "/auth" },
  { label: "Cart", href: "/cart" }
];

const policyLinks = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Shipping Policy", href: "/shipping-policy" },
  { label: "Cancellation Policy", href: "/cancellation-policy" },
  { label: "Return & Refund Policy", href: "/return-refund-policy" },
  { label: "COD Terms & Conditions", href: "/cod-terms" },
  { label: "Terms & Conditions", href: "/terms-conditions" }
];

const socialLinks = [
  {
    label: "Instagram",
    href: "https://instagram.com/auraville.in",
    icon: (
      <path d="M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm4 5.5A3.5 3.5 0 1 0 15.5 12 3.5 3.5 0 0 0 12 8.5Zm5.25-.75a1 1 0 1 0-1-1 1 1 0 0 0 1 1Z" />
    )
  },
  {
    label: "Facebook",
    href: "https://facebook.com/auraville.in",
    icon: <path d="M14 8h2V4h-2a4 4 0 0 0-4 4v2H8v4h2v6h4v-6h2.5l.5-4H14V8Z" />
  },
  {
    label: "Twitter",
    href: "https://x.com/auraville_in",
    icon: <path d="M21 6.5a7.8 7.8 0 0 1-2.2.6A3.8 3.8 0 0 0 20.5 5a7.7 7.7 0 0 1-2.4.9A3.8 3.8 0 0 0 11.6 9a10.8 10.8 0 0 1-7.9-4 3.8 3.8 0 0 0 1.2 5.1A3.7 3.7 0 0 1 3 9.6v.1A3.8 3.8 0 0 0 6 13.4a3.9 3.9 0 0 1-1 .1c-.2 0-.5 0-.7-.1A3.8 3.8 0 0 0 7.8 16a7.7 7.7 0 0 1-4.8 1.7H2A10.8 10.8 0 0 0 7.8 19c7 0 10.8-5.8 10.8-10.8v-.5A7.6 7.6 0 0 0 21 6.5Z" />
  }
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-white">
      <div className="container-page hidden gap-10 py-12 md:grid md:grid-cols-[1.2fr_0.8fr_0.85fr_0.95fr_1fr]">
        <div>
          <Link className="brand-mark focus-ring inline-block rounded-lg text-2xl font-bold" href="/">
            Auraville
          </Link>
          <p className="mt-4 max-w-md text-sm leading-6 text-[var(--muted)]">
            Palmyra sprout snacks bringing a forgotten ingredient back to everyday shelves.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Explore</h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            {links.map((link) => (
              <li key={link.href}>
                <Link className="focus-ring rounded-lg transition hover:text-[var(--foreground)]" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Contact</h2>
          <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            <p>
              Email{" "}
              <a className="focus-ring rounded-lg font-semibold text-[var(--foreground)]" href="mailto:admin@auraville.in">
                admin@auraville.in
              </a>
            </p>
            <p>
              Phone{" "}
              <a className="focus-ring rounded-lg font-semibold text-[var(--foreground)]" href="tel:+919087268344">
                9087268344
              </a>
            </p>
          </div>
          <h2 className="mt-8 text-sm font-semibold">Social</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {socialLinks.map((link) => (
              <a
                aria-label={link.label}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] transition hover:border-[var(--leaf)]"
                href={link.href}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                    {link.icon}
                  </g>
                </svg>
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Policies</h2>
          <ul className="mt-4 space-y-3 text-sm text-[var(--muted)]">
            {policyLinks.map((link) => (
              <li key={link.href}>
                <Link className="focus-ring rounded-lg transition hover:text-[var(--foreground)]" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Reviews</h2>
          <div className="mt-4">
            <ReviewMailer />
          </div>
        </div>
      </div>

      <div className="container-page py-8 md:hidden">
        <Link className="brand-mark focus-ring inline-block rounded-lg text-2xl font-bold" href="/">
          Auraville
        </Link>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Palmyra sprout snacks bringing a forgotten ingredient back to everyday shelves.
        </p>

        <div className="mt-6 space-y-3">
          <details className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4" open>
            <summary className="cursor-pointer list-none text-sm font-semibold">Explore</summary>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              {links.map((link) => (
                <li key={link.href}>
                  <Link className="focus-ring rounded-lg transition hover:text-[var(--foreground)]" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          <details className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold">Contact & Social</summary>
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <p>
                Email{" "}
                <a className="focus-ring rounded-lg font-semibold text-[var(--foreground)]" href="mailto:admin@auraville.in">
                  admin@auraville.in
                </a>
              </p>
              <p>
                Phone{" "}
                <a className="focus-ring rounded-lg font-semibold text-[var(--foreground)]" href="tel:+919087268344">
                  9087268344
                </a>
              </p>
            </div>
            <div className="mt-4 flex gap-3">
              {socialLinks.map((link) => (
                <a
                  aria-label={link.label}
                  className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--line)] bg-white transition hover:border-[var(--leaf)]"
                  href={link.href}
                  key={link.label}
                  rel="noreferrer"
                  target="_blank"
                >
                  <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8">
                      {link.icon}
                    </g>
                  </svg>
                </a>
              ))}
            </div>
          </details>

          <details className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold">Policies</summary>
            <ul className="mt-4 grid gap-3 text-sm text-[var(--muted)]">
              {policyLinks.map((link) => (
                <li key={link.href}>
                  <Link className="focus-ring rounded-lg transition hover:text-[var(--foreground)]" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          <details className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4">
            <summary className="cursor-pointer list-none text-sm font-semibold">Reviews</summary>
            <div className="mt-4">
              <ReviewMailer />
            </div>
          </details>
        </div>
      </div>
    </footer>
  );
}
