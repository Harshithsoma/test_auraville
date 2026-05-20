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
  HOMEPAGE_DEFAULT_HERO_SLIDES,
  HOMEPAGE_DEFAULT_SCROLLING_BANNER_ITEMS,
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

type ListHomepageResponse = { data: AdminHomepageSection[] };
type PatchHomepageResponse = { data: AdminHomepageSection };

type UspLabelItem = {
  label: string;
  isActive: boolean;
  sortOrder?: number;
};

const CMS_SECTION_CONFIG = {
  hero: {
    position: 1,
    title: "Hero Slideshow",
    storefrontLocation: "Homepage section 1 (top hero)",
    description: "Controls the homepage hero slideshow images and links."
  },
  infinite_scrolling_banner: {
    position: 2,
    title: "Infinite Scrolling Banner",
    storefrontLocation: "Homepage section 2 (running value banner)",
    description: "Controls the continuously scrolling brand/value text banner."
  },
  usp_features: {
    position: 3,
    title: "USP Features",
    storefrontLocation: "Homepage section 3 (feature badges)",
    description: "Controls short USP badges such as Gluten Free and No Preservatives."
  },
  announcement: {
    position: 5,
    title: "Announcement",
    storefrontLocation: "Homepage section 5 (announcement strip)",
    description: "Controls the icon-based announcement bar messages."
  },
  featured_core_product: {
    position: 7,
    title: "Featured Core Product",
    storefrontLocation: "Homepage section 7 (large promo section)",
    description: "Controls the highlighted promotional section between Best Sellers and Reviews."
  },
  why_auraville: {
    position: 9,
    title: "Why Auraville",
    storefrontLocation: "Homepage section 9 (brand story)",
    description: "Controls title, subtitle, story text, and main image for Why Auraville."
  },
  do_you_know: {
    position: 10,
    title: "Do You Know",
    storefrontLocation: "Homepage section 10 (educational cards)",
    description: "Controls title/subtitle and educational/Instagram card content."
  },
  faq: {
    position: 11,
    title: "FAQ",
    storefrontLocation: "Homepage section 11 (FAQ accordion)",
    description: "Controls homepage FAQ questions and answers."
  }
} as const;

type SectionKey = keyof typeof CMS_SECTION_CONFIG;
const sectionKeys = Object.keys(CMS_SECTION_CONFIG) as SectionKey[];

type SectionState = {
  key: SectionKey;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  mode: HomepageCmsDisplayMode;
  metadata: Record<string, unknown>;
  heroSlides: HomepageHeroSlide[];
  messageItems: HomepageAnnouncementItem[];
  doYouKnowCards: HomepageDoYouKnowCard[];
  uspLabels: UspLabelItem[];
  faqItems: HomepageFaqItem[];
  featuredButtonText: string;
  featuredEyebrow: string;
  featuredSecondaryText: string;
  createdAt: string;
  updatedAt: string;
  isSaving: boolean;
  error: string | null;
  message: string | null;
  savedSnapshot: string;
};

const modeHelpText: Record<HomepageCmsDisplayMode, string> = {
  custom: "Edit this section directly. Copies current default content into editable fields if no custom content exists.",
  default: "Uses built-in Auraville default content.",
  hidden: "Hides this section from homepage."
};

const IMAGE_URL_HELPER =
  "Upload image in Admin Uploads/Cloudinary, then paste the generated HTTPS URL here. Direct HTTPS image URLs are supported.";
const LINK_URL_HELPER =
  "Use an internal path such as /products/energy-bar, /products, /best-selling, or a full external URL such as an Instagram post link.";
const HERO_IMAGE_SIZE_HELPER = "Recommended hero image size: wide banner ratio around 1600 x 700 (or similar).";

function cloneMetadata(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return JSON.parse(JSON.stringify(metadata)) as Record<string, unknown>;
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
  if (mode === "custom" || mode === "default" || mode === "hidden") return mode;
  return section.isActive ? "custom" : "hidden";
}

