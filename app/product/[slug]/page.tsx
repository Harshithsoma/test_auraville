import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductJsonLd } from "@/components/product/product-json-ld";
import { ProductMediaGallery } from "@/components/product/product-media-gallery";
import { ProductDetailAsideClient } from "@/components/product/product-detail-aside-client";
import { ProductCard } from "@/components/product/product-card";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog-api";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";
import { ApiError } from "@/services/api";
import { absoluteUrl } from "@/lib/site";
import type { Product } from "@/types/product";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";
const isProduction = process.env.NODE_ENV === "production";

async function getProduct(slug: string): Promise<Product | null> {
  try {
    const response = await fetchProductBySlug(slug);
    return response.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    if (!isProduction) {
      return getProductBySlug(slug) ?? null;
    }
    return null;
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
    // Fall through only in non-production development mode.
  }

  if (!isProduction) {
    return getRelatedProducts(product);
  }

  return [];
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

  return (
    <div className="container-page py-8 sm:py-10 md:py-14">
      <ProductJsonLd product={product} />
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(390px,0.78fr)] lg:gap-10">
        <section aria-labelledby="product-title" className="space-y-4">
          <ProductMediaGallery name={product.name} image={product.image} gallery={product.gallery} />
        </section>
        <ProductDetailAsideClient product={product} />
      </div>

      {relatedProducts.length > 0 ? (
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
      ) : null}
    </div>
  );
}
