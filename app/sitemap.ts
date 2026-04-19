import type { MetadataRoute } from "next";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    "",
    "/products",
    "/coming-soon",
    "/offers",
    "/about",
    "/search",
    "/cart",
    "/auth",
    "/orders",
    "/account",
    "/privacy-policy",
    "/shipping-policy",
    "/cancellation-policy",
    "/return-refund-policy",
    "/cod-terms",
    "/terms-conditions"
  ].map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7
  }));

  return [
    ...routes,
    ...products.map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9
    }))
  ];
}
