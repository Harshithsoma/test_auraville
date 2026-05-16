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
  isRenderableCmsImageUrl,
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
  active?: unknown;
  sortOrder?: unknown;
};

type HeroMetadataSlide = {
  imageUrl?: unknown;
  title?: unknown;
  subtitle?: unknown;
  linkUrl?: unknown;
  buttonText?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

type AnnouncementMetadataItem = {
  text?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

type UspMetadataItem = {
  label?: unknown;
  text?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

type DoYouKnowMetadataCard = {
  title?: unknown;
  body?: unknown;
  excerpt?: unknown;
  imageUrl?: unknown;
  linkUrl?: unknown;
  buttonText?: unknown;
  postedAt?: unknown;
  active?: unknown;
  sortOrder?: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function asBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asSingleLineText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asCmsHeroSlides(value: unknown): Array<{
  imageUrl: string;
  title?: string;
  subtitle?: string;
  linkUrl?: string;
  buttonText?: string;
  sortOrder?: number;
}> {
  if (!Array.isArray(value)) return [];

  return (value as HeroMetadataSlide[])
    .filter((item) => asBoolean(item.active, true))
    .map((item) => ({
      imageUrl: asSingleLineText(item.imageUrl) ?? "",
      title: asSingleLineText(item.title),
      subtitle: asSingleLineText(item.subtitle),
      linkUrl: asSingleLineText(item.linkUrl),
      buttonText: asSingleLineText(item.buttonText),
      sortOrder: asNumber(item.sortOrder, 0)
    }))
    .filter((slide) => slide.imageUrl.length > 0 && isRenderableCmsImageUrl(slide.imageUrl))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function asAnnouncementItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  if (value.every((item) => typeof item === "string")) {
    return asStringArray(value);
  }

  return (value as AnnouncementMetadataItem[])
    .filter((item) => asBoolean(item.active, true))
    .sort((a, b) => asNumber(a.sortOrder, 0) - asNumber(b.sortOrder, 0))
    .map((item) => asSingleLineText(item.text))
    .filter((item): item is string => Boolean(item));
}

function asUspLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  if (value.every((item) => typeof item === "string")) {
    return asStringArray(value);
  }

  return (value as UspMetadataItem[])
    .filter((item) => asBoolean(item.active, true))
    .sort((a, b) => asNumber(a.sortOrder, 0) - asNumber(b.sortOrder, 0))
    .map((item) => asSingleLineText(item.label) ?? asSingleLineText(item.text))
    .filter((item): item is string => Boolean(item));
}

function asFaqItems(value: unknown): Array<{ q: string; a: string }> {
  if (!Array.isArray(value)) return [];
  return (value as FaqMetadataItem[])
    .filter((item) => asBoolean(item.active, true))
    .sort((a, b) => asNumber(a.sortOrder, 0) - asNumber(b.sortOrder, 0))
    .map((item) => ({
      q: typeof item.q === "string" ? item.q.trim() : "",
      a: typeof item.a === "string" ? item.a.trim() : ""
    }))
    .filter((item) => item.q.length > 0 && item.a.length > 0);
}

function asDoYouKnowCards(value: unknown): Array<{
  title: string;
  excerpt: string;
  image?: string;
  linkUrl?: string;
  buttonText?: string;
  postedAt?: string;
}> {
  if (!Array.isArray(value)) return [];

  return (value as DoYouKnowMetadataCard[])
    .filter((item) => asBoolean(item.active, true))
    .sort((a, b) => asNumber(a.sortOrder, 0) - asNumber(b.sortOrder, 0))
    .map((item) => {
      const title = asSingleLineText(item.title) ?? "";
      const excerpt = asSingleLineText(item.body) ?? asSingleLineText(item.excerpt) ?? "";
      const imageUrl = asSingleLineText(item.imageUrl);
      return {
        title,
        excerpt,
        image: imageUrl && isRenderableCmsImageUrl(imageUrl) ? imageUrl : undefined,
        linkUrl: asSingleLineText(item.linkUrl),
        buttonText: asSingleLineText(item.buttonText),
        postedAt: asSingleLineText(item.postedAt)
      };
    })
    .filter((item) => item.title.length > 0 && item.excerpt.length > 0);
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
  const featuredCore = byKey.get("featured_core_product");

  const announcementMetadata = metadataObject(announcement);
  const announcementItems = [
    ...asAnnouncementItems(announcementMetadata.items),
    ...(announcement?.body
      ? announcement.body
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
      : [])
  ];

  const uspMetadata = metadataObject(uspFeatures);
  const faqMetadata = metadataObject(faq);
  const doYouKnowMetadata = metadataObject(doYouKnow);
  const heroMetadata = metadataObject(hero);
  const featuredCoreMetadata = metadataObject(featuredCore);

  const heroSlides = asCmsHeroSlides(heroMetadata.slides);
  const doYouKnowCards = asDoYouKnowCards(doYouKnowMetadata.cards);

  const heroMode = getHomepageSectionDisplayMode(hero);
  const uspMode = getHomepageSectionDisplayMode(uspFeatures);
  const announcementMode = getHomepageSectionDisplayMode(announcement);
  const reviewsMode = getHomepageSectionDisplayMode(reviews);
  const whyAuravilleMode = getHomepageSectionDisplayMode(whyAuraville);
  const doYouKnowMode = getHomepageSectionDisplayMode(doYouKnow);
  const faqMode = getHomepageSectionDisplayMode(faq);
  const featuredCoreMode = getHomepageSectionDisplayMode(featuredCore);

  return (
    <>
      {heroMode === "hidden" ? null : heroMode === "custom" ? (
        <Hero
          imageUrl={hero?.imageUrl ?? undefined}
          linkUrl={hero?.linkUrl ?? undefined}
          title={hero?.title ?? undefined}
          slides={heroSlides}
        />
      ) : (
        <Hero />
      )}
      <ScrollingBanner />
      {uspMode === "hidden" ? null : uspMode === "custom" ? (
        <UspFeatures
          title={uspFeatures?.title ?? undefined}
          labels={asUspLabels(uspMetadata.labels)}
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
      {featuredCoreMode === "hidden" ? null : featuredCoreMode === "custom" ? (
        <FeaturedCoreProduct
          eyebrow={
            typeof featuredCoreMetadata.eyebrow === "string"
              ? featuredCoreMetadata.eyebrow
              : featuredCore?.subtitle ?? undefined
          }
          title={featuredCore?.title ?? undefined}
          subtitle={
            typeof featuredCoreMetadata.subtitle === "string"
              ? featuredCoreMetadata.subtitle
              : featuredCore?.subtitle ?? undefined
          }
          description={featuredCore?.body ?? undefined}
          imageUrl={featuredCore?.imageUrl ?? undefined}
          ctaText={typeof featuredCoreMetadata.buttonText === "string" ? featuredCoreMetadata.buttonText : undefined}
          ctaLink={featuredCore?.linkUrl ?? undefined}
          secondaryText={
            typeof featuredCoreMetadata.secondaryText === "string"
              ? featuredCoreMetadata.secondaryText
              : undefined
          }
        />
      ) : (
        <FeaturedCoreProduct />
      )}
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
        <DoYouKnowSection
          cards={doYouKnowCards}
          title={doYouKnow?.title ?? undefined}
          subtitle={doYouKnow?.subtitle ?? undefined}
        />
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
