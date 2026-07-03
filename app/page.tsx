import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { AnnouncementBar } from "@/components/sections/announcement-bar";
import { BestSellersSection } from "@/components/sections/best-sellers";
import { BrandStoryImage } from "@/components/sections/brand-story-image";
import { DoYouKnowSection } from "@/components/sections/do-you-know";
import { FaqSection } from "@/components/sections/faq-section";
import { FeaturedCoreProduct } from "@/components/sections/featured-core-product";
import { FeaturedProducts } from "@/components/sections/featured-products";
import { Hero } from "@/components/sections/hero";
import { ScrollingBanner } from "@/components/sections/scrolling-banner";
import { UspFeatures } from "@/components/sections/usp-features";
import { JsonLd } from "@/components/seo/json-ld";
import {
  fetchHomepageSections,
  getSectionDisplayMode,
  parseAnnouncementItems,
  parseDoYouKnowCards,
  parseFaqItems,
  parseHeroSlides,
  parseUspLabels,
  sectionMap
} from "@/lib/homepage-cms";
import { HOMEPAGE_DEFAULT_FAQ_ITEMS } from "@/lib/homepage-defaults";
import { buildFaqPageJsonLd } from "@/lib/seo";
import { absoluteUrl, defaultShareImageUrl } from "@/lib/site";

const ReviewsSlider = nextDynamic(() => import("@/components/sections/reviews-slider").then((mod) => mod.ReviewsSlider));

