import type { Metadata } from "next";
import { AnnouncementBar } from "@/components/sections/announcement-bar";
import { BestSellersSection } from "@/components/sections/best-sellers";
import { BrandStoryImage } from "@/components/sections/brand-story-image";
import { DoYouKnowSection } from "@/components/sections/do-you-know";
import { FaqSection } from "@/components/sections/faq-section";
import { FeaturedCoreProduct } from "@/components/sections/featured-core-product";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { Hero } from "@/components/sections/hero";
import { ReviewsSlider } from "@/components/sections/reviews-slider";
import { ScrollingBanner } from "@/components/sections/scrolling-banner";
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
      <AnnouncementBar />
      <BestSellersSection />
      <FeaturedCoreProduct />
      <ReviewsSlider />
      <BrandStoryImage />
      <DoYouKnowSection />
      <FaqSection />
    </>
  );
}
