import type { Product, ProductVariant } from "@/types/product";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { isComingSoonProduct } from "@/lib/product-lifecycle";

const seller = {
  "@type": "Organization",
  name: siteConfig.name,
  url: absoluteUrl("/")
};

function getAvailability(product: Product, variant?: ProductVariant) {
  if (isComingSoonProduct(product)) {
    return "https://schema.org/PreOrder";
  }

  if (typeof variant?.stock === "number" && variant.stock <= 0) {
    return "https://schema.org/OutOfStock";
  }

  return "https://schema.org/InStock";
}

function buildOffer(product: Product, variant?: ProductVariant) {
  const productUrl = absoluteUrl(`/product/${product.slug}`);
  const price = variant?.price ?? product.price;

  return {
    "@type": "Offer",
    url: productUrl,
    priceCurrency: product.currency,
    price,
    availability: getAvailability(product, variant),
    itemCondition: "https://schema.org/NewCondition",
    seller,
    ...(variant
      ? {
          name: `${product.name} - ${variant.label}`,
          sku: `${product.id}-${variant.id}`
        }
      : {})
  };
}

export function ProductJsonLd({ product }: { product: Product }) {
  const productUrl = absoluteUrl(`/product/${product.slug}`);
  const images = Array.from(new Set([product.image, ...product.gallery].filter(Boolean)));
  const offers = product.variants.length > 0 ? product.variants.map((variant) => buildOffer(product, variant)) : buildOffer(product);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    image: images,
    description: product.description,
    sku: product.id,
    category: product.category,
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: siteConfig.name
    },
    offers,
    ...(product.reviewCount > 0 && product.rating > 0
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
