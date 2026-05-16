"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

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

type SectionDisplayMode = "custom" | "default" | "hidden";
type SectionKey =
  | "hero"
  | "announcement"
  | "usp_features"
  | "reviews"
  | "why_auraville"
  | "do_you_know"
  | "faq"
  | "featured_core_product"
  | "footer";

type SectionField = "title" | "subtitle" | "body" | "imageUrl" | "linkUrl" | "position";

type HeroSlide = {
  imageUrl: string;
  title: string;
  subtitle: string;
  linkUrl: string;
  buttonText: string;
  active: boolean;
};

type AnnouncementItem = { text: string; active: boolean };
type DoYouKnowCard = {
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  buttonText: string;
  active: boolean;
};
type FaqItem = { q: string; a: string; active: boolean };
type UspLabel = { label: string; active: boolean };
type FeaturedCoreMeta = {
  eyebrow: string;
  buttonText: string;
  secondaryText: string;
  subtitle: string;
};

type SectionFormState = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  displayMode: SectionDisplayMode;
  position: string;
  createdAt: string;
  updatedAt: string;
  exists: boolean;
  isSaving: boolean;
  error: string | null;
  message: string | null;
  metadataBase: Record<string, unknown>;
  heroSlides: HeroSlide[];
  announcementItems: AnnouncementItem[];
  doYouKnowCards: DoYouKnowCard[];
  uspLabels: UspLabel[];
  faqItems: FaqItem[];
  featuredCoreMeta: FeaturedCoreMeta;
};

const sectionOrder: SectionKey[] = [
  "hero",
  "announcement",
  "usp_features",
  "reviews",
  "why_auraville",
  "do_you_know",
  "faq",
  "featured_core_product",
  "footer"
];

const sectionConfig: Record<
  SectionKey,
  { purpose: string; storefrontLocation: string; controlsSummary: string; fields: SectionField[] }
> = {
  hero: {
    purpose: "Top visual section on homepage.",
    storefrontLocation: "Homepage top (first section).",
    controlsSummary: "Controls custom hero slideshow slides.",
    fields: ["position"]
  },
  announcement: {
    purpose: "Short trust/promotional strip messages.",
    storefrontLocation: "Below featured products.",
    controlsSummary: "Controls scrolling announcement messages.",
    fields: ["body", "position"]
  },
  usp_features: {
    purpose: "Feature badges/benefits section.",
    storefrontLocation: "Near top below hero/banner.",
    controlsSummary: "Controls heading and USP labels.",
    fields: ["title", "position"]
  },
  reviews: {
    purpose: "Customer reviews section heading.",
    storefrontLocation: "Reviews slider heading area.",
    controlsSummary: "Controls heading/subheading only. Review cards remain review-driven.",
    fields: ["title", "subtitle", "position"]
  },
  why_auraville: {
    purpose: "Brand story section.",
    storefrontLocation: "Mid-lower homepage story block.",
    controlsSummary: "Controls story text and primary image/link. Supporting mini-tiles remain default-only.",
    fields: ["title", "subtitle", "body", "imageUrl", "linkUrl", "position"]
  },
  do_you_know: {
    purpose: "Educational carousel block.",
    storefrontLocation: "Lower homepage content area.",
    controlsSummary: "Controls heading/subheading and card list with optional links/images.",
    fields: ["title", "subtitle", "position"]
  },
  faq: {
    purpose: "Homepage FAQ block.",
    storefrontLocation: "Lower homepage FAQ.",
    controlsSummary: "Controls FAQ heading and Q/A list.",
    fields: ["title", "position"]
  },
  featured_core_product: {
    purpose: "Highlighted promotional product/story section.",
    storefrontLocation: "Between Best Sellers and Reviews.",
    controlsSummary: "Controls title/subtitle/body/image/link and CTA metadata.",
    fields: ["title", "subtitle", "body", "imageUrl", "linkUrl", "position"]
  },
  footer: {
    purpose: "Footer brand blurb.",
    storefrontLocation: "Global footer text.",
    controlsSummary: "Controls only footer body/brand description text.",
    fields: ["body", "position"]
  }
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
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asBoolean(value: unknown, fallback = true): boolean {
  return typeof value === "boolean" ? value : fallback;
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
  if (!isValidUrl(value)) return false;
  const parsed = new URL(value);
  const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
  return !blockedHosts.has(parsed.hostname.toLowerCase());
}

function readDisplayMode(metadata: Record<string, unknown> | null, isActive: boolean): SectionDisplayMode {
  const candidate = metadata?.displayMode;
  if (candidate === "custom" || candidate === "default" || candidate === "hidden") return candidate;
  return isActive ? "custom" : "hidden";
}

function metadataWithoutDisplayMode(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const next = { ...metadata };
  delete next.displayMode;
  return next;
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(index, 1);
  if (!item) return items;
  next.splice(target, 0, item);
  return next;
}

function parseHeroSlides(metadata: Record<string, unknown>): HeroSlide[] {
  const raw = metadata.slides;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const value = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        imageUrl: asString(value.imageUrl),
        title: asString(value.title),
        subtitle: asString(value.subtitle),
        linkUrl: asString(value.linkUrl),
        buttonText: asString(value.buttonText),
        active: asBoolean(value.active, true)
      };
    })
    .filter((slide) => slide.imageUrl.trim().length > 0 || slide.title.trim().length > 0);
}

