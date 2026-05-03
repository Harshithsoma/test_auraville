import { BestSellersCarousel } from "@/components/product/best-sellers-carousel";
import { fetchProducts } from "@/lib/catalog-api";
import { products as fallbackProducts } from "@/lib/products";

export async function BestSellersSection() {
  let bestSellers = [...fallbackProducts].sort((a, b) => b.popularity - a.popularity).slice(0, 6);

  try {
    const response = await fetchProducts({
      bestSeller: true,
      sort: "popular",
      limit: 12
    });
    bestSellers = response.data;
  } catch {
    // Fallback keeps homepage resilient when API is unavailable.
  }

  return (
    <section className="container-page py-8 sm:py-12" aria-labelledby="best-sellers-title">
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
        <h2 id="best-sellers-title" className="text-2xl font-bold sm:text-3xl">
          Best Sellers
        </h2>
      </div>
      <BestSellersCarousel products={bestSellers} />
    </section>
  );
}
