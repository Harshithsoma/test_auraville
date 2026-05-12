import { BestSellersCarousel } from "@/components/product/best-sellers-carousel";
import { fetchProducts } from "@/lib/catalog-api";

export async function BestSellersSection() {
  let bestSellers: Awaited<ReturnType<typeof fetchProducts>>["data"] = [];

  try {
    const response = await fetchProducts({
      bestSeller: true,
      sort: "popular",
      limit: 12
    });
    bestSellers = response.data;
  } catch {
    // Keep section hidden when API is unavailable to avoid stale bestseller flags.
  }

  if (bestSellers.length === 0) {
    return null;
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