function parseAnnouncementItems(metadata: Record<string, unknown>): AnnouncementItem[] {
  const raw = metadata.items;
  if (!Array.isArray(raw)) return [];
  if (raw.every((item) => typeof item === "string")) {
    return raw
      .map((item) => ({ text: String(item).trim(), active: true }))
      .filter((item) => item.text.length > 0);
  }
  return raw
    .map((item) => {
      const value = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return { text: asString(value.text).trim(), active: asBoolean(value.active, true) };
    })
    .filter((item) => item.text.length > 0);
}

function parseDoYouKnowCards(metadata: Record<string, unknown>): DoYouKnowCard[] {
  const raw = metadata.cards;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const value = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return {
        title: asString(value.title),
        body: asString(value.body || value.excerpt),
        imageUrl: asString(value.imageUrl),
        linkUrl: asString(value.linkUrl),
        buttonText: asString(value.buttonText),
        active: asBoolean(value.active, true)
      };
    })
    .filter((item) => item.title.trim().length > 0 || item.body.trim().length > 0);
}

function parseUspLabels(metadata: Record<string, unknown>): UspLabel[] {
  const raw = metadata.labels;
  if (!Array.isArray(raw)) return [];
  if (raw.every((item) => typeof item === "string")) {
    return raw
      .map((item) => ({ label: String(item).trim(), active: true }))
      .filter((item) => item.label.length > 0);
  }
  return raw
    .map((item) => {
      const value = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const label = asString(value.label || value.text).trim();
      return { label, active: asBoolean(value.active, true) };
    })
    .filter((item) => item.label.length > 0);
}

function parseFaqItems(metadata: Record<string, unknown>): FaqItem[] {
  const raw = metadata.items;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const value = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      return { q: asString(value.q), a: asString(value.a), active: asBoolean(value.active, true) };
    })
    .filter((item) => item.q.trim().length > 0 || item.a.trim().length > 0);
}

function parseFeaturedCoreMeta(metadata: Record<string, unknown>): FeaturedCoreMeta {
  return {
    eyebrow: asString(metadata.eyebrow),
    buttonText: asString(metadata.buttonText),
    secondaryText: asString(metadata.secondaryText),
    subtitle: asString(metadata.subtitle)
  };
}

function toFormState(section: AdminHomepageSection | null, fallbackPosition: number): SectionFormState {
  const metadata = metadataWithoutDisplayMode(section?.metadata ?? null);
  return {
    key: section?.key ?? "",
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    body: section?.body ?? "",
    imageUrl: section?.imageUrl ?? "",
    linkUrl: section?.linkUrl ?? "",
    displayMode: readDisplayMode(section?.metadata ?? null, section?.isActive ?? true),
    position: String(section?.position ?? fallbackPosition),
    createdAt: section?.createdAt ?? "",
    updatedAt: section?.updatedAt ?? "",
    exists: Boolean(section),
    isSaving: false,
    error: null,
    message: null,
    metadataBase: metadata,
    heroSlides: parseHeroSlides(metadata),
    announcementItems: parseAnnouncementItems(metadata),
    doYouKnowCards: parseDoYouKnowCards(metadata),
    uspLabels: parseUspLabels(metadata),
    faqItems: parseFaqItems(metadata),
    featuredCoreMeta: parseFeaturedCoreMeta(metadata)
  };
}

