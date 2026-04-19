import { products } from "@/lib/products";
import { ProductShelfCarousel } from "@/components/product/product-shelf-carousel";

export function FeaturedProducts() {
  return (
    <section className="container-page py-8 sm:py-12" aria-labelledby="featured-products">
      <h2 id="featured-products" className="mb-5 text-center text-2xl font-bold sm:mb-7 sm:text-3xl">
        Our Products
      </h2>
      <ProductShelfCarousel products={products} />
    </section>
  );
}
