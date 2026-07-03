const canonicalSiteUrl = "https://www.auraville.in";
const defaultShareImagePath = "/sections/energy-core.svg";

export const siteConfig = {
  name: "Auraville",
  url: canonicalSiteUrl,
  description:
    "Buy Palmyra Sprouts snacks from Auraville. Discover healthy Indian snacks made with dates, palm jaggery, millets, and fiber-rich ingredients.",
  shareImagePath: defaultShareImagePath,
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


export function defaultShareImageUrl() {
  return absoluteUrl(siteConfig.shareImagePath);
}