function omitKeys(source: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const next = { ...source };
  keys.forEach((key) => delete next[key]);
  return next;
}

function buildSectionMetadata(sectionKey: SectionKey, section: SectionFormState): Record<string, unknown> {
  const base = section.metadataBase;
  if (sectionKey === "hero") {
    const cleaned = omitKeys(base, ["slides"]);
    cleaned.slides = section.heroSlides.map((slide, index) => ({
      imageUrl: slide.imageUrl.trim(),
      title: slide.title.trim() || null,
      subtitle: slide.subtitle.trim() || null,
      linkUrl: slide.linkUrl.trim() || null,
      buttonText: slide.buttonText.trim() || null,
      active: slide.active,
      sortOrder: index
    }));
    return cleaned;
  }
  if (sectionKey === "announcement") {
    const cleaned = omitKeys(base, ["items"]);
    cleaned.items = section.announcementItems.map((item, index) => ({
      text: item.text.trim(),
      active: item.active,
      sortOrder: index
    }));
    return cleaned;
  }
  if (sectionKey === "do_you_know") {
    const cleaned = omitKeys(base, ["cards"]);
    cleaned.cards = section.doYouKnowCards.map((item, index) => ({
      title: item.title.trim(),
      body: item.body.trim(),
      imageUrl: item.imageUrl.trim() || null,
      linkUrl: item.linkUrl.trim() || null,
      buttonText: item.buttonText.trim() || null,
      active: item.active,
      sortOrder: index
    }));
    return cleaned;
  }
  if (sectionKey === "usp_features") {
    const cleaned = omitKeys(base, ["labels"]);
    cleaned.labels = section.uspLabels
      .map((item, index) => ({
        label: item.label.trim(),
        active: item.active,
        sortOrder: index
      }))
      .filter((item) => item.label.length > 0);
    return cleaned;
  }
  if (sectionKey === "faq") {
    const cleaned = omitKeys(base, ["items"]);
    cleaned.items = section.faqItems.map((item, index) => ({
      q: item.q.trim(),
      a: item.a.trim(),
      active: item.active,
      sortOrder: index
    }));
    return cleaned;
  }
  if (sectionKey === "featured_core_product") {
    const cleaned = omitKeys(base, ["eyebrow", "buttonText", "secondaryText", "subtitle"]);
    if (section.featuredCoreMeta.eyebrow.trim()) cleaned.eyebrow = section.featuredCoreMeta.eyebrow.trim();
    if (section.featuredCoreMeta.buttonText.trim()) cleaned.buttonText = section.featuredCoreMeta.buttonText.trim();
    if (section.featuredCoreMeta.secondaryText.trim()) cleaned.secondaryText = section.featuredCoreMeta.secondaryText.trim();
    if (section.featuredCoreMeta.subtitle.trim()) cleaned.subtitle = section.featuredCoreMeta.subtitle.trim();
    return cleaned;
  }
  return base;
}

function modeDescription(mode: SectionDisplayMode): string {
  if (mode === "custom") return "Using admin-managed content.";
  if (mode === "default") return "Using built-in storefront defaults.";
  return "Section hidden from homepage.";
}

function modeBadgeClass(mode: SectionDisplayMode): string {
  if (mode === "custom") return "bg-[var(--mint)] text-[var(--leaf-deep)]";
  if (mode === "default") return "bg-[#fff8ed] text-[#8a5b1d]";
  return "bg-[#fff3f2] text-[var(--coral)]";
}

