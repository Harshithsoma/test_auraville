import type { Product } from "@/types/product";
import { absoluteUrl } from "@/lib/site";

export function ProductJsonLd({ product }: { product: Product }) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.gallery,
    description: product.description,
    sku: product.id,
    brand: {
      "@type": "Brand",
      name: "Auraville"
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/product/${product.slug}`),
      priceCurrency: product.currency,
      price: product.price,
      availability:
        product.availability === "available"
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder"
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount
          }
        }
      : {})
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}
