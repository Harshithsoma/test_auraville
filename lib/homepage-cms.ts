import { commerceApi } from "@/services/api";
import type {
  HomepageAnnouncementItem,
  HomepageCmsDisplayMode,
  HomepageDoYouKnowCard,
  HomepageFaqItem,
  HomepageHeroSlide
} from "@/lib/homepage-defaults";

export type HomepageSection = {
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

type HomepageSectionsResponse = {
  data: HomepageSection[];
};

export async function fetchHomepageSections(): Promise<HomepageSection[]> {
  try {
    const response = await commerceApi.homepage.list<HomepageSectionsResponse>();
    return response.data;
  } catch {
    return [];
  }
}

export function sectionMap(sections: HomepageSection[]): Map<string, HomepageSection> {
  return new Map(sections.map((section) => [section.key, section]));
}

export function metadataObject(section: HomepageSection | undefined): Record<string, unknown> {
  if (!section?.metadata || typeof section.metadata !== "object" || Array.isArray(section.metadata)) {
    return {};
  }
  return section.metadata;
}

export function getSectionDisplayMode(section?: HomepageSection): HomepageCmsDisplayMode {
  if (!section) {
    return "default";
  }

  const metadata = metadataObject(section);
  const mode = metadata.displayMode;
  if (mode === "custom" || mode === "default" || mode === "hidden") {
    return mode;
  }

  return section.isActive ? "custom" : "hidden";
}

export function sectionIsVisible(section?: HomepageSection): boolean {
  return getSectionDisplayMode(section) !== "hidden";
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toBoolean(value: unknown, fallback = true): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function parseHeroSlides(section?: HomepageSection): HomepageHeroSlide[] {
  const metadata = metadataObject(section);
  const source = metadata.slides;
  if (!Array.isArray(source)) return [];
  const items: HomepageHeroSlide[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const imageUrl = toTrimmedString(record.imageUrl) || "";
    if (!imageUrl.trim()) continue;
    items.push({
      title: toTrimmedString(record.title),
      subtitle: toTrimmedString(record.subtitle),
      imageUrl,
      linkUrl: toTrimmedString(record.linkUrl),
      buttonText: toTrimmedString(record.buttonText),
      objectPosition: toTrimmedString(record.objectPosition),
      sortOrder: toNumber(record.sortOrder),
      isActive: toBoolean(record.isActive, true)
    });
  }
  return items;
}

export function parseAnnouncementItems(section?: HomepageSection): HomepageAnnouncementItem[] {
  const metadata = metadataObject(section);
  const source = metadata.items;
  if (!Array.isArray(source)) return [];
  const items: HomepageAnnouncementItem[] = [];
  for (const item of source) {
    if (typeof item === "string") {
      const text = item.trim();
      if (text) items.push({ text, isActive: true });
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const text = toTrimmedString(record.text);
    if (!text) continue;
    items.push({
      text,
      sortOrder: toNumber(record.sortOrder),
      isActive: toBoolean(record.isActive, true)
    });
  }
  return items;
}

export function parseDoYouKnowCards(section?: HomepageSection): HomepageDoYouKnowCard[] {
  const metadata = metadataObject(section);
  const source = metadata.cards;
  if (!Array.isArray(source)) return [];
  const cards: HomepageDoYouKnowCard[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const title = toTrimmedString(record.title);
    const body = toTrimmedString(record.body);
    if (!title || !body) continue;
    cards.push({
      title,
      body,
      imageUrl: toTrimmedString(record.imageUrl),
      linkUrl: toTrimmedString(record.linkUrl),
      buttonText: toTrimmedString(record.buttonText),
      postedAt: toTrimmedString(record.postedAt),
      sortOrder: toNumber(record.sortOrder),
      isActive: toBoolean(record.isActive, true)
    });
  }
  return cards;
}

export function parseUspLabels(section?: HomepageSection): string[] {
  const metadata = metadataObject(section);
  const source = metadata.labels;
  if (!Array.isArray(source)) return [];
  const labels: Array<{ label: string; sortOrder?: number }> = [];
  for (const item of source) {
    if (typeof item === "string") {
      const value = item.trim();
      if (value) labels.push({ label: value });
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const isActive = typeof row.isActive === "boolean" ? row.isActive : true;
    if (!isActive) continue;
    const label =
      typeof row.label === "string"
        ? row.label.trim()
        : typeof row.text === "string"
          ? row.text.trim()
          : "";
    if (label) {
      labels.push({
        label,
        sortOrder: toNumber(row.sortOrder)
      });
    }
  }
  return labels
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((entry) => entry.label);
}

export function parseFaqItems(section?: HomepageSection): HomepageFaqItem[] {
  const metadata = metadataObject(section);
  const source = metadata.items;
  if (!Array.isArray(source)) return [];
  const items: HomepageFaqItem[] = [];
  for (const item of source) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const q = toTrimmedString(record.q);
    const a = toTrimmedString(record.a);
    if (!q || !a) continue;
    items.push({
      q,
      a,
      sortOrder: toNumber(record.sortOrder),
      isActive: toBoolean(record.isActive, true)
    });
  }
  return items;
}