function sectionWarning(key: SectionKey, section: SectionFormState): string | null {
  if (section.displayMode !== "custom") return null;
  if (key === "hero") {
    const valid = section.heroSlides.filter(
      (slide) => slide.active && slide.imageUrl.trim().length > 0 && isRenderableCmsImageUrl(slide.imageUrl.trim())
    );
    if (valid.length === 0) return "No valid active hero slides found. Storefront will fall back to default slideshow.";
  }
  if (key === "announcement") {
    if (section.announcementItems.filter((item) => item.active && item.text.trim().length > 0).length === 0) {
      return "No active announcement messages found. Storefront will use built-in defaults.";
    }
  }
  if (key === "do_you_know") {
    if (
      section.doYouKnowCards.filter((item) => item.active && item.title.trim().length > 0 && item.body.trim().length > 0)
        .length === 0
    ) {
      return "No active Do You Know cards with title and body. Storefront will use default cards.";
    }
  }
  if (key === "usp_features") {
    if (section.uspLabels.filter((item) => item.active && item.label.trim().length > 0).length === 0) {
      return "No USP labels entered. Storefront will use default benefit labels.";
    }
  }
  if (key === "faq") {
    if (section.faqItems.filter((item) => item.active && item.q.trim().length > 0 && item.a.trim().length > 0).length === 0) {
      return "No valid FAQ items found. Storefront will use default FAQs.";
    }
  }
  return null;
}

function SectionRepeaterControls(props: { onUp: () => void; onDown: () => void; onRemove: () => void; disableUp: boolean; disableDown: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={props.onUp} disabled={props.disableUp}>
        Up
      </Button>
      <Button type="button" variant="ghost" className="min-h-8 px-2 py-1 text-xs" onClick={props.onDown} disabled={props.disableDown}>
        Down
      </Button>
      <Button type="button" variant="destructive" className="min-h-8 px-2 py-1 text-xs" onClick={props.onRemove}>
        Remove
      </Button>
    </div>
  );
}

