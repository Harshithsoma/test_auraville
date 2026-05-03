import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductJsonLd } from "@/components/product/product-json-ld";
import { ProductMediaGallery } from "@/components/product/product-media-gallery";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { ProductCard } from "@/components/product/product-card";
import { PriceWithCompare } from "@/components/ui/price";
import { RatingStars } from "@/components/ui/rating-stars";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog-api";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";
import type { Product } from "@/types/product";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetchProductBySlug(slug);
    return response.data;
  } catch {
    return getProductBySlug(slug) ?? null;
  }
}

async function getRelated(product: Product): Promise<Product[]> {
  try {
    const response = await fetchProducts({
      category: product.category,
      sort: "popular",
      limit: 8
    });
    const related = response.data.filter((candidate) => candidate.id !== product.id).slice(0, 4);
    if (related.length > 0) {
      return related;
    }
  } catch {
    // Fall through to bundled fallback.
  }

  return getRelatedProducts(product);
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return {
      title: "Product not found"
    };
  }

  const url = absoluteUrl(`/product/${product.slug}`);

  return {
    title: product.name,
    description: product.description,
    alternates: {
      canonical: url
    },
    openGraph: {
      title: `${product.name} | Auraville`,
      description: product.description,
      url,
      images: [
        {
          url: product.image,
          width: 1200,
          height: 900,
          alt: product.name
        }
      ],
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | Auraville`,
      description: product.description,
      images: [product.image]
    }
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelated(product);
  const isAvailable = product.availability === "available";

  return (
    <div className="container-page py-8 sm:py-10 md:py-14">
      <ProductJsonLd product={product} />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.78fr)] lg:gap-10">
        <section aria-labelledby="product-title" className="space-y-4">
          <ProductMediaGallery name={product.name} image={product.image} gallery={product.gallery} />
        </section>

        <section className="space-y-5 lg:sticky lg:top-24 lg:h-fit" aria-labelledby="product-title">
          <div className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_22px_65px_rgb(23_33_28_/_8%)] sm:p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--coral)]">{product.category}</p>
            <h1 id="product-title" className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
              {product.name}
            </h1>
            <p className="mt-3 text-base text-[var(--ink-soft)] sm:text-lg">{product.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="text-xl sm:text-2xl">
                {isAvailable ? (
                  <PriceWithCompare
                    compareAtPrice={product.compareAtPrice}
                    currency={product.currency}
                    value={product.price}
                  />
                ) : (
                  <p className="font-semibold">Coming soon</p>
                )}
              </div>
              <span className="rounded-full bg-[var(--mint)] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--leaf-deep)]">
                {isAvailable ? "Available now" : product.releaseNote ?? "Coming soon"}
              </span>
              <RatingStars rating={product.rating} reviewCount={product.reviewCount} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--line)] bg-[var(--mint)]/35 p-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Ingredients</h2>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[var(--line)] bg-[var(--mint)]/35 p-3.5">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">Benefits</h2>
                <ul className="mt-2.5 list-disc space-y-1 pl-4 text-sm text-[var(--ink-soft)]">
                  {product.benefits.map((benefit) => (
                    <li key={benefit}>{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-[var(--muted)] sm:text-base">{product.longDescription}</p>

            {!isAvailable ? (
              <p className="mt-4 text-sm text-[var(--muted)]">
                Recipe in development. Final price and pack sizes may change before launch.
              </p>
            ) : null}
          </div>

          <div>
            <ProductPurchasePanel product={product} />
          </div>
        </section>
      </div>

      <section className="mt-16 sm:mt-20" aria-labelledby="related-products">
        <h2 id="related-products" className="text-2xl font-semibold sm:text-3xl">
          More from the palmyra shelf
        </h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {relatedProducts.map((relatedProduct) => (
            <ProductCard key={relatedProduct.id} product={relatedProduct} />
          ))}
        </div>
      </section>
    </div>
  );
}
