import { prisma } from "../../prisma/prisma.service";
import type { HomepageSectionResponse } from "./homepage.types";

function mapSection(section: {
  key: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  metadata: unknown;
  isActive: boolean;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): HomepageSectionResponse {
  return {
    key: section.key,
    title: section.title,
    subtitle: section.subtitle,
    body: section.body,
    imageUrl: section.imageUrl,
    linkUrl: section.linkUrl,
    metadata:
      section.metadata && typeof section.metadata === "object" && !Array.isArray(section.metadata)
        ? (section.metadata as Record<string, unknown>)
        : null,
    isActive: section.isActive,
    position: section.position,
    createdAt: section.createdAt.toISOString(),
    updatedAt: section.updatedAt.toISOString()
  };
}

export async function listHomepageSections(): Promise<{ data: HomepageSectionResponse[] }> {
  const sections = await prisma.homepageSection.findMany({
    orderBy: [{ position: "asc" }, { key: "asc" }]
  });

  return {
    data: sections.map(mapSection)
  };
}