function normalizeImageUrlInput(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "");
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isRenderableCmsImageUrl(value: string): boolean {
  const trimmed = normalizeImageUrlInput(value);
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(trimmed);
  if (!isValidUrl(trimmed)) return false;
  const parsed = new URL(trimmed);
  if (parsed.protocol.toLowerCase() !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  const blocked = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
  if (blocked.has(host)) return false;
  if (host === "res.cloudinary.com" && parsed.pathname.includes("/image/upload/")) return true;
  if (host === "images.unsplash.com" || host === "source.unsplash.com") return true;
  return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(parsed.pathname);
}

function parseHeroSlides(metadata: Record<string, unknown>): HomepageHeroSlide[] {
  const source = metadata.slides;
  if (!Array.isArray(source)) return [];
  const rows: HomepageHeroSlide[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
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
  return rows;
}

function parseAnnouncementItems(metadata: Record<string, unknown>): HomepageAnnouncementItem[] {
  const source = metadata.items;
  if (!Array.isArray(source)) return [];
  const rows: HomepageAnnouncementItem[] = [];
  for (const item of source) {
    if (typeof item === "string") {
      rows.push({ text: item, isActive: true });
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
      text: toStringValue(row.text),
      sortOrder: toNumber(row.sortOrder),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true
    });
  }
  return rows;
}

function parseDoYouKnowCards(metadata: Record<string, unknown>): HomepageDoYouKnowCard[] {
  const source = metadata.cards;
  if (!Array.isArray(source)) return [];
  const rows: HomepageDoYouKnowCard[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
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
  return rows;
}

function parseUspLabels(metadata: Record<string, unknown>): UspLabelItem[] {
  const source = metadata.labels;
  if (!Array.isArray(source)) return [];
  const rows: UspLabelItem[] = [];
  for (const item of source) {
    if (typeof item === "string") {
      rows.push({ label: item, isActive: true });
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
      label: toStringValue((row as { label?: unknown }).label ?? row.text),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true,
      sortOrder: toNumber(row.sortOrder)
    });
  }
  return rows;
}

function parseFaqItems(metadata: Record<string, unknown>): HomepageFaqItem[] {
  const source = metadata.items;
  if (!Array.isArray(source)) return [];
  const rows: HomepageFaqItem[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    rows.push({
      q: toStringValue(row.q),
      a: toStringValue(row.a),
      sortOrder: toNumber(row.sortOrder),
      isActive: typeof row.isActive === "boolean" ? row.isActive : true
    });
  }
  return rows;
}

function buildSnapshot(state: Omit<SectionState, "savedSnapshot">): string {
  return JSON.stringify({
    mode: state.mode,
    title: state.title.trim(),
    subtitle: state.subtitle.trim(),
    body: state.body.trim(),
    imageUrl: state.imageUrl.trim(),
    linkUrl: state.linkUrl.trim(),
    position: CMS_SECTION_CONFIG[state.key].position,
    heroSlides: state.heroSlides.map((item, index) => ({
      title: (item.title ?? "").trim(),
      subtitle: (item.subtitle ?? "").trim(),
      imageUrl: (item.imageUrl ?? "").trim(),
      linkUrl: (item.linkUrl ?? "").trim(),
      buttonText: (item.buttonText ?? "").trim(),
      objectPosition: (item.objectPosition ?? "").trim(),
      sortOrder: item.sortOrder ?? index,
      isActive: item.isActive !== false
    })),
    messageItems: state.messageItems.map((item, index) => ({
      text: item.text.trim(),
      sortOrder: item.sortOrder ?? index,
      isActive: item.isActive !== false
    })),
    doYouKnowCards: state.doYouKnowCards.map((item, index) => ({
      title: (item.title ?? "").trim(),
      body: (item.body ?? "").trim(),
      imageUrl: (item.imageUrl ?? "").trim(),
      linkUrl: (item.linkUrl ?? "").trim(),
      buttonText: (item.buttonText ?? "").trim(),
      postedAt: (item.postedAt ?? "").trim(),
      sortOrder: item.sortOrder ?? index,
      isActive: item.isActive !== false
    })),
    uspLabels: state.uspLabels.map((item, index) => ({
      label: item.label.trim(),
      sortOrder: item.sortOrder ?? index,
      isActive: item.isActive !== false
    })),
    faqItems: state.faqItems.map((item, index) => ({
      q: (item.q ?? "").trim(),
      a: (item.a ?? "").trim(),
      sortOrder: item.sortOrder ?? index,
      isActive: item.isActive !== false
    })),
    featuredMeta: {
      buttonText: state.featuredButtonText.trim(),
      eyebrow: state.featuredEyebrow.trim(),
      secondaryText: state.featuredSecondaryText.trim()
    }
  });
}

function toSectionState(section: AdminHomepageSection | null, key: SectionKey): SectionState {
  const metadata = cloneMetadata(section?.metadata ?? null);
  const featuredMeta =
    metadata.featuredCore && typeof metadata.featuredCore === "object"
      ? (metadata.featuredCore as Record<string, unknown>)
      : {};

  const draft: Omit<SectionState, "savedSnapshot"> = {
    key,
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    body: section?.body ?? "",
    imageUrl: section?.imageUrl ?? "",
    linkUrl: section?.linkUrl ?? "",
    mode: getSectionMode(section),
    metadata,
    heroSlides: parseHeroSlides(metadata),
    messageItems:
      key === "announcement" || key === "infinite_scrolling_banner" ? parseAnnouncementItems(metadata) : [],
    doYouKnowCards: parseDoYouKnowCards(metadata),
    uspLabels: parseUspLabels(metadata),
    faqItems: parseFaqItems(metadata),
    featuredButtonText: toStringValue(featuredMeta.buttonText),
    featuredEyebrow: toStringValue(featuredMeta.eyebrow),
    featuredSecondaryText: toStringValue(featuredMeta.secondaryText),
    createdAt: section?.createdAt ?? "",
    updatedAt: section?.updatedAt ?? "",
    isSaving: false,
    error: null,
    message: null
  };

  return { ...draft, savedSnapshot: buildSnapshot(draft) };
}

function hydrateWithDefaults(section: SectionState): SectionState {
  const next = { ...section, message: null, error: null };
  if (section.key === "hero" && next.heroSlides.length === 0) {
    next.heroSlides = HOMEPAGE_DEFAULT_HERO_SLIDES.map((item) => ({ ...item }));
  }
  if (section.key === "infinite_scrolling_banner" && next.messageItems.length === 0) {
    next.messageItems = HOMEPAGE_DEFAULT_SCROLLING_BANNER_ITEMS.map((item) => ({ ...item }));
  }
  if (section.key === "announcement" && next.messageItems.length === 0) {
    next.messageItems = HOMEPAGE_DEFAULT_ANNOUNCEMENTS.map((item) => ({ ...item }));
  }
  if (section.key === "do_you_know") {
    if (!next.title.trim()) next.title = HOMEPAGE_DEFAULT_DO_YOU_KNOW_TITLE;
    if (!next.subtitle.trim()) next.subtitle = HOMEPAGE_DEFAULT_DO_YOU_KNOW_SUBTITLE;
    if (next.doYouKnowCards.length === 0) {
      next.doYouKnowCards = HOMEPAGE_DEFAULT_DO_YOU_KNOW_CARDS.map((item) => ({ ...item }));
    }
  }
  if (section.key === "why_auraville") {
    if (!next.title.trim()) next.title = HOMEPAGE_DEFAULT_WHY_AURAVILLE.title;
    if (!next.subtitle.trim()) next.subtitle = HOMEPAGE_DEFAULT_WHY_AURAVILLE.eyebrow;
    if (!next.body.trim()) next.body = HOMEPAGE_DEFAULT_WHY_AURAVILLE.body;
    if (!next.imageUrl.trim()) next.imageUrl = HOMEPAGE_DEFAULT_WHY_AURAVILLE.imageUrl;
    if (!next.linkUrl.trim()) next.linkUrl = HOMEPAGE_DEFAULT_WHY_AURAVILLE.linkUrl;
  }
  if (section.key === "featured_core_product") {
    if (!next.title.trim()) next.title = HOMEPAGE_DEFAULT_FEATURED_CORE.title ?? "";
    if (!next.subtitle.trim()) next.subtitle = HOMEPAGE_DEFAULT_FEATURED_CORE.subtitle ?? "";
    if (!next.body.trim()) next.body = HOMEPAGE_DEFAULT_FEATURED_CORE.body ?? "";
    if (!next.imageUrl.trim()) next.imageUrl = HOMEPAGE_DEFAULT_FEATURED_CORE.imageUrl;
    if (!next.linkUrl.trim()) next.linkUrl = HOMEPAGE_DEFAULT_FEATURED_CORE.linkUrl;
    if (!next.featuredButtonText.trim()) next.featuredButtonText = HOMEPAGE_DEFAULT_FEATURED_CORE.buttonText ?? "";
    if (!next.featuredEyebrow.trim()) next.featuredEyebrow = HOMEPAGE_DEFAULT_FEATURED_CORE.eyebrow ?? "";
    if (!next.featuredSecondaryText.trim()) next.featuredSecondaryText = HOMEPAGE_DEFAULT_FEATURED_CORE.secondaryText ?? "";
  }
  if (section.key === "usp_features") {
    const normalizedDefaults = HOMEPAGE_DEFAULT_USP_LABELS.map((label) => label.trim().toLowerCase());
    const defaultSet = new Set(normalizedDefaults);
    const activeLabels = next.uspLabels
      .map((item) => item.label.trim().toLowerCase())
      .filter((label) => label.length > 0);
    const looksLikeLegacyDefaultSubset =
      activeLabels.length > 0 &&
      activeLabels.length < HOMEPAGE_DEFAULT_USP_LABELS.length &&
      activeLabels.every((label) => defaultSet.has(label));

    if (next.uspLabels.length === 0 || looksLikeLegacyDefaultSubset) {
      const byLabel = new Map(
        next.uspLabels.map((item) => [item.label.trim().toLowerCase(), item] as const)
      );
      next.uspLabels = HOMEPAGE_DEFAULT_USP_LABELS.map((label, index) => {
        const existing = byLabel.get(label.trim().toLowerCase());
        return {
          label,
          isActive: existing?.isActive ?? true,
          sortOrder: index
        };
      });
    }
  }
  if (section.key === "faq" && next.faqItems.length === 0) {
    next.faqItems = HOMEPAGE_DEFAULT_FAQ_ITEMS.map((item) => ({ ...item }));
  }
  return next;
}

function isDirty(section: SectionState): boolean {
  return buildSnapshot({ ...section, message: null, error: null }) !== section.savedSnapshot;
}

function formatDate(value: string): string {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items];
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= next.length || toIndex >= next.length) return next;
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function RowActions({
  onMoveUp,
  onMoveDown,
  onRemove
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={onMoveUp}>
        Move Up
      </Button>
      <Button type="button" variant="secondary" onClick={onMoveDown}>
        Move Down
      </Button>
      <Button type="button" variant="destructive" onClick={onRemove}>
        Remove
      </Button>
    </div>
  );
}

