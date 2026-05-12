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
import { fetchHomepageSections, metadataObject, sectionMap } from "@/lib/homepage-cms";
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

  return (
    <>
      <Hero
        imageUrl={hero && hero.isActive ? (hero.imageUrl ?? undefined) : undefined}
        linkUrl={hero && hero.isActive ? (hero.linkUrl ?? undefined) : undefined}
        title={hero && hero.isActive ? (hero.title ?? undefined) : undefined}
      />
      <ScrollingBanner />
      {!uspFeatures || uspFeatures.isActive ? (
        <UspFeatures
          title={uspFeatures?.title ?? undefined}
          labels={asStringArray(uspMetadata.labels)}
        />
      ) : null}
      <FeaturedProducts />
      {!announcement || announcement.isActive ? (
        <AnnouncementBar items={announcementItems} />
      ) : null}
      <BestSellersSection />
      <FeaturedCoreProduct />
      {!reviews || reviews.isActive ? (
        <ReviewsSlider title={reviews?.title ?? undefined} subtitle={reviews?.subtitle ?? undefined} />
      ) : null}
      {!whyAuraville || whyAuraville.isActive ? (
        <BrandStoryImage
          eyebrow={whyAuraville?.subtitle ?? undefined}
          title={whyAuraville?.title ?? undefined}
          body={whyAuraville?.body ?? undefined}
          imageUrl={whyAuraville?.imageUrl ?? undefined}
          linkUrl={whyAuraville?.linkUrl ?? undefined}
        />
      ) : null}
      {!doYouKnow || doYouKnow.isActive ? (
        <DoYouKnowSection title={doYouKnow?.title ?? undefined} subtitle={doYouKnow?.subtitle ?? undefined} />
      ) : null}
      {!faq || faq.isActive ? (
        <FaqSection title={faq?.title ?? undefined} items={asFaqItems(faqMetadata.items)} />
      ) : null}
    </>
  );
}
