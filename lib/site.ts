export const siteConfig = {
  name: "Auraville",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://auraville.com",
  description:
    "Palmyra sprout snacks and heritage foods made for modern everyday energy.",
  nav: [
    { label: "About Us", href: "/about" },
    { label: "Coming Soon", href: "/coming-soon" }
  ]
};

export function absoluteUrl(path = "") {
  const base = siteConfig.url.replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}
