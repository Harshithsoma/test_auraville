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
