"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import {
  HOMEPAGE_DEFAULT_ANNOUNCEMENTS,
  HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS,
  HOMEPAGE_DEFAULT_DO_YOU_KNOW_SUBTITLE,
  HOMEPAGE_DEFAULT_DO_YOU_KNOW_TITLE,
  HOMEPAGE_DEFAULT_FAQ_ITEMS,
  HOMEPAGE_DEFAULT_FEATURED_CORE,
  HOMEPAGE_DEFAULT_FOOTER_BLURB,
  HOMEPAGE_DEFAULT_HERO_SLIDES,
  HOMEPAGE_DEFAULT_REVIEWS,
  HOMEPAGE_DEFAULT_USP_LABELS,
  HOMEPAGE_DEFAULT_WHY_AURAVILLE,
  type HomepageAnnouncementItem,
  type HomepageCmsDisplayMode,
  type HomepageDoYouKnowCard,
  type HomepageFaqItem,
  type HomepageHeroSlide
} from "@/lib/homepage-defaults";

type AdminHomepageSection = {
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  metadata: Record<string, unknown> | null;
  isActive: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
};

type ListHomepageResponse = {
  data: AdminHomepageSection[];
};

type PatchHomepageResponse = {
  data: AdminHomepageSection;
};

type SectionState = {
  key: SectionKey;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  mode: HomepageCmsDisplayMode;
  metadata: Record<string, unknown>;
  heroSlides: HomepageHeroSlide[];
  announcementItems: HomepageAnnouncementItem[];
  doYouKnowCards: HomepageDoYouKnowCard[];
  uspLabels: string[];
  faqItems: HomepageFaqItem[];
  featuredButtonText: string;
  featuredEyebrow: string;
  featuredSecondaryText: string;
  createdAt: string;
  updatedAt: string;
  exists: boolean;
  isSaving: boolean;
  error: string | null;
  message: string | null;
};

const sectionKeys = [
  "hero",
  "announcement",
  "do_you_know",
  "why_auraville",
  "featured_core_product",
  "usp_features",
  "faq",
  "reviews",
  "footer"
] as const;
type SectionKey = (typeof sectionKeys)[number];

const modeHelpText: Record<HomepageCmsDisplayMode, string> = {
  custom:
    "Edit the homepage content shown for this section. If no custom content exists, defaults will be copied for editing.",
  default: "Use built-in Auraville default content.",
  hidden: "Hide this section from homepage."
};

const sectionHelpText: Record<SectionKey, string> = {
  hero: "Top hero slideshow at the start of homepage.",
  announcement: "Scrolling announcement strip shown below featured products.",
  do_you_know: "Instagram-style educational card carousel.",
  why_auraville: "Brand story section with image and descriptive text.",
  featured_core_product: "Highlighted promotional product/story section between Best Sellers and Reviews.",
  usp_features: "Feature badges row (Gluten Free, No Preservatives, etc).",
  faq: "Homepage FAQ accordion questions and answers.",
  reviews: "Customer reviews section heading/subheading only.",
  footer: "Homepage footer brand blurb content."
};

function prettyLabel(key: string): string {
  return key
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function toStringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function getSectionMode(section: AdminHomepageSection | null): HomepageCmsDisplayMode {
  if (!section) return "default";
  const mode = section.metadata && typeof section.metadata === "object" ? section.metadata.displayMode : undefined;
  if (mode === "custom" || mode === "default" || mode === "hidden") {
    return mode;
  }
  return section.isActive ? "custom" : "hidden";
}

function cloneMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
}

function parseHeroSlides(metadata: Record<string, unknown>): HomepageHeroSlide[] {
  const source = metadata.slides;
  if (!Array.isArray(source)) return [];
  const slides: HomepageHeroSlide[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    slides.push({
      title: toStringValue(row.title),
      subtitle: toStringValue(row.subtitle),
      imageUrl: toStringValue(row.imageUrl),
      linkUrl: toStringValue(row.linkUrl),
      buttonText: toStringValue(row.buttonText),
      objectPosition: toStringValue(row.objectPosition),
      sortOrder: toNumber(row.sortOrder),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true
    });
  }
  return slides;
}