export function AdminHomepageClient() {
  const [sections, setSections] = useState<Record<string, SectionFormState>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const orderedKeys = useMemo(
    () =>
      [...sectionOrder].sort((left, right) => {
        const leftPos = Number(sections[left]?.position ?? 0);
        const rightPos = Number(sections[right]?.position ?? 0);
        return leftPos - rightPos;
      }),
    [sections]
  );

  const loadHomepageSections = useCallback(async () => {
    setIsLoading(true);
    setListError(null);
    try {
      const response = await commerceApi.admin.homepage.list<ListHomepageResponse>();
      const byKey = new Map(response.data.map((section) => [section.key, section]));
      const nextState: Record<string, SectionFormState> = {};
      sectionOrder.forEach((key, index) => {
        nextState[key] = toFormState(byKey.get(key) ?? null, index);
      });
      setSections(nextState);
    } catch (error) {
      if (error instanceof ApiError) setListError(error.message);
      else setListError("Unable to load homepage sections.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHomepageSections();
  }, [loadHomepageSections]);

  function updateSection(key: SectionKey, updater: (state: SectionFormState) => SectionFormState) {
    setSections((current) => {
      const existing = current[key];
      if (!existing) return current;
      return { ...current, [key]: updater(existing) };
    });
  }

  async function onSaveSection(key: SectionKey) {
    const current = sections[key];
    if (!current) return;
    const positionValue = Number(current.position);
    if (!Number.isInteger(positionValue) || positionValue < 0) {
      updateSection(key, (state) => ({ ...state, error: "Position must be a non-negative integer.", message: null }));
      return;
    }
    const imageUrl = current.imageUrl.trim();
    if (imageUrl && !isValidUrl(imageUrl)) {
      updateSection(key, (state) => ({ ...state, error: "Image URL must be valid.", message: null }));
      return;
    }
    const linkUrl = current.linkUrl.trim();
    if (linkUrl && !isValidUrl(linkUrl)) {
      updateSection(key, (state) => ({ ...state, error: "Link URL must be valid.", message: null }));
      return;
    }

    if (key === "faq") {
      const hasIncompleteActiveFaq = current.faqItems.some(
        (item) => item.active && (!item.q.trim() || !item.a.trim())
      );
      if (hasIncompleteActiveFaq) {
        updateSection(key, (state) => ({
          ...state,
          error: "Each active FAQ must include both question and answer.",
          message: null
        }));
        return;
      }
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
      metadata: { ...buildSectionMetadata(key, current), displayMode: current.displayMode },
      isActive: current.displayMode !== "hidden",
      position: positionValue
    };
    if (imageUrl) payload.imageUrl = imageUrl;
    if (linkUrl) payload.linkUrl = linkUrl;

    updateSection(key, (state) => ({ ...state, isSaving: true, error: null, message: null }));
    try {
      const response = await commerceApi.admin.homepage.update<PatchHomepageResponse, typeof payload>(key, payload);
      updateSection(key, (state) => ({
        ...state,
        ...toFormState(response.data, response.data.position),
        isSaving: false,
        message: state.exists ? "Section updated." : "Section created.",
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

  function showField(key: SectionKey, field: SectionField): boolean {
    return sectionConfig[key].fields.includes(field);
  }

  function renderSectionMetaEditor(key: SectionKey, section: SectionFormState) {
    if (key === "hero") {
      return (
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Hero Slides</p>
            <Button
              type="button"
              variant="utility"
              className="min-h-9 px-3 py-2 text-xs"
              onClick={() =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  heroSlides: [...state.heroSlides, { imageUrl: "", title: "", subtitle: "", linkUrl: "", buttonText: "", active: true }]
                }))
              }
            >
              Add Slide
            </Button>
          </div>
          {section.heroSlides.length === 0 ? (
            <p className="rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-xs text-[var(--muted)]">
              No custom slides yet. Add slides for Custom mode.
            </p>
          ) : null}
          {section.heroSlides.map((slide, index) => (
            <div className="rounded-lg border border-[var(--line)] p-3" key={`hero-${index}`}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Slide {index + 1}</p>
                <SectionRepeaterControls
                  onUp={() => updateSection(key, (s) => ({ ...s, message: null, heroSlides: moveItem(s.heroSlides, index, -1) }))}
                  onDown={() => updateSection(key, (s) => ({ ...s, message: null, heroSlides: moveItem(s.heroSlides, index, 1) }))}
                  onRemove={() => updateSection(key, (s) => ({ ...s, message: null, heroSlides: s.heroSlides.filter((_, i) => i !== index) }))}
                  disableUp={index === 0}
                  disableDown={index === section.heroSlides.length - 1}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold">Image URL</span>
                  <Input
                    className="mt-1"
                    value={slide.imageUrl}
                    placeholder="https://..."
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        heroSlides: state.heroSlides.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, imageUrl: event.target.value } : item
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Title (optional)</span>
                  <Input
                    className="mt-1"
                    value={slide.title}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        heroSlides: state.heroSlides.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, title: event.target.value } : item
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Subtitle (optional)</span>
                  <Input
                    className="mt-1"
                    value={slide.subtitle}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        heroSlides: state.heroSlides.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, subtitle: event.target.value } : item
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Link URL (optional)</span>
                  <Input
                    className="mt-1"
                    value={slide.linkUrl}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        heroSlides: state.heroSlides.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, linkUrl: event.target.value } : item
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Button text (optional)</span>
                  <Input
                    className="mt-1"
                    value={slide.buttonText}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        heroSlides: state.heroSlides.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, buttonText: event.target.value } : item
                        )
                      }))
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <input
                    checked={slide.active}
                    type="checkbox"
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        heroSlides: state.heroSlides.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, active: event.target.checked } : item
                        )
                      }))
                    }
                  />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (key === "announcement") {
      return (
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Announcement Messages</p>
            <Button
              type="button"
              variant="utility"
              className="min-h-9 px-3 py-2 text-xs"
              onClick={() =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  announcementItems: [...state.announcementItems, { text: "", active: true }]
                }))
              }
            >
              Add Message
            </Button>
          </div>
          {section.announcementItems.length === 0 ? (
            <p className="rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-xs text-[var(--muted)]">
              No custom announcement messages yet.
            </p>
          ) : null}
          {section.announcementItems.map((item, index) => (
            <div className="rounded-lg border border-[var(--line)] p-3" key={`announcement-${index}`}>
              <div className="flex items-center gap-2">
                <Input
                  value={item.text}
                  placeholder="Message"
                  onChange={(event) =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      announcementItems: state.announcementItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, text: event.target.value } : entry
                      )
                    }))
                  }
                />
                <SectionRepeaterControls
                  onUp={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      announcementItems: moveItem(state.announcementItems, index, -1)
                    }))
                  }
                  onDown={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      announcementItems: moveItem(state.announcementItems, index, 1)
                    }))
                  }
                  onRemove={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      announcementItems: state.announcementItems.filter((_, entryIndex) => entryIndex !== index)
                    }))
                  }
                  disableUp={index === 0}
                  disableDown={index === section.announcementItems.length - 1}
                />
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <input
                  checked={item.active}
                  type="checkbox"
                  onChange={(event) =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      announcementItems: state.announcementItems.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, active: event.target.checked } : entry
                      )
                    }))
                  }
                />
                Active
              </label>
            </div>
          ))}
        </div>
      );
    }

    if (key === "usp_features") {
      return (
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">USP Labels</p>
            <Button
              type="button"
              variant="utility"
              className="min-h-9 px-3 py-2 text-xs"
              onClick={() =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  uspLabels: [...state.uspLabels, { label: "", active: true }]
                }))
              }
            >
              Add USP
            </Button>
          </div>
          {section.uspLabels.map((item, index) => (
            <div className="flex items-center gap-2" key={`usp-${index}`}>
              <Input
                value={item.label}
                placeholder="Label"
                onChange={(event) =>
                  updateSection(key, (state) => ({
                    ...state,
                    message: null,
                    uspLabels: state.uspLabels.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, label: event.target.value } : entry
                    )
                  }))
                }
              />
              <label className="inline-flex min-w-[62px] items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                <input
                  checked={item.active}
                  type="checkbox"
                  onChange={(event) =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      uspLabels: state.uspLabels.map((entry, entryIndex) =>
                        entryIndex === index ? { ...entry, active: event.target.checked } : entry
                      )
                    }))
                  }
                />
                Active
              </label>
              <SectionRepeaterControls
                onUp={() => updateSection(key, (state) => ({ ...state, message: null, uspLabels: moveItem(state.uspLabels, index, -1) }))}
                onDown={() => updateSection(key, (state) => ({ ...state, message: null, uspLabels: moveItem(state.uspLabels, index, 1) }))}
                onRemove={() =>
                  updateSection(key, (state) => ({
                    ...state,
                    message: null,
                    uspLabels: state.uspLabels.filter((_, entryIndex) => entryIndex !== index)
                  }))
                }
                disableUp={index === 0}
                disableDown={index === section.uspLabels.length - 1}
              />
            </div>
          ))}
        </div>
      );
    }

    if (key === "faq") {
      return (
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">FAQ Items</p>
            <Button
              type="button"
              variant="utility"
              className="min-h-9 px-3 py-2 text-xs"
              onClick={() =>
                updateSection(key, (state) => ({ ...state, message: null, faqItems: [...state.faqItems, { q: "", a: "", active: true }] }))
              }
            >
              Add FAQ
            </Button>
          </div>
          {section.faqItems.map((item, index) => (
            <div className="rounded-lg border border-[var(--line)] p-3" key={`faq-${index}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold">Question</span>
                  <Input
                    className="mt-1"
                    value={item.q}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        faqItems: state.faqItems.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, q: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold">Answer</span>
                  <Textarea
                    className="mt-1 min-h-16"
                    value={item.a}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        faqItems: state.faqItems.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, a: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <input
                    checked={item.active}
                    type="checkbox"
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        faqItems: state.faqItems.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, active: event.target.checked } : entry
                        )
                      }))
                    }
                  />
                  Active
                </label>
                <SectionRepeaterControls
                  onUp={() => updateSection(key, (state) => ({ ...state, message: null, faqItems: moveItem(state.faqItems, index, -1) }))}
                  onDown={() => updateSection(key, (state) => ({ ...state, message: null, faqItems: moveItem(state.faqItems, index, 1) }))}
                  onRemove={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      faqItems: state.faqItems.filter((_, entryIndex) => entryIndex !== index)
                    }))
                  }
                  disableUp={index === 0}
                  disableDown={index === section.faqItems.length - 1}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (key === "do_you_know") {
      return (
        <div className="space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Do You Know Cards</p>
            <Button
              type="button"
              variant="utility"
              className="min-h-9 px-3 py-2 text-xs"
              onClick={() =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  doYouKnowCards: [
                    ...state.doYouKnowCards,
                    { title: "", body: "", imageUrl: "", linkUrl: "", buttonText: "", active: true }
                  ]
                }))
              }
            >
              Add Card
            </Button>
          </div>
          {section.doYouKnowCards.map((card, index) => (
            <div className="rounded-lg border border-[var(--line)] p-3" key={`dyk-${index}`}>
              <div className="grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="text-xs font-semibold">Title</span>
                  <Input
                    className="mt-1"
                    value={card.title}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        doYouKnowCards: state.doYouKnowCards.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, title: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Button text (optional)</span>
                  <Input
                    className="mt-1"
                    value={card.buttonText}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        doYouKnowCards: state.doYouKnowCards.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, buttonText: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-xs font-semibold">Body/Excerpt</span>
                  <Textarea
                    className="mt-1 min-h-16"
                    value={card.body}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        doYouKnowCards: state.doYouKnowCards.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, body: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Image URL (optional)</span>
                  <Input
                    className="mt-1"
                    value={card.imageUrl}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        doYouKnowCards: state.doYouKnowCards.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, imageUrl: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
                <label>
                  <span className="text-xs font-semibold">Link URL (optional)</span>
                  <Input
                    className="mt-1"
                    value={card.linkUrl}
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        doYouKnowCards: state.doYouKnowCards.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, linkUrl: event.target.value } : entry
                        )
                      }))
                    }
                  />
                </label>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                  <input
                    checked={card.active}
                    type="checkbox"
                    onChange={(event) =>
                      updateSection(key, (state) => ({
                        ...state,
                        message: null,
                        doYouKnowCards: state.doYouKnowCards.map((entry, entryIndex) =>
                          entryIndex === index ? { ...entry, active: event.target.checked } : entry
                        )
                      }))
                    }
                  />
                  Active
                </label>
                <SectionRepeaterControls
                  onUp={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      doYouKnowCards: moveItem(state.doYouKnowCards, index, -1)
                    }))
                  }
                  onDown={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      doYouKnowCards: moveItem(state.doYouKnowCards, index, 1)
                    }))
                  }
                  onRemove={() =>
                    updateSection(key, (state) => ({
                      ...state,
                      message: null,
                      doYouKnowCards: state.doYouKnowCards.filter((_, entryIndex) => entryIndex !== index)
                    }))
                  }
                  disableUp={index === 0}
                  disableDown={index === section.doYouKnowCards.length - 1}
                />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (key === "featured_core_product") {
      return (
        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <label>
            <span className="text-sm font-semibold">Eyebrow (optional)</span>
            <Input
              className="mt-2"
              value={section.featuredCoreMeta.eyebrow}
              onChange={(event) =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  featuredCoreMeta: { ...state.featuredCoreMeta, eyebrow: event.target.value }
                }))
              }
            />
          </label>
          <label>
            <span className="text-sm font-semibold">CTA Button Text (optional)</span>
            <Input
              className="mt-2"
              value={section.featuredCoreMeta.buttonText}
              onChange={(event) =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  featuredCoreMeta: { ...state.featuredCoreMeta, buttonText: event.target.value }
                }))
              }
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Secondary Text (optional)</span>
            <Input
              className="mt-2"
              value={section.featuredCoreMeta.secondaryText}
              onChange={(event) =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  featuredCoreMeta: { ...state.featuredCoreMeta, secondaryText: event.target.value }
                }))
              }
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Custom Subtitle (optional)</span>
            <Input
              className="mt-2"
              value={section.featuredCoreMeta.subtitle}
              onChange={(event) =>
                updateSection(key, (state) => ({
                  ...state,
                  message: null,
                  featuredCoreMeta: { ...state.featuredCoreMeta, subtitle: event.target.value }
                }))
              }
            />
          </label>
        </div>
      );
    }

    return null;
  }

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Homepage Content</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Configure each section with clear mode controls: Custom, Default, or Hidden.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadHomepageSections()}>
          Refresh
        </Button>
      </div>

      {listError ? (
        <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">{listError}</div>
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
            const config = sectionConfig[key];
            const warning = sectionWarning(key, section);

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 md:p-5" key={key}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{prettyLabel(key)}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">{config.purpose}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Storefront: {config.storefrontLocation}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{config.controlsSummary}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Key: {key} | Created: {formatDate(section.createdAt)} | Updated: {formatDate(section.updatedAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${modeBadgeClass(section.displayMode)}`}>
                        {section.displayMode}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{modeDescription(section.displayMode)}</span>
                    </div>
                  </div>
                  <Button type="button" disabled={section.isSaving} onClick={() => void onSaveSection(key)}>
                    {section.isSaving ? "Saving..." : "Save Section"}
                  </Button>
                </div>

                {section.error ? (
                  <div className="mt-3 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">{section.error}</div>
                ) : null}
                {section.message ? (
                  <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
                    {section.message}
                  </div>
                ) : null}
                {warning ? (
                  <div className="mt-3 rounded-lg border border-[#f0d8b7] bg-[#fff8ed] p-3 text-sm text-[#8a5b1d]">{warning}</div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-semibold">Display Mode</span>
                    <Select
                      className="mt-2"
                      value={section.displayMode}
                      onChange={(event) => updateSection(key, (state) => ({ ...state, displayMode: event.target.value as SectionDisplayMode, message: null }))}
                    >
                      <option value="custom">Custom</option>
                      <option value="default">Default</option>
                      <option value="hidden">Hidden</option>
                    </Select>
                  </label>
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-xs text-[var(--muted)]">
                    <p>Custom: use admin-managed section content.</p>
                    <p className="mt-1">Default: use built-in storefront defaults.</p>
                    <p className="mt-1">Hidden: remove section from homepage.</p>
                  </div>

                  {showField(key, "title") ? (
                    <label>
                      <span className="text-sm font-semibold">Title</span>
                      <Input className="mt-2" value={section.title} onChange={(event) => updateSection(key, (state) => ({ ...state, title: event.target.value, message: null }))} />
                    </label>
                  ) : null}
                  {showField(key, "subtitle") ? (
                    <label>
                      <span className="text-sm font-semibold">Subtitle</span>
                      <Input className="mt-2" value={section.subtitle} onChange={(event) => updateSection(key, (state) => ({ ...state, subtitle: event.target.value, message: null }))} />
                    </label>
                  ) : null}
                  {showField(key, "body") ? (
                    <label className="sm:col-span-2">
                      <span className="text-sm font-semibold">Body</span>
                      <Textarea className="mt-2 min-h-20" value={section.body} onChange={(event) => updateSection(key, (state) => ({ ...state, body: event.target.value, message: null }))} />
                    </label>
                  ) : null}
                  {showField(key, "imageUrl") ? (
                    <label>
                      <span className="text-sm font-semibold">Image URL</span>
                      <Input className="mt-2" placeholder="https://..." value={section.imageUrl} onChange={(event) => updateSection(key, (state) => ({ ...state, imageUrl: event.target.value, message: null }))} />
                    </label>
                  ) : null}
                  {showField(key, "linkUrl") ? (
                    <label>
                      <span className="text-sm font-semibold">Link URL</span>
                      <Input className="mt-2" placeholder="https://..." value={section.linkUrl} onChange={(event) => updateSection(key, (state) => ({ ...state, linkUrl: event.target.value, message: null }))} />
                    </label>
                  ) : null}
                  {showField(key, "position") ? (
                    <label>
                      <span className="text-sm font-semibold">Position</span>
                      <Input className="mt-2" type="number" min={0} value={section.position} onChange={(event) => updateSection(key, (state) => ({ ...state, position: event.target.value, message: null }))} />
                    </label>
                  ) : null}

                  {renderSectionMetaEditor(key, section)}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
