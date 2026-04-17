import type { Metadata } from "next";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { Hero } from "@/components/sections/hero";
import { ScrollingBanner } from "@/components/sections/scrolling-banner";
import { ShopCta } from "@/components/sections/shop-cta";
import { TrustSection } from "@/components/sections/trust";
import { UspFeatures } from "@/components/sections/usp-features";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: absoluteUrl("/")
  },
  title: "Palmyra Sprout Snacks for Modern Energy",
  description: siteConfig.description
};

export const dynamic = "force-static";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ScrollingBanner />
      <UspFeatures />
      <FeaturedProducts />
      <TrustSection />
      <ShopCta />
    </>
  );
}
