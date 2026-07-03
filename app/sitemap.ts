import type { MetadataRoute } from "next";
import { fetchProducts } from "@/lib/catalog-api";
import { products } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";

const contentLastModified = new Date("2026-07-03T00:00:00.000Z");

type SitemapProduct = {
  slug: string;
  updatedAt?: string;
  createdAt?: string;
};

function toLastModifiedDate(value: string | undefined): Date {
  if (!value) return contentLastModified;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? contentLastModified : parsed;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const isProduction = process.env.NODE_ENV === "production";
  const routes = [
    "",
    "/products",
    "/best-selling",
    "/coming-soon",
    "/offers",
    "/about",
    "/privacy-policy",
    "/shipping-policy",
    "/cancellation-policy",
    "/return-refund-policy",
    "/cod-terms",
    "/terms-conditions"
  ].map((route) => ({
    url: absoluteUrl(route),
    lastModified: contentLastModified,
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7
  }));

  let sitemapProducts: SitemapProduct[] = [];
  try {
    const response = await fetchProducts({
      page: 1,
      limit: 200,
      sort: "popular"
    });
    sitemapProducts = response.data.map((product) => product as SitemapProduct);
  } catch {
    if (!isProduction) {
      sitemapProducts = products.map((product) => ({ slug: product.slug }));
    }
  }

  return [
    ...routes,
    ...sitemapProducts.map((product) => ({
      url: absoluteUrl(`/product/${product.slug}`),
      lastModified: toLastModifiedDate(product.updatedAt ?? product.createdAt),
      changeFrequency: "weekly" as const,
      priority: 0.9
    }))
  ];
}