export function AdminHomepageClient() {
  const [sections, setSections] = useState<Record<SectionKey, SectionState>>({} as Record<SectionKey, SectionState>);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const orderedKeys = useMemo(
    () => [...sectionKeys].sort((a, b) => CMS_SECTION_CONFIG[a].position - CMS_SECTION_CONFIG[b].position),
    []
  );

  const loadHomepageSections = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const response = await commerceApi.admin.homepage.list<ListHomepageResponse>();
      const map = new Map(response.data.map((item) => [item.key, item]));
      const next = {} as Record<SectionKey, SectionState>;
      sectionKeys.forEach((key) => {
        next[key] = toSectionState((map.get(key) as AdminHomepageSection | null) ?? null, key);
      });
      setSections(next);
    } catch (error) {
      setListError(error instanceof ApiError ? error.message : "Unable to load homepage sections.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomepageSections();
  }, [loadHomepageSections]);

  function updateSection(key: SectionKey, updater: (current: SectionState) => SectionState) {
    setSections((current) => {
      const row = current[key];
      if (!row) return current;
      return { ...current, [key]: updater(row) };
    });
  }

  function setMode(key: SectionKey, mode: HomepageCmsDisplayMode) {
    updateSection(key, (section) => {
      if (section.mode === mode) return section;
      const changed = { ...section, mode, error: null, message: null };
      return mode === "custom" ? hydrateWithDefaults(changed) : changed;
    });
  }

  function validateSection(section: SectionState): string | null {
    if (section.imageUrl.trim() && !isRenderableCmsImageUrl(section.imageUrl)) {
      return "Image URL must be a valid local path or supported HTTPS URL.";
    }
    if (section.linkUrl.trim() && !isValidUrl(section.linkUrl.trim()) && !section.linkUrl.trim().startsWith("/")) {
      return "Link URL must be a valid URL or relative path.";
    }
    if (section.mode !== "custom") return null;

    if (section.key === "hero") {
      if (section.heroSlides.length === 0) return "Hero custom mode needs at least one slide.";
      const hasActive = section.heroSlides.some((slide) => slide.isActive !== false);
      if (!hasActive) return "At least one active hero slide is required.";
      const invalid = section.heroSlides.find(
        (slide) => slide.isActive !== false && !isRenderableCmsImageUrl(slide.imageUrl ?? "")
      );
      if (invalid) return "Each active hero slide needs a valid image URL.";
    }

    if (section.key === "infinite_scrolling_banner" || section.key === "announcement") {
      if (section.messageItems.length === 0) return "Add at least one message.";
      const hasActive = section.messageItems.some((item) => item.isActive !== false && item.text.trim().length > 0);
      if (!hasActive) return "At least one active message is required.";
    }

    if (section.key === "usp_features") {
      const hasActive = section.uspLabels.some((item) => item.isActive !== false && item.label.trim().length > 0);
      if (!hasActive) return "At least one active USP label is required.";
    }

    if (section.key === "faq") {
      const invalid = section.faqItems.find((item) => item.isActive !== false && (!item.q?.trim() || !item.a?.trim()));
      if (invalid) return "Each active FAQ row needs both question and answer.";
    }

    return null;
  }

  async function onSaveSection(key: SectionKey) {
    const current = sections[key];
    if (!current) return;
    if (!isDirty(current)) {
      updateSection(key, (section) => ({ ...section, message: "No changes to save.", error: null }));
      return;
    }

    const validationError = validateSection(current);
    if (validationError) {
      updateSection(key, (section) => ({ ...section, error: validationError, message: null }));
      return;
    }

    const metadata = { ...current.metadata, displayMode: current.mode } as Record<string, unknown>;

    if (key === "hero") {
      metadata.slides = current.heroSlides.map((slide, index) => ({
        title: slide.title?.trim() || null,
        subtitle: slide.subtitle?.trim() || null,
        imageUrl: slide.imageUrl?.trim() || "",
        linkUrl: slide.linkUrl?.trim() || null,
        buttonText: slide.buttonText?.trim() || null,
        objectPosition: slide.objectPosition?.trim() || "50% 50%",
        sortOrder: index,
        isActive: slide.isActive !== false
      }));
    }

    if (key === "infinite_scrolling_banner" || key === "announcement") {
      metadata.items = current.messageItems.map((item, index) => ({
        text: item.text.trim(),
        sortOrder: index,
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
        sortOrder: index,
        isActive: card.isActive !== false
      }));
    }

    if (key === "usp_features") {
      metadata.labels = current.uspLabels.map((item, index) => ({
        label: item.label.trim(),
        sortOrder: index,
        isActive: item.isActive !== false
      }));
    }

    if (key === "faq") {
      metadata.items = current.faqItems.map((item, index) => ({
        q: item.q?.trim() || "",
        a: item.a?.trim() || "",
        sortOrder: index,
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
      isActive: current.mode !== "hidden",
      position: CMS_SECTION_CONFIG[key].position
    };

    if (current.imageUrl.trim()) payload.imageUrl = current.imageUrl.trim();
    if (current.linkUrl.trim()) payload.linkUrl = current.linkUrl.trim();

    updateSection(key, (section) => ({ ...section, isSaving: true, message: null, error: null }));

    try {
      const response = await commerceApi.admin.homepage.update<PatchHomepageResponse, typeof payload>(key, payload);
      const saved = toSectionState(response.data, key);
      updateSection(key, () => ({ ...saved, message: "Saved", error: null }));
    } catch (error) {
      updateSection(key, (section) => ({
        ...section,
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
            Manage only content-driven homepage sections. Header, Our Products, Best Sellers, Reviews cards/data, and Footer are system-driven.
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
            const config = CMS_SECTION_CONFIG[key];
            const dirty = isDirty(section);

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 md:p-5" key={key}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{config.title}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">{config.description}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Storefront location: {config.storefrontLocation} | Position: {config.position}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Key: {key} | Created: {formatDate(section.createdAt)} | Updated: {formatDate(section.updatedAt)}
                    </p>
                  </div>
                  <Button type="button" disabled={!dirty || section.isSaving} onClick={() => void onSaveSection(key)}>
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
                    <Select
                      className="mt-2"
                      value={section.mode}
                      onChange={(event) => setMode(key, event.target.value as HomepageCmsDisplayMode)}
                    >
                      <option value="custom">Custom</option>
                      <option value="default">Default</option>
                      <option value="hidden">Hidden</option>
                    </Select>
                    <p className="mt-2 text-xs text-[var(--muted)]">{modeHelpText[section.mode]}</p>
                  </label>
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)]/35 p-3">
                    <p className="text-sm font-semibold">Position</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Position is fixed to match storefront order for reliable rendering.
                    </p>
                    <p className="mt-2 text-sm font-semibold">{config.position}</p>
                  </div>
                </div>

                {section.mode !== "custom" ? (
                  <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--muted)]">
                    {section.mode === "default"
                      ? "This section uses built-in storefront defaults. Switch to Custom to edit content."
                      : "This section is hidden from homepage."}
                  </div>
                ) : (
                  <div className="mt-5 space-y-4 border-t border-[var(--line)] pt-4">
                    {(key === "hero" || key === "do_you_know" || key === "why_auraville" || key === "featured_core_product" || key === "faq") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Title</span>
                        <Input
                          className="mt-2"
                          value={section.title}
                          onChange={(event) => updateSection(key, (state) => ({ ...state, title: event.target.value, message: null, error: null }))}
                        />
                      </label>
                    ) : null}

                    {(key === "do_you_know" || key === "why_auraville" || key === "featured_core_product") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Subtitle</span>
                        <Input
                          className="mt-2"
                          value={section.subtitle}
                          onChange={(event) => updateSection(key, (state) => ({ ...state, subtitle: event.target.value, message: null, error: null }))}
                        />
                      </label>
                    ) : null}

                    {(key === "why_auraville" || key === "featured_core_product") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Body</span>
                        <Textarea
                          className="mt-2 min-h-20"
                          value={section.body}
                          onChange={(event) => updateSection(key, (state) => ({ ...state, body: event.target.value, message: null, error: null }))}
                        />
                      </label>
                    ) : null}

                    {(key === "hero" || key === "why_auraville" || key === "featured_core_product") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Image URL</span>
                        <Input
                          className="mt-2"
                          placeholder="https://... or /images/..."
                          value={section.imageUrl}
                          onChange={(event) => updateSection(key, (state) => ({ ...state, imageUrl: event.target.value, message: null, error: null }))}
                        />
                        <p className="mt-1 text-xs text-[var(--muted)]">{IMAGE_URL_HELPER}</p>
                        {key === "hero" ? <p className="mt-1 text-xs text-[var(--muted)]">{HERO_IMAGE_SIZE_HELPER}</p> : null}
                      </label>
                    ) : null}

                    {(key === "hero" || key === "why_auraville" || key === "featured_core_product") ? (
                      <label className="block">
                        <span className="text-sm font-semibold">Link URL</span>
                        <Input
                          className="mt-2"
                          placeholder="/products or https://..."
                          value={section.linkUrl}
                          onChange={(event) => updateSection(key, (state) => ({ ...state, linkUrl: event.target.value, message: null, error: null }))}
                        />
                        <p className="mt-1 text-xs text-[var(--muted)]">{LINK_URL_HELPER}</p>
                      </label>
                    ) : null}

                    {key === "hero" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">Hero Slides</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">These slides replace the default hero slideshow when Custom mode is active.</p>
                        <div className="mt-3 space-y-3">
                          {section.heroSlides.map((slide, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`hero-${index}`}>
                              <p className="mb-2 text-xs font-semibold text-[var(--muted)]">Slide {index + 1}</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Internal title / label"
                                  value={slide.title ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.heroSlides];
                                      rows[index] = { ...rows[index], title: event.target.value };
                                      return { ...state, heroSlides: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Image URL"
                                  value={slide.imageUrl ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.heroSlides];
                                      rows[index] = { ...rows[index], imageUrl: event.target.value };
                                      return { ...state, heroSlides: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Link URL"
                                  value={slide.linkUrl ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.heroSlides];
                                      rows[index] = { ...rows[index], linkUrl: event.target.value };
                                      return { ...state, heroSlides: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Button text (optional)"
                                  value={slide.buttonText ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.heroSlides];
                                      rows[index] = { ...rows[index], buttonText: event.target.value };
                                      return { ...state, heroSlides: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <label className="inline-flex items-center gap-2 text-sm">
                                  <input
                                    checked={slide.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateSection(key, (state) => {
                                        const rows = [...state.heroSlides];
                                        rows[index] = { ...rows[index], isActive: event.target.checked };
                                        return { ...state, heroSlides: rows, message: null, error: null };
                                      })
                                    }
                                  />
                                  Active
                                </label>
                              </div>
                              <RowActions
                                onMoveUp={() => updateSection(key, (state) => ({ ...state, heroSlides: moveItem(state.heroSlides, index, index - 1), message: null, error: null }))}
                                onMoveDown={() => updateSection(key, (state) => ({ ...state, heroSlides: moveItem(state.heroSlides, index, index + 1), message: null, error: null }))}
                                onRemove={() => updateSection(key, (state) => ({ ...state, heroSlides: state.heroSlides.filter((_, rowIndex) => rowIndex !== index), message: null, error: null }))}
                              />
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
                              heroSlides: [...state.heroSlides, { title: "", subtitle: "", imageUrl: "", linkUrl: "", buttonText: "", isActive: true }],
                              message: null,
                              error: null
                            }))
                          }
                        >
                          Add Slide
                        </Button>
                      </div>
                    ) : null}

                    {(key === "infinite_scrolling_banner" || key === "announcement") ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">{key === "infinite_scrolling_banner" ? "Scrolling Banner Items" : "Announcement Messages"}</p>
                        <div className="mt-3 space-y-3">
                          {section.messageItems.map((item, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`${key}-msg-${index}`}>
                              <Input
                                placeholder="Message text"
                                value={item.text}
                                onChange={(event) =>
                                  updateSection(key, (state) => {
                                    const rows = [...state.messageItems];
                                    rows[index] = { ...rows[index], text: event.target.value };
                                    return { ...state, messageItems: rows, message: null, error: null };
                                  })
                                }
                              />
                              <div className="mt-3">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={item.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateSection(key, (state) => {
                                        const rows = [...state.messageItems];
                                        rows[index] = { ...rows[index], isActive: event.target.checked };
                                        return { ...state, messageItems: rows, message: null, error: null };
                                      })
                                    }
                                  />
                                  Active
                                </label>
                              </div>
                              <RowActions
                                onMoveUp={() => updateSection(key, (state) => ({ ...state, messageItems: moveItem(state.messageItems, index, index - 1), message: null, error: null }))}
                                onMoveDown={() => updateSection(key, (state) => ({ ...state, messageItems: moveItem(state.messageItems, index, index + 1), message: null, error: null }))}
                                onRemove={() => updateSection(key, (state) => ({ ...state, messageItems: state.messageItems.filter((_, rowIndex) => rowIndex !== index), message: null, error: null }))}
                              />
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
                              messageItems: [...state.messageItems, { text: "", isActive: true }],
                              message: null,
                              error: null
                            }))
                          }
                        >
                          Add Item
                        </Button>
                      </div>
                    ) : null}

                    {key === "usp_features" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">USP Labels</p>
                        <div className="mt-3 space-y-3">
                          {section.uspLabels.map((item, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`usp-${index}`}>
                              <Input
                                value={item.label}
                                onChange={(event) =>
                                  updateSection(key, (state) => {
                                    const rows = [...state.uspLabels];
                                    rows[index] = { ...rows[index], label: event.target.value };
                                    return { ...state, uspLabels: rows, message: null, error: null };
                                  })
                                }
                              />
                              <div className="mt-3">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={item.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateSection(key, (state) => {
                                        const rows = [...state.uspLabels];
                                        rows[index] = { ...rows[index], isActive: event.target.checked };
                                        return { ...state, uspLabels: rows, message: null, error: null };
                                      })
                                    }
                                  />
                                  Active
                                </label>
                              </div>
                              <RowActions
                                onMoveUp={() => updateSection(key, (state) => ({ ...state, uspLabels: moveItem(state.uspLabels, index, index - 1), message: null, error: null }))}
                                onMoveDown={() => updateSection(key, (state) => ({ ...state, uspLabels: moveItem(state.uspLabels, index, index + 1), message: null, error: null }))}
                                onRemove={() => updateSection(key, (state) => ({ ...state, uspLabels: state.uspLabels.filter((_, rowIndex) => rowIndex !== index), message: null, error: null }))}
                              />
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
                              uspLabels: [...state.uspLabels, { label: "", isActive: true, sortOrder: state.uspLabels.length }],
                              message: null,
                              error: null
                            }))
                          }
                        >
                          Add Label
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
                            onChange={(event) => updateSection(key, (state) => ({ ...state, featuredEyebrow: event.target.value, message: null, error: null }))}
                          />
                        </label>
                        <label>
                          <span className="text-sm font-semibold">Button Text</span>
                          <Input
                            className="mt-2"
                            value={section.featuredButtonText}
                            onChange={(event) => updateSection(key, (state) => ({ ...state, featuredButtonText: event.target.value, message: null, error: null }))}
                          />
                        </label>
                        <label className="sm:col-span-2">
                          <span className="text-sm font-semibold">Secondary Text</span>
                          <Input
                            className="mt-2"
                            value={section.featuredSecondaryText}
                            onChange={(event) => updateSection(key, (state) => ({ ...state, featuredSecondaryText: event.target.value, message: null, error: null }))}
                          />
                        </label>
                      </div>
                    ) : null}

                    {key === "why_auraville" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)]/35 p-3 text-xs text-[var(--muted)]">
                        Supporting decorative mini-tiles use default design and are not edited here.
                      </div>
                    ) : null}

                    {key === "do_you_know" ? (
                      <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                        <p className="text-sm font-semibold">Do You Know Cards</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">Instagram thumbnails cannot always be fetched reliably. Upload/paste image URL separately.</p>
                        <div className="mt-3 space-y-3">
                          {section.doYouKnowCards.map((card, index) => (
                            <div className="rounded-lg border border-[var(--line)] bg-white p-3" key={`dyk-${index}`}>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  placeholder="Title"
                                  value={card.title}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.doYouKnowCards];
                                      rows[index] = { ...rows[index], title: event.target.value };
                                      return { ...state, doYouKnowCards: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Image URL"
                                  value={card.imageUrl ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.doYouKnowCards];
                                      rows[index] = { ...rows[index], imageUrl: event.target.value };
                                      return { ...state, doYouKnowCards: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Link URL"
                                  value={card.linkUrl ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.doYouKnowCards];
                                      rows[index] = { ...rows[index], linkUrl: event.target.value };
                                      return { ...state, doYouKnowCards: rows, message: null, error: null };
                                    })
                                  }
                                />
                                <Input
                                  placeholder="Button text"
                                  value={card.buttonText ?? ""}
                                  onChange={(event) =>
                                    updateSection(key, (state) => {
                                      const rows = [...state.doYouKnowCards];
                                      rows[index] = { ...rows[index], buttonText: event.target.value };
                                      return { ...state, doYouKnowCards: rows, message: null, error: null };
                                    })
                                  }
                                />
                              </div>
                              <Textarea
                                className="mt-2 min-h-16"
                                placeholder="Card excerpt"
                                value={card.body}
                                onChange={(event) =>
                                  updateSection(key, (state) => {
                                    const rows = [...state.doYouKnowCards];
                                    rows[index] = { ...rows[index], body: event.target.value };
                                    return { ...state, doYouKnowCards: rows, message: null, error: null };
                                  })
                                }
                              />
                              <div className="mt-3">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={card.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateSection(key, (state) => {
                                        const rows = [...state.doYouKnowCards];
                                        rows[index] = { ...rows[index], isActive: event.target.checked };
                                        return { ...state, doYouKnowCards: rows, message: null, error: null };
                                      })
                                    }
                                  />
                                  Active
                                </label>
                              </div>
                              <RowActions
                                onMoveUp={() => updateSection(key, (state) => ({ ...state, doYouKnowCards: moveItem(state.doYouKnowCards, index, index - 1), message: null, error: null }))}
                                onMoveDown={() => updateSection(key, (state) => ({ ...state, doYouKnowCards: moveItem(state.doYouKnowCards, index, index + 1), message: null, error: null }))}
                                onRemove={() => updateSection(key, (state) => ({ ...state, doYouKnowCards: state.doYouKnowCards.filter((_, rowIndex) => rowIndex !== index), message: null, error: null }))}
                              />
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
                              doYouKnowCards: [...state.doYouKnowCards, { title: "", body: "", imageUrl: "", linkUrl: "", buttonText: "View post", isActive: true }],
                              message: null,
                              error: null
                            }))
                          }
                        >
                          Add Card
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
                                  updateSection(key, (state) => {
                                    const rows = [...state.faqItems];
                                    rows[index] = { ...rows[index], q: event.target.value };
                                    return { ...state, faqItems: rows, message: null, error: null };
                                  })
                                }
                              />
                              <Textarea
                                className="mt-2 min-h-16"
                                placeholder="Answer"
                                value={item.a}
                                onChange={(event) =>
                                  updateSection(key, (state) => {
                                    const rows = [...state.faqItems];
                                    rows[index] = { ...rows[index], a: event.target.value };
                                    return { ...state, faqItems: rows, message: null, error: null };
                                  })
                                }
                              />
                              <div className="mt-3">
                                <label className="inline-flex items-center gap-2 rounded border border-[var(--line)] px-3 py-2 text-sm">
                                  <input
                                    checked={item.isActive !== false}
                                    type="checkbox"
                                    onChange={(event) =>
                                      updateSection(key, (state) => {
                                        const rows = [...state.faqItems];
                                        rows[index] = { ...rows[index], isActive: event.target.checked };
                                        return { ...state, faqItems: rows, message: null, error: null };
                                      })
                                    }
                                  />
                                  Active
                                </label>
                              </div>
                              <RowActions
                                onMoveUp={() => updateSection(key, (state) => ({ ...state, faqItems: moveItem(state.faqItems, index, index - 1), message: null, error: null }))}
                                onMoveDown={() => updateSection(key, (state) => ({ ...state, faqItems: moveItem(state.faqItems, index, index + 1), message: null, error: null }))}
                                onRemove={() => updateSection(key, (state) => ({ ...state, faqItems: state.faqItems.filter((_, rowIndex) => rowIndex !== index), message: null, error: null }))}
                              />
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
                              message: null,
                              error: null
                            }))
                          }
                        >
                          Add FAQ
                        </Button>
                      </div>
                    ) : null}
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
