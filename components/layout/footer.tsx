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

const socialLinks = [
  { label: "Instagram", href: "https://instagram.com/auraville.in" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/auraville" }
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-[var(--line)] bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1.25fr_0.8fr_0.95fr_1.1fr]">
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
                className="focus-ring rounded-lg border border-[var(--line)] px-3 py-2 text-sm font-semibold transition hover:border-[var(--leaf)]"
                href={link.href}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Reviews</h2>
          <div className="mt-4">
            <ReviewMailer />
          </div>
        </div>
      </div>
    </footer>
  );
}