export const metadata: Metadata = {
  alternates: {
    canonical: absoluteUrl("/")
  },
  title: "Auraville Healthy Snacks India",
  description:
    "Buy Palmyra Sprouts snacks from Auraville. Explore gluten free, fiber rich healthy snacks made with dates, palm jaggery, and Indian ingredients.",
  openGraph: {
    title: "Auraville Healthy Snacks India",
    description:
      "Buy Palmyra Sprouts snacks from Auraville. Explore gluten free, fiber rich healthy snacks made with dates, palm jaggery, and Indian ingredients.",
    url: absoluteUrl("/"),
    images: [{ url: defaultShareImageUrl(), width: 1200, height: 630, alt: "Auraville palmyra sprout healthy snacks" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Auraville Healthy Snacks India",
    description:
      "Buy Palmyra Sprouts snacks from Auraville. Explore gluten free, fiber rich healthy snacks made with dates, palm jaggery, and Indian ingredients.",
    images: [defaultShareImageUrl()]
  }
};

export const dynamic = "force-dynamic";

function sortedActiveTexts(items: Array<{ text: string; isActive?: boolean; sortOrder?: number }>): string[] {
  return [...items]
    .filter((item) => item.isActive !== false && item.text.trim().length > 0)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => item.text.trim());
}

function sortedActiveFaq(items: Array<{ q: string; a: string; isActive?: boolean; sortOrder?: number }>) {
  return [...items]
    .filter((item) => item.isActive !== false && item.q.trim().length > 0 && item.a.trim().length > 0)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((item) => ({
      q: item.q.trim(),
      a: item.a.trim()
    }));
}

export default async function HomePage() {
  const sections = await fetchHomepageSections();
  const byKey = sectionMap(sections);

  const hero = byKey.get("hero");
  const announcement = byKey.get("announcement");
  const scrollingBanner = byKey.get("infinite_scrolling_banner");
  const doYouKnow = byKey.get("do_you_know");
  const whyAuraville = byKey.get("why_auraville");
  const uspFeatures = byKey.get("usp_features");
  const faq = byKey.get("faq");
  const featuredCore = byKey.get("featured_core_product");

  const heroMode = getSectionDisplayMode(hero);
  const scrollingBannerMode = getSectionDisplayMode(scrollingBanner);
  const announcementMode = getSectionDisplayMode(announcement);
  const doYouKnowMode = getSectionDisplayMode(doYouKnow);
  const whyMode = getSectionDisplayMode(whyAuraville);
  const uspMode = getSectionDisplayMode(uspFeatures);
  const faqMode = getSectionDisplayMode(faq);
  const featuredCoreMode = getSectionDisplayMode(featuredCore);

  const heroSlides = parseHeroSlides(hero);
  const scrollingBannerItems = sortedActiveTexts(parseAnnouncementItems(scrollingBanner));
  const announcementItems = sortedActiveTexts(parseAnnouncementItems(announcement));
  const doYouKnowCards = parseDoYouKnowCards(doYouKnow);
  const uspLabels = parseUspLabels(uspFeatures);
  const faqItems = sortedActiveFaq(parseFaqItems(faq));

  const featuredCoreMeta =
    featuredCore?.metadata && typeof featuredCore.metadata === "object" && !Array.isArray(featuredCore.metadata)
      ? (featuredCore.metadata as Record<string, unknown>)
      : {};

  const featuredCoreButtonText =
    typeof featuredCoreMeta.buttonText === "string" && featuredCoreMeta.buttonText.trim().length > 0
      ? featuredCoreMeta.buttonText.trim()
      : undefined;
  const featuredCoreEyebrow =
    typeof featuredCoreMeta.eyebrow === "string" && featuredCoreMeta.eyebrow.trim().length > 0
      ? featuredCoreMeta.eyebrow.trim()
      : undefined;
  const visibleFaqItems =
    faqMode === "hidden"
      ? []
      : faqMode === "custom" && faqItems.length > 0
        ? faqItems
        : sortedActiveFaq(HOMEPAGE_DEFAULT_FAQ_ITEMS);

  return (
    <>
      <h1 className="sr-only">Auraville healthy snacks made with Palmyra Sprouts</h1>
      {visibleFaqItems.length > 0 ? (
        <JsonLd id="homepage-faq-json-ld" data={buildFaqPageJsonLd(visibleFaqItems)} />
      ) : null}
      {heroMode === "hidden" ? null : heroMode === "custom" ? (
        <Hero
          imageUrl={hero?.imageUrl ?? undefined}
          linkUrl={hero?.linkUrl ?? undefined}
          slides={heroSlides}
          title={hero?.title ?? undefined}
        />
      ) : (
        <Hero />
      )}
      {scrollingBannerMode === "hidden" ? null : scrollingBannerMode === "custom" ? (
        <ScrollingBanner items={scrollingBannerItems} />
      ) : (
        <ScrollingBanner />
      )}
      {uspMode === "hidden" ? null : uspMode === "custom" ? (
        <UspFeatures title={uspFeatures?.title ?? undefined} labels={uspLabels} />
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
          body={featuredCore?.body ?? undefined}
          buttonText={featuredCoreButtonText}
          eyebrow={featuredCoreEyebrow}
          imageUrl={featuredCore?.imageUrl ?? undefined}
          linkUrl={featuredCore?.linkUrl ?? undefined}
          subtitle={featuredCore?.subtitle ?? undefined}
          title={featuredCore?.title ?? undefined}
        />
      ) : (
        <FeaturedCoreProduct />
      )}
      <ReviewsSlider />
      {whyMode === "hidden" ? null : whyMode === "custom" ? (
        <BrandStoryImage
          body={whyAuraville?.body ?? undefined}
          eyebrow={whyAuraville?.subtitle ?? undefined}
          imageUrl={whyAuraville?.imageUrl ?? undefined}
          linkUrl={whyAuraville?.linkUrl ?? undefined}
          title={whyAuraville?.title ?? undefined}
        />
      ) : (
        <BrandStoryImage />
      )}
      {doYouKnowMode === "hidden" ? null : doYouKnowMode === "custom" ? (
        <DoYouKnowSection
          cards={doYouKnowCards}
          subtitle={doYouKnow?.subtitle ?? undefined}
          title={doYouKnow?.title ?? undefined}
        />
      ) : (
        <DoYouKnowSection />
      )}
      {faqMode === "hidden" ? null : faqMode === "custom" ? (
        <FaqSection title={faq?.title ?? undefined} items={faqItems} />
      ) : (
        <FaqSection />
      )}
    </>
  );
}
