import { fetchProducts } from "@/lib/catalog-api";
import { products as fallbackProducts } from "@/lib/products";
import { ProductShelfCarousel } from "@/components/product/product-shelf-carousel";

export async function FeaturedProducts() {
  let featuredProducts = fallbackProducts.filter((product) => product.isFeatured);

  try {
    const response = await fetchProducts({
      featured: true,
      sort: "popular",
      limit: 12
    });
    featuredProducts = response.data;
  } catch {
    // Fallback keeps homepage resilient when API is unavailable.
  }

  return (
    <section className="container-page py-8 sm:py-12" aria-labelledby="featured-products">
      <h2 id="featured-products" className="mb-5 text-center text-2xl font-bold sm:mb-7 sm:text-3xl">
        Our Products
      </h2>
      <ProductShelfCarousel products={featuredProducts} />
    </section>
  );
}
