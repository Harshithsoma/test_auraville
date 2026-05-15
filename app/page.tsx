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
import {
  fetchHomepageSections,
  getHomepageSectionDisplayMode,
  metadataObject,
  sectionMap
} from "@/lib/homepage-cms";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: absoluteUrl("/")
  },
  title: "Palmyra Sprout Snacks for Modern Energy",
  description: siteConfig.description
};

export const dynamic = "force-dynamic";

type FaqMetadataItem = {
  q?: unknown;
  a?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asFaqItems(value: unknown): Array<{ q: string; a: string }> {
  if (!Array.isArray(value)) return [];
  return (value as FaqMetadataItem[])
    .map((item) => ({
      q: typeof item.q === "string" ? item.q.trim() : "",
      a: typeof item.a === "string" ? item.a.trim() : ""
    }))
    .filter((item) => item.q.length > 0 && item.a.length > 0);
}

export default async function HomePage() {
  const sections = await fetchHomepageSections();
  const byKey = sectionMap(sections);

  const hero = byKey.get("hero");
  const announcement = byKey.get("announcement");
  const doYouKnow = byKey.get("do_you_know");
  const whyAuraville = byKey.get("why_auraville");
  const uspFeatures = byKey.get("usp_features");
  const faq = byKey.get("faq");
  const reviews = byKey.get("reviews");

  const announcementMetadata = metadataObject(announcement);
  const announcementItems = [
    ...asStringArray(announcementMetadata.items),
    ...(announcement?.body
      ? announcement.body
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [])
  ];

  const uspMetadata = metadataObject(uspFeatures);
  const faqMetadata = metadataObject(faq);
  const heroMode = getHomepageSectionDisplayMode(hero);
  const uspMode = getHomepageSectionDisplayMode(uspFeatures);
  const announcementMode = getHomepageSectionDisplayMode(announcement);
  const reviewsMode = getHomepageSectionDisplayMode(reviews);
  const whyAuravilleMode = getHomepageSectionDisplayMode(whyAuraville);
  const doYouKnowMode = getHomepageSectionDisplayMode(doYouKnow);
  const faqMode = getHomepageSectionDisplayMode(faq);

  return (
    <>
      {heroMode === "hidden" ? null : heroMode === "custom" ? (
        <Hero
          imageUrl={hero?.imageUrl ?? undefined}
          linkUrl={hero?.linkUrl ?? undefined}
          title={hero?.title ?? undefined}
        />
      ) : (
        <Hero />
      )}
      <ScrollingBanner />
      {uspMode === "hidden" ? null : uspMode === "custom" ? (
        <UspFeatures
          title={uspFeatures?.title ?? undefined}
          labels={asStringArray(uspMetadata.labels)}
        />
      ) : (
        <UspFeatures />
      )}
      <FeaturedProducts />
      {announcementMode === "hidden" ? null : announcementMode === "custom" ? (
        <AnnouncementBar items={announcementItems} />
      ) : (
        <AnnouncementBar />
      )}
      <BestSellersSection />
      <FeaturedCoreProduct />
      {reviewsMode === "hidden" ? null : reviewsMode === "custom" ? (
        <ReviewsSlider title={reviews?.title ?? undefined} subtitle={reviews?.subtitle ?? undefined} />
      ) : (
        <ReviewsSlider />
      )}
      {whyAuravilleMode === "hidden" ? null : whyAuravilleMode === "custom" ? (
        <BrandStoryImage
          eyebrow={whyAuraville?.subtitle ?? undefined}
          title={whyAuraville?.title ?? undefined}
          body={whyAuraville?.body ?? undefined}
          imageUrl={whyAuraville?.imageUrl ?? undefined}
          linkUrl={whyAuraville?.linkUrl ?? undefined}
        />
      ) : (
        <BrandStoryImage />
      )}
      {doYouKnowMode === "hidden" ? null : doYouKnowMode === "custom" ? (
        <DoYouKnowSection title={doYouKnow?.title ?? undefined} subtitle={doYouKnow?.subtitle ?? undefined} />
      ) : (
        <DoYouKnowSection />
      )}
      {faqMode === "hidden" ? null : faqMode === "custom" ? (
        <FaqSection title={faq?.title ?? undefined} items={asFaqItems(faqMetadata.items)} />
      ) : (
        <FaqSection />
      )}
    </>
  );
}
