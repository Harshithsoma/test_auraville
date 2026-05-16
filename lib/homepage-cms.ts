import { commerceApi } from "@/services/api";

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

export type HomepageSectionDisplayMode = "custom" | "default" | "hidden";

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

function metadataWithDisplayMode(
  section: HomepageSection | undefined
): Record<string, unknown> {
  if (!section?.metadata || typeof section.metadata !== "object" || Array.isArray(section.metadata)) {
    return {};
  }
  return section.metadata;
}

export function getHomepageSectionDisplayMode(
  section: HomepageSection | undefined
): HomepageSectionDisplayMode {
  const metadata = metadataWithDisplayMode(section);
  const candidate = metadata.displayMode;
  if (candidate === "custom" || candidate === "default" || candidate === "hidden") {
    return candidate;
  }

  if (!section) {
    return "default";
  }

  return section.isActive ? "custom" : "hidden";
}

export function metadataObject(section: HomepageSection | undefined): Record<string, unknown> {
  const metadata = metadataWithDisplayMode(section);
  if ("displayMode" in metadata) {
    const rest = { ...metadata };
    delete rest.displayMode;
    return rest;
  }
  return metadata;
}

export function isRenderableCmsImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
    return !blockedHosts.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}