function parseAnnouncementItems(metadata: Record<string, unknown>): HomepageAnnouncementItem[] {
  const source = metadata.items;
  if (!Array.isArray(source)) return [];
  const items: HomepageAnnouncementItem[] = [];
  for (const item of source) {
    if (typeof item === "string") {
      items.push({ text: item, isActive: true });
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    items.push({
      text: toStringValue(row.text),
      sortOrder: toNumber(row.sortOrder),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true
    });
  }
  return items;
}

function parseDoYouKnowCards(metadata: Record<string, unknown>): HomepageDoYouKnowCard[] {
  const source = metadata.cards;
  if (!Array.isArray(source)) return [];
  const cards: HomepageDoYouKnowCard[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    cards.push({
      title: toStringValue(row.title),
      body: toStringValue(row.body),
      imageUrl: toStringValue(row.imageUrl),
      linkUrl: toStringValue(row.linkUrl),
      buttonText: toStringValue(row.buttonText),
      postedAt: toStringValue(row.postedAt),
      sortOrder: toNumber(row.sortOrder),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true
    });
  }
  return cards;
}

function parseUspLabels(metadata: Record<string, unknown>): string[] {
  const source = metadata.labels;
  if (!Array.isArray(source)) return [];
  return source.filter((item): item is string => typeof item === "string").map((item) => item.trim());
}

function parseFaqItems(metadata: Record<string, unknown>): HomepageFaqItem[] {
  const source = metadata.items;
  if (!Array.isArray(source)) return [];
  const items: HomepageFaqItem[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    items.push({
      q: toStringValue(row.q),
      a: toStringValue(row.a),
      sortOrder: toNumber(row.sortOrder),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true
    });
  }
  return items;
}

function toSectionState(section: AdminHomepageSection | null, key: SectionKey, fallbackPosition: number): SectionState {
  const metadata = cloneMetadata(section?.metadata ?? null);
  const featuredMeta = metadata.featuredCore && typeof metadata.featuredCore === "object"
    ? (metadata.featuredCore as Record<string, unknown>)
    : {};

  return {
    key,
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    body: section?.body ?? "",
    imageUrl: section?.imageUrl ?? "",
    linkUrl: section?.linkUrl ?? "",
    position: String(section?.position ?? fallbackPosition),
    mode: getSectionMode(section),
    metadata,
    heroSlides: parseHeroSlides(metadata),
    announcementItems: parseAnnouncementItems(metadata),
    doYouKnowCards: parseDoYouKnowCards(metadata),
    uspLabels: parseUspLabels(metadata),
    faqItems: parseFaqItems(metadata),
    featuredButtonText: toStringValue(featuredMeta.buttonText),
    featuredEyebrow: toStringValue(featuredMeta.eyebrow),
    featuredSecondaryText: toStringValue(featuredMeta.secondaryText),
    createdAt: section?.createdAt ?? "",
    updatedAt: section?.updatedAt ?? "",
    exists: Boolean(section),
    isSaving: false,
    error: null,
    message: null
  };
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeImageUrlInput(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function isRenderableCmsImageUrl(value: string): boolean {
  const trimmed = normalizeImageUrlInput(value);
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(trimmed);
  }
  if (!isValidUrl(trimmed)) return false;

  const parsed = new URL(trimmed);
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "https:") return false;

  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
  if (blockedHosts.has(hostname)) return false;

  // Cloudinary delivery URLs can include transformations and query params.
  if (hostname === "res.cloudinary.com" && parsed.pathname.includes("/image/upload/")) {
    return true;
  }

  // Unsplash image delivery endpoints often omit file extensions.
  if (hostname === "images.unsplash.com" || hostname === "source.unsplash.com") {
    return true;
  }

  // Generic HTTPS image URLs must look like direct image assets.
  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(parsed.pathname);
}

function hydrateWithDefaults(state: SectionState): SectionState {
  const next = { ...state };
  if (next.key === "hero" && next.heroSlides.length === 0) {
    next.heroSlides = HOMEPAGE_DEFAULT_HERO_SLIDES.map((slide) => ({ ...slide }));
  }

  if (next.key === "announcement" && next.announcementItems.length === 0) {
    next.announcementItems = HOMEPAGE_DEFAULT_ANNOUNCEMENTS.map((item) => ({ ...item }));
  }

  if (next.key === "do_you_know") {
    if (!next.title.trim()) next.title = HOMEPAGE_DEFAULT_DO_YOU_KNOW_TITLE;
    if (!next.subtitle.trim()) next.subtitle = HOMEPAGE_DEFAULT_DO_YOU_KNOW_SUBTITLE;
    if (next.doYouKnowCards.length === 0) {
      next.doYouKnowCards = HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS.map((card) => ({ ...card }));
    }
  }

  if (next.key === "why_auraville") {
    if (!next.title.trim()) next.title = HOMEPAGE_DEFAULT_WHY_AURAVILLE.title;
    if (!next.subtitle.trim()) next.subtitle = HOMEPAGE_DEFAULT_WHY_AURAVILLE.eyebrow;
    if (!next.body.trim()) next.body = HOMEPAGE_DEFAULT_WHY_AURAVILLE.body;
    if (!next.imageUrl.trim()) next.imageUrl = HOMEPAGE_DEFAULT_WHY_AURAVILLE.imageUrl;
    if (!next.linkUrl.trim()) next.linkUrl = HOMEPAGE_DEFAULT_WHY_AURAVILLE.linkUrl;
  }

  if (next.key === "featured_core_product") {
    if (!next.imageUrl.trim()) next.imageUrl = HOMEPAGE_DEFAULT_FEATURED_CORE.imageUrl;
    if (!next.linkUrl.trim()) next.linkUrl = HOMEPAGE_DEFAULT_FEATURED_CORE.linkUrl;
    if (!next.featuredButtonText.trim()) next.featuredButtonText = HOMEPAGE_DEFAULT_FEATURED_CORE.buttonText ?? "";
    if (!next.featuredEyebrow.trim()) next.featuredEyebrow = HOMEPAGE_DEFAULT_FEATURED_CORE.eyebrow ?? "";
    if (!next.featuredSecondaryText.trim()) next.featuredSecondaryText = HOMEPAGE_DEFAULT_FEATURED_CORE.secondaryText ?? "";
  }

  if (next.key === "usp_features" && next.uspLabels.length === 0) {
    next.uspLabels = [...HOMEPAGE_DEFAULT_USP_LABELS];
  }

  if (next.key === "faq" && next.faqItems.length === 0) {
    next.faqItems = HOMEPAGE_DEFAULT_FAQ_ITEMS.map((item) => ({ ...item }));
  }

  if (next.key === "reviews") {
    if (!next.title.trim()) next.title = HOMEPAGE_DEFAULT_REVIEWS.title;
    if (!next.subtitle.trim()) next.subtitle = HOMEPAGE_DEFAULT_REVIEWS.subtitle;
  }

  if (next.key === "footer" && !next.body.trim()) {
    next.body = HOMEPAGE_DEFAULT_FOOTER_BLURB;
  }

  return next;
}

export function AdminHomepageClient() {
  const [sections, setSections] = useState<Record<string, SectionState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const orderedKeys = useMemo(
    () =>
      [...sectionKeys].sort((left, right) => {
        const leftPosition = Number(sections[left]?.position ?? 0);
        const rightPosition = Number(sections[right]?.position ?? 0);
        return leftPosition - rightPosition;
      }),
    [sections]
  );

  const loadHomepageSections = useCallback(async () => {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await commerceApi.admin.homepage.list<ListHomepageResponse>();
      const byKey = new Map(response.data.map((section) => [section.key, section]));

      const nextState: Record<string, SectionState> = {};
      sectionKeys.forEach((key, index) => {
        nextState[key] = toSectionState(byKey.get(key) ?? null, key, index);
      });

      setSections(nextState);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to load homepage sections.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomepageSections();
  }, [loadHomepageSections]);

  function updateSection(key: SectionKey, updater: (current: SectionState) => SectionState) {
    setSections((current) => {
      const existing = current[key];
      if (!existing) return current;
      return {
        ...current,
        [key]: updater(existing)
      };
    });
  }

  function setMode(key: SectionKey, mode: HomepageCmsDisplayMode) {
    updateSection(key, (state) => {
      const changed = { ...state, mode, message: null, error: null };
      if (mode === "custom") {
        return hydrateWithDefaults(changed);
      }
      return changed;
    });
  }

  function updateHeroSlide(
    key: SectionKey,
    index: number,
    updater: (row: HomepageHeroSlide) => HomepageHeroSlide
  ) {
    updateSection(key, (state) => {
      const rows = [...state.heroSlides];
      rows[index] = updater({ ...rows[index] });
      return { ...state, heroSlides: rows, message: null };
    });
  }

  function updateAnnouncementItem(
    key: SectionKey,
    index: number,
    updater: (row: HomepageAnnouncementItem) => HomepageAnnouncementItem
  ) {
    updateSection(key, (state) => {
      const rows = [...state.announcementItems];
      rows[index] = updater({ ...rows[index] });
      return { ...state, announcementItems: rows, message: null };
    });
  }

  function updateDoYouKnowCard(
    key: SectionKey,
    index: number,
    updater: (row: HomepageDoYouKnowCard) => HomepageDoYouKnowCard
  ) {
    updateSection(key, (state) => {
      const rows = [...state.doYouKnowCards];
      rows[index] = updater({ ...rows[index] });
      return { ...state, doYouKnowCards: rows, message: null };
    });
  }

  function updateFaqItem(key: SectionKey, index: number, updater: (row: HomepageFaqItem) => HomepageFaqItem) {
    updateSection(key, (state) => {
      const rows = [...state.faqItems];
      rows[index] = updater({ ...rows[index] });
      return { ...state, faqItems: rows, message: null };
    });
  }

  function validateSection(section: SectionState): string | null {
    const positionValue = Number(section.position);
    if (!Number.isInteger(positionValue) || positionValue < 0) {
      return "Position must be a non-negative integer.";
    }

    if (section.imageUrl.trim() && !isRenderableCmsImageUrl(section.imageUrl.trim())) {
      return "Image URL must be a valid local path or supported HTTPS URL.";
    }

    if (section.linkUrl.trim() && !isValidUrl(section.linkUrl.trim()) && !section.linkUrl.trim().startsWith("/")) {
      return "Link URL must be a valid URL or relative path.";
    }

    if (section.mode !== "custom") {
      return null;
    }

    if (section.key === "hero") {
      if (section.heroSlides.length === 0) {
        return "Hero custom mode needs at least one slide.";
      }
      const invalid = section.heroSlides.find((slide) => !isRenderableCmsImageUrl(slide.imageUrl ?? ""));
      if (invalid) {
        return "Each hero slide needs a valid image URL.";
      }
    }

    if (section.key === "announcement") {
      if (section.announcementItems.length === 0) {
        return "Announcement custom mode needs at least one message.";
      }
    }

    if (section.key === "do_you_know") {
      if (section.doYouKnowCards.length === 0) {
        return "Do You Know custom mode needs at least one card.";
      }
    }

    if (section.key === "faq") {
      const invalidFaq = section.faqItems.find((item) => !item.q?.trim() || !item.a?.trim());
      if (invalidFaq) {
        return "Each FAQ item needs both question and answer.";
      }
    }

    return null;
  }

  async function onSaveSection(key: SectionKey) {
    const current = sections[key];
    if (!current) return;

    const validationError = validateSection(current);
    if (validationError) {
      updateSection(key, (state) => ({ ...state, error: validationError, message: null }));
      return;
    }

    const metadata = { ...current.metadata, displayMode: current.mode } as Record<string, unknown>;
    const modeIsHidden = current.mode === "hidden";

    if (key === "hero") {
      metadata.slides = current.heroSlides.map((slide, index) => ({
        title: slide.title?.trim() || null,
        subtitle: slide.subtitle?.trim() || null,
        imageUrl: slide.imageUrl?.trim() || "",
        linkUrl: slide.linkUrl?.trim() || null,
        buttonText: slide.buttonText?.trim() || null,
        objectPosition: slide.objectPosition?.trim() || "50% 50%",
        sortOrder: slide.sortOrder ?? index,
        isActive: slide.isActive !== false
      }));
    }

    if (key === "announcement") {
      metadata.items = current.announcementItems.map((item, index) => ({
        text: item.text?.trim() || "",
        sortOrder: item.sortOrder ?? index,
        isActive: item.isActive !== false
      }));
    }

    if (key === "do_you_know") {
      metadata.cards = current.doYouKnowCards.map((card, index) => ({
        title: card.title?.trim() || "",
        body: card.body?.trim() || "",
        imageUrl: card.imageUrl?.trim() || "",
        linkUrl: card.linkUrl?.trim() || "",
        buttonText: card.buttonText?.trim() || "",
        postedAt: card.postedAt?.trim() || "",
        sortOrder: card.sortOrder ?? index,
        isActive: card.isActive !== false
      }));
    }

    if (key === "usp_features") {
      metadata.labels = current.uspLabels.map((label) => label.trim()).filter(Boolean);
    }

    if (key === "faq") {
      metadata.items = current.faqItems.map((item, index) => ({
        q: item.q?.trim() || "",
        a: item.a?.trim() || "",
        sortOrder: item.sortOrder ?? index,
        isActive: item.isActive !== false
      }));
    }

    if (key === "featured_core_product") {
      metadata.featuredCore = {
        buttonText: current.featuredButtonText.trim() || null,
        eyebrow: current.featuredEyebrow.trim() || null,
        secondaryText: current.featuredSecondaryText.trim() || null
      };
    }

    const payload: {
      title: string | null;
      subtitle: string | null;
      body: string | null;
      metadata: Record<string, unknown>;
      isActive: boolean;
      position: number;
      imageUrl?: string;
      linkUrl?: string;
    } = {
      title: current.title.trim() ? current.title.trim() : null,
      subtitle: current.subtitle.trim() ? current.subtitle.trim() : null,
      body: current.body.trim() ? current.body.trim() : null,
      metadata,
      isActive: modeIsHidden ? false : true,
      position: Number(current.position)
    };

    if (current.imageUrl.trim()) payload.imageUrl = current.imageUrl.trim();
    if (current.linkUrl.trim()) payload.linkUrl = current.linkUrl.trim();

    updateSection(key, (state) => ({ ...state, isSaving: true, error: null, message: null }));

    try {
      const response = await commerceApi.admin.homepage.update<PatchHomepageResponse, typeof payload>(key, payload);
      updateSection(key, () => ({
        ...toSectionState(response.data, key, response.data.position),
        isSaving: false,
        message: "Section saved successfully.",
        error: null
      }));
    } catch (error) {
      updateSection(key, (state) => ({
        ...state,
        isSaving: false,
        error: error instanceof ApiError ? error.message : "Unable to save section.",
        message: null
      }));
    }
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Homepage Content</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Choose mode per section, then edit structured fields. Default mode uses built-in storefront content.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadHomepageSections()}>
          Refresh
        </Button>
      </div>

      {listError ? (
        <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
          {listError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
          Loading homepage sections...
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orderedKeys.map((key) => {
            const section = sections[key];
            if (!section) return null;

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 md:p-5" key={key}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{prettyLabel(key)}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">{sectionHelpText[key]}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Key: {key} | Created: {formatDate(section.createdAt)} | Updated: {formatDate(section.updatedAt)}
                    </p>
                  </div>
                  <Button type="button" disabled={section.isSaving} onClick={() => void onSaveSection(key)}>
                    {section.isSaving ? "Saving..." : "Save Section"}
                  </Button>
                </div>

                {section.error ? (
                  <div className="mt-3 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
                    {section.error}
                  </div>
                ) : null}
                {section.message ? (
                  <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
                    {section.message}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-semibold">Display Mode</span>
                    <Select className="mt-2" value={section.mode} onChange={(event) => setMode(key, event.target.value as HomepageCmsDisplayMode)}>
                      <option value="custom">Custom</option>
                      <option value="default">Default</option>
                      <option value="hidden">Hidden</option>
                    </Select>
                    <p className="mt-2 text-xs text-[var(--muted)]">{modeHelpText[section.mode]}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Switching to Custom copies the current default content into editable fields if this section has no custom content yet.
                    </p>
                  </label>
                  <label>
                    <span className="text-sm font-semibold">Position</span>
                    <Input
                      className="mt-2"
                      min={0}
                      type="number"
                      value={section.position}
                      onChange={(event) =>
                        updateSection(key, (state) => ({ ...state, position: event.target.value, message: null }))
                      }
                    />
                  </label>
                </div>

                {section.mode === "custom" ? (
                  <div className="mt-5 space-y-4 border-t border-[var(--line)] pt-4">
                    {(key === "hero" || key === "do_you_know" || key === "why_auraville" || key === "featured_core_product" || key === "reviews" || key === "faq" || key === "usp_features" || key === "footer") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Title</span>
                        <Input
                          className="mt-2"
                          value={section.title}
                          onChange={(event) =>
                            updateSection(key, (state) => ({ ...state, title: event.target.value, message: null }))
                          }
                        />
                      </label>
                    ) : null}

                    {(key === "do_you_know" || key === "why_auraville" || key === "featured_core_product" || key === "reviews") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Subtitle</span>
                        <Input
                          className="mt-2"
                          value={section.subtitle}
                          onChange={(event) =>
                            updateSection(key, (state) => ({ ...state, subtitle: event.target.value, message: null }))
                          }
                        />
                      </label>
                    ) : null}

                    {(key === "why_auraville" || key === "featured_core_product" || key === "footer") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Body</span>
                        <Textarea
                          className="mt-2 min-h-20"
                          value={section.body}
                          onChange={(event) =>
                            updateSection(key, (state) => ({ ...state, body: event.target.value, message: null }))
                          }
                        />
                      </label>
                    ) : null}

                    {(key === "hero" || key === "why_auraville" || key === "featured_core_product") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Image URL</span>
                        <Input
                          className="mt-2"
                          placeholder="https://... or /hero/..."
                          value={section.imageUrl}
                          onChange={(event) =>
                            updateSection(key, (state) => ({ ...state, imageUrl: event.target.value, message: null }))
                          }
                        />
                      </label>
                    ) : null}

                    {(key === "hero" || key === "why_auraville" || key === "featured_core_product") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Link URL</span>
                        <Input
                          className="mt-2"
                          placeholder="https://... or /product/..."
                          value={section.linkUrl}
                          onChange={(event) =>
                            updateSection(key, (state) => ({ ...state, linkUrl: event.target.value, message: null }))
                          }
                        />
                      </label>
                    ) : null}

                    {key === "hero" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">Hero Slides</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          These slides replace the default hero slideshow when Custom mode is active.
                        </p>
                        <div className="mt-3 space-y-3">
                          {section.heroSlides.map((slide, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`hero-${index}`}>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Slide title"
                                  value={slide.title ?? ""}
                                  onChange={(event) =>
                                    updateHeroSlide(key, index, (row) => ({ ...row, title: event.target.value }))
                                  }
                                />
                                <Input
                                  placeholder="Image URL"
                                  value={slide.imageUrl ?? ""}
                                  onChange={(event) =>
                                    updateHeroSlide(key, index, (row) => ({ ...row, imageUrl: event.target.value }))
                                  }
                                />
                                <Input
                                  placeholder="Link URL"
                                  value={slide.linkUrl ?? ""}
                                  onChange={(event) =>
                                    updateHeroSlide(key, index, (row) => ({ ...row, linkUrl: event.target.value }))
                                  }
                                />
                                <label className="inline-flex items-center gap-2 text-sm">
                                  <input
                                    checked={slide.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateHeroSlide(key, index, (row) => ({ ...row, isActive: event.target.checked }))
                                    }
                                  />
                                  Active
                                </label>
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.heroSlides];
                                      if (index <= 0) return state;
                                      const [item] = rows.splice(index, 1);
                                      rows.splice(index - 1, 0, item);
                                      return { ...state, heroSlides: rows, message: null };
                                    })
                                  }
                                >
                                  Move Up
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  onClick={() =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.heroSlides];
                                      if (index >= rows.length - 1) return state;
                                      const [item] = rows.splice(index, 1);
                                      rows.splice(index + 1, 0, item);
                                      return { ...state, heroSlides: rows, message: null };
                                    })
                                  }
                                >
                                  Move Down
                                </Button>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() =>
                                    updateSection(key, (state) => ({
                                      ...state,
                                      heroSlides: state.heroSlides.filter((_, rowIndex) => rowIndex !== index),
                                      message: null
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="mt-3"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            updateSection(key, (state) => ({
                              ...state,
                              heroSlides: [
                                ...state.heroSlides,
                                { title: "", imageUrl: "", linkUrl: "", isActive: true, sortOrder: state.heroSlides.length }
                              ],
                              message: null
                            }))
                          }
                        >
                          Add Slide
                        </Button>
                      </div>
                    ) : null}

                    {key === "announcement" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">Announcement Messages</p>
                        <div className="mt-3 space-y-3">
                          {section.announcementItems.map((item, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`ann-${index}`}>
                              <Input
                                placeholder="Message text"
                                value={item.text}
                                onChange={(event) =>
                                  updateAnnouncementItem(key, index, (row) => ({ ...row, text: event.target.value }))
                                }
                              />
                              <div className="mt-3 flex flex-wrap gap-2">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={item.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateAnnouncementItem(key, index, (row) => ({ ...row, isActive: event.target.checked }))
                                    }
                                  />
                                  Active
                                </label>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() =>
                                    updateSection(key, (state) => ({
                                      ...state,
                                      announcementItems: state.announcementItems.filter((_, rowIndex) => rowIndex !== index),
                                      message: null
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="mt-3"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            updateSection(key, (state) => ({
                              ...state,
                              announcementItems: [...state.announcementItems, { text: "", isActive: true }],
                              message: null
                            }))
                          }
                        >
                          Add Message
                        </Button>
                      </div>
                    ) : null}

                    {key === "do_you_know" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">Do You Know Cards</p>
                        <div className="mt-3 space-y-3">
                          {section.doYouKnowCards.map((card, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`dyk-${index}`}>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Title"
                                  value={card.title}
                                  onChange={(event) =>
                                    updateDoYouKnowCard(key, index, (row) => ({ ...row, title: event.target.value }))
                                  }
                                />
                                <Input
                                  placeholder="Image URL"
                                  value={card.imageUrl ?? ""}
                                  onChange={(event) =>
                                    updateDoYouKnowCard(key, index, (row) => ({ ...row, imageUrl: event.target.value }))
                                  }
                                />
                                <Input
                                  placeholder="Link URL"
                                  value={card.linkUrl ?? ""}
                                  onChange={(event) =>
                                    updateDoYouKnowCard(key, index, (row) => ({ ...row, linkUrl: event.target.value }))
                                  }
                                />
                                <Input
                                  placeholder="Button text"
                                  value={card.buttonText ?? ""}
                                  onChange={(event) =>
                                    updateDoYouKnowCard(key, index, (row) => ({ ...row, buttonText: event.target.value }))
                                  }
                                />
                              </div>
                              <Textarea
                                className="mt-2 min-h-16"
                                placeholder="Card excerpt"
                                value={card.body}
                                onChange={(event) =>
                                  updateDoYouKnowCard(key, index, (row) => ({ ...row, body: event.target.value }))
                                }
                              />
                              <div className="mt-3 flex flex-wrap gap-2">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={card.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateDoYouKnowCard(key, index, (row) => ({ ...row, isActive: event.target.checked }))
                                    }
                                  />
                                  Active
                                </label>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() =>
                                    updateSection(key, (state) => ({
                                      ...state,
                                      doYouKnowCards: state.doYouKnowCards.filter((_, rowIndex) => rowIndex !== index),
                                      message: null
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="mt-3"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            updateSection(key, (state) => ({
                              ...state,
                              doYouKnowCards: [
                                ...state.doYouKnowCards,
                                { title: "", body: "", imageUrl: "", linkUrl: "", buttonText: "View post", isActive: true }
                              ],
                              message: null
                            }))
                          }
                        >
                          Add Card
                        </Button>
                      </div>
                    ) : null}

                    {key === "usp_features" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">USP Labels</p>
                        <div className="mt-3 space-y-2">
                          {section.uspLabels.map((label, index) => (
                            <div className="flex items-center gap-2" key={`usp-${index}`}>
                              <Input
                                value={label}
                                onChange={(event) =>
                                  updateSection(key, (state) => {
                                    const labels = [...state.uspLabels];
                                    labels[index] = event.target.value;
                                    return { ...state, uspLabels: labels, message: null };
                                  })
                                }
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={() =>
                                  updateSection(key, (state) => ({
                                    ...state,
                                    uspLabels: state.uspLabels.filter((_, rowIndex) => rowIndex !== index),
                                    message: null
                                  }))
                                }
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="mt-3"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            updateSection(key, (state) => ({
                              ...state,
                              uspLabels: [...state.uspLabels, ""],
                              message: null
                            }))
                          }
                        >
                          Add Label
                        </Button>
                      </div>
                    ) : null}

                    {key === "faq" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">FAQ Items</p>
                        <div className="mt-3 space-y-3">
                          {section.faqItems.map((item, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`faq-${index}`}>
                              <Input
                                placeholder="Question"
                                value={item.q}
                                onChange={(event) =>
                                  updateFaqItem(key, index, (row) => ({ ...row, q: event.target.value }))
                                }
                              />
                              <Textarea
                                className="mt-2 min-h-16"
                                placeholder="Answer"
                                value={item.a}
                                onChange={(event) =>
                                  updateFaqItem(key, index, (row) => ({ ...row, a: event.target.value }))
                                }
                              />
                              <div className="mt-3 flex flex-wrap gap-2">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={item.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateFaqItem(key, index, (row) => ({ ...row, isActive: event.target.checked }))
                                    }
                                  />
                                  Active
                                </label>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  onClick={() =>
                                    updateSection(key, (state) => ({
                                      ...state,
                                      faqItems: state.faqItems.filter((_, rowIndex) => rowIndex !== index),
                                      message: null
                                    }))
                                  }
                                >
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          className="mt-3"
                          type="button"
                          variant="secondary"
                          onClick={() =>
                            updateSection(key, (state) => ({
                              ...state,
                              faqItems: [...state.faqItems, { q: "", a: "", isActive: true }],
                              message: null
                            }))
                          }
                        >
                          Add FAQ
                        </Button>
                      </div>
                    ) : null}

                    {key === "featured_core_product" ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label>
                          <span className="text-sm font-semibold">Eyebrow</span>
                          <Input
                            className="mt-2"
                            value={section.featuredEyebrow}
                            onChange={(event) =>
                              updateSection(key, (state) => ({
                                ...state,
                                featuredEyebrow: event.target.value,
                                message: null
                              }))
                            }
                          />
                        </label>
                        <label>
                          <span className="text-sm font-semibold">Button Text</span>
                          <Input
                            className="mt-2"
                            value={section.featuredButtonText}
                            onChange={(event) =>
                              updateSection(key, (state) => ({
                                ...state,
                                featuredButtonText: event.target.value,
                                message: null
                              }))
                            }
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="text-sm font-semibold">Secondary Text</span>
                          <Input
                            className="mt-2"
                            value={section.featuredSecondaryText}
                            onChange={(event) =>
                              updateSection(key, (state) => ({
                                ...state,
                                featuredSecondaryText: event.target.value,
                                message: null
                              }))
                            }
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--muted)]">
                    {section.mode === "default"
                      ? "This section uses built-in storefront defaults. Switch to Custom to edit content."
                      : "This section is hidden from homepage."}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
