import type { MetadataRoute } from "next";
import { fetchProducts } from "@/lib/catalog-api";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const isProduction = process.env.NODE_ENV === "production";
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

  let productSlugs: string[] = [];
  try {
    const response = await fetchProducts({
      page: 1,
      limit: 200,
      sort: "popular"
    });
    productSlugs = response.data.map((product) => product.slug);
  } catch {
    if (!isProduction) {
      productSlugs = products.map((product) => product.slug);
    }
  }

  return [
    ...routes,
    ...productSlugs.map((slug) => ({
      url: absoluteUrl(`/product/${slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9
    }))
  ];
}
