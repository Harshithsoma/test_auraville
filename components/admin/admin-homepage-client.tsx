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

type ListHomepageResponse = {
  data: AdminHomepageSection[];
};

type PatchHomepageResponse = {
  data: AdminHomepageSection;
};

type SectionDisplayMode = "custom" | "default" | "hidden";
type SectionField = "title" | "subtitle" | "body" | "imageUrl" | "linkUrl" | "metadata";

type SectionFormState = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  metadataText: string;
  displayMode: SectionDisplayMode;
  position: string;
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
  "usp_features",
  "faq",
  "reviews",
  "footer"
] as const;

type SectionKey = (typeof sectionKeys)[number];

const sectionConfig: Record<
  SectionKey,
  {
    purpose: string;
    storefrontLocation: string;
    controlsSummary: string;
    fields: SectionField[];
  }
> = {
  hero: {
    purpose: "Top visual section on homepage.",
    storefrontLocation: "Homepage top (first section).",
    controlsSummary: "Controls custom hero image, optional link, and optional title.",
    fields: ["title", "imageUrl", "linkUrl"]
  },
  announcement: {
    purpose: "Short trust/promotional strip messages.",
    storefrontLocation: "Below featured products.",
    controlsSummary: "Controls announcement items via metadata.items and optional body lines.",
    fields: ["body", "metadata"]
  },
  do_you_know: {
    purpose: "Educational carousel heading block.",
    storefrontLocation: "Lower homepage content area.",
    controlsSummary: "Controls heading/subheading only.",
    fields: ["title", "subtitle"]
  },
  why_auraville: {
    purpose: "Brand story section.",
    storefrontLocation: "Mid-lower homepage story block.",
    controlsSummary: "Controls story text and optional hero image/link override.",
    fields: ["title", "subtitle", "body", "imageUrl", "linkUrl"]
  },
  usp_features: {
    purpose: "Feature badges/benefits section.",
    storefrontLocation: "Near top below hero/banner.",
    controlsSummary: "Controls title and labels via metadata.labels.",
    fields: ["title", "metadata"]
  },
  faq: {
    purpose: "Homepage FAQ block.",
    storefrontLocation: "Lower homepage FAQ.",
    controlsSummary: "Controls FAQ heading and Q/A list via metadata.items.",
    fields: ["title", "metadata"]
  },
  reviews: {
    purpose: "Customer reviews section heading.",
    storefrontLocation: "Reviews slider heading area.",
    controlsSummary: "Controls heading/subheading only. Review cards come from reviews API.",
    fields: ["title", "subtitle"]
  },
  footer: {
    purpose: "Footer brand blurb.",
    storefrontLocation: "Global footer text.",
    controlsSummary: "Controls only footer body/brand description text.",
    fields: ["body"]
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
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
}

function readDisplayMode(metadata: Record<string, unknown> | null, isActive: boolean): SectionDisplayMode {
  const candidate = metadata?.displayMode;
  if (candidate === "custom" || candidate === "default" || candidate === "hidden") {
    return candidate;
  }
  return isActive ? "custom" : "hidden";
}

function metadataWithoutDisplayMode(metadata: Record<string, unknown> | null): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }
  const rest = { ...metadata };
  delete rest.displayMode;
  return rest;
}

function toFormState(section: AdminHomepageSection | null, fallbackPosition: number): SectionFormState {
  return {
    key: section?.key ?? "",
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    body: section?.body ?? "",
    imageUrl: section?.imageUrl ?? "",
    linkUrl: section?.linkUrl ?? "",
    metadataText: section?.metadata ? JSON.stringify(metadataWithoutDisplayMode(section.metadata), null, 2) : "{}",
    displayMode: readDisplayMode(section?.metadata ?? null, section?.isActive ?? true),
    position: String(section?.position ?? fallbackPosition),
    createdAt: section?.createdAt ?? "",
    updatedAt: section?.updatedAt ?? "",
    exists: Boolean(section),
    isSaving: false,
    error: null,
    message: null
  };
}

function parseMetadataObject(value: string): Record<string, unknown> {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Metadata must be a JSON object.");
  }

  return parsed as Record<string, unknown>;
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
  if (!isValidUrl(value)) {
    return false;
  }

  const parsed = new URL(value);
  const blockedHosts = new Set(["example.com", "www.example.com", "localhost", "127.0.0.1"]);
  return !blockedHosts.has(parsed.hostname.toLowerCase());
}

function parseMetadataTextSafely(value: string): { ok: true; data: Record<string, unknown> } | { ok: false } {
  try {
    const parsed = parseMetadataObject(value);
    return { ok: true, data: parsed };
  } catch {
    return { ok: false };
  }
}

function modeDescription(mode: SectionDisplayMode): string {
  if (mode === "custom") {
    return "Using admin-managed content.";
  }
  if (mode === "default") {
    return "Using built-in storefront defaults.";
  }
  return "Section hidden from homepage.";
}

function modeBadgeClass(mode: SectionDisplayMode): string {
  if (mode === "custom") {
    return "bg-[var(--mint)] text-[var(--leaf-deep)]";
  }
  if (mode === "default") {
    return "bg-[#fff8ed] text-[#8a5b1d]";
  }
  return "bg-[#fff3f2] text-[var(--coral)]";
}

function getSectionCompletenessWarning(key: SectionKey, section: SectionFormState): string | null {
  if (section.displayMode !== "custom") {
    return null;
  }

  if (key === "hero" && section.imageUrl.trim() && !isRenderableCmsImageUrl(section.imageUrl.trim())) {
    return "Hero image URL is invalid or unsupported. Storefront will fall back to the default slideshow.";
  }

  const parsedMetadata = parseMetadataTextSafely(section.metadataText);
  if (!parsedMetadata.ok && sectionConfig[key].fields.includes("metadata")) {
    return "Metadata JSON is invalid. Save is blocked until fixed.";
  }

  if (!parsedMetadata.ok) {
    return null;
  }

  if (key === "announcement") {
    const items = parsedMetadata.data.items;
    if (items !== undefined && (!Array.isArray(items) || items.length === 0)) {
      return "Announcement metadata.items should be a non-empty string array, otherwise storefront falls back to defaults.";
    }
  }

  if (key === "usp_features") {
    const labels = parsedMetadata.data.labels;
    if (labels !== undefined && (!Array.isArray(labels) || labels.length === 0)) {
      return "USP metadata.labels should be a non-empty string array, otherwise storefront falls back to defaults.";
    }
  }

  if (key === "faq") {
    const items = parsedMetadata.data.items;
    if (items !== undefined && (!Array.isArray(items) || items.length === 0)) {
      return "FAQ metadata.items should be a non-empty array of { q, a } objects, otherwise storefront falls back to defaults.";
    }
  }

  return null;
}

export function AdminHomepageClient() {
  const [sections, setSections] = useState<Record<string, SectionFormState>>({});
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

      const nextState: Record<string, SectionFormState> = {};
      sectionKeys.forEach((key, index) => {
        nextState[key] = toFormState(byKey.get(key) ?? null, index);
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

  function updateSection(
    key: string,
    updater: (current: SectionFormState) => SectionFormState
  ) {
    setSections((current) => {
      const existing = current[key];
      if (!existing) return current;
      return {
        ...current,
        [key]: updater(existing)
      };
    });
  }

  async function onSaveSection(key: SectionKey) {
    const current = sections[key];
    if (!current) return;

    let metadata: Record<string, unknown>;
    if (sectionConfig[key].fields.includes("metadata") && current.displayMode === "custom") {
      try {
        metadata = parseMetadataObject(current.metadataText);
      } catch (error) {
        updateSection(key, (state) => ({
          ...state,
          error: error instanceof Error ? error.message : "Metadata must be a valid JSON object.",
          message: null
        }));
        return;
      }
    } else {
      const parsed = parseMetadataTextSafely(current.metadataText);
      metadata = parsed.ok ? parsed.data : {};
    }

    const positionValue = Number(current.position);
    if (!Number.isInteger(positionValue) || positionValue < 0) {
      updateSection(key, (state) => ({
        ...state,
        error: "Position must be a non-negative integer.",
        message: null
      }));
      return;
    }

    const imageUrl = current.imageUrl.trim();
    if (imageUrl && !isValidUrl(imageUrl)) {
      updateSection(key, (state) => ({
        ...state,
        error: "Image URL must be valid.",
        message: null
      }));
      return;
    }

    const linkUrl = current.linkUrl.trim();
    if (linkUrl && !isValidUrl(linkUrl)) {
      updateSection(key, (state) => ({
        ...state,
        error: "Link URL must be valid.",
        message: null
      }));
      return;
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
      metadata: {
        ...metadata,
        displayMode: current.displayMode
      },
      isActive: current.displayMode !== "hidden",
      position: positionValue
    };

    if (imageUrl) {
      payload.imageUrl = imageUrl;
    }
    if (linkUrl) {
      payload.linkUrl = linkUrl;
    }

    updateSection(key, (state) => ({
      ...state,
      isSaving: true,
      error: null,
      message: null
    }));

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

  return (
    <section className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Homepage Content</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Configure each section with explicit mode: Custom, Default, or Hidden.
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
            const config = sectionConfig[key];
            const completenessWarning = getSectionCompletenessWarning(key, section);
            const showField = (field: SectionField) => config.fields.includes(field);

            return (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 md:p-5" key={key}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{prettyLabel(key)}</h2>
                    <p className="mt-1 text-xs text-[var(--muted)]">{config.purpose}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Storefront: {config.storefrontLocation}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{config.controlsSummary}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Key: {key} | Created: {formatDate(section.createdAt)} | Updated: {formatDate(section.updatedAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${modeBadgeClass(section.displayMode)}`}
                      >
                        {section.displayMode}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{modeDescription(section.displayMode)}</span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    disabled={section.isSaving}
                    onClick={() => void onSaveSection(key)}
                  >
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
                {completenessWarning ? (
                  <div className="mt-3 rounded-lg border border-[#f0d8b7] bg-[#fff8ed] p-3 text-sm text-[#8a5b1d]">
                    {completenessWarning}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="text-sm font-semibold">Display Mode</span>
                    <Select
                      className="mt-2"
                      value={section.displayMode}
                      onChange={(event) =>
                        updateSection(key, (state) => ({
                          ...state,
                          displayMode: event.target.value as SectionDisplayMode,
                          message: null
                        }))
                      }
                    >
                      <option value="custom">Custom</option>
                      <option value="default">Default</option>
                      <option value="hidden">Hidden</option>
                    </Select>
                  </label>
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-xs text-[var(--muted)]">
                    <p>Custom uses admin-managed content.</p>
                    <p className="mt-1">Default uses built-in storefront fallback.</p>
                    <p className="mt-1">Hidden does not render this section.</p>
                  </div>

                  {showField("title") ? (
                    <label>
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

                  {showField("subtitle") ? (
                    <label>
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

                  {showField("body") ? (
                    <label className="sm:col-span-2">
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

                  {showField("imageUrl") ? (
                    <label>
                      <span className="text-sm font-semibold">Image URL</span>
                      <Input
                        className="mt-2"
                        placeholder="https://..."
                        value={section.imageUrl}
                        onChange={(event) =>
                          updateSection(key, (state) => ({ ...state, imageUrl: event.target.value, message: null }))
                        }
                      />
                    </label>
                  ) : null}

                  {showField("linkUrl") ? (
                    <label>
                      <span className="text-sm font-semibold">Link URL</span>
                      <Input
                        className="mt-2"
                        placeholder="https://..."
                        value={section.linkUrl}
                        onChange={(event) =>
                          updateSection(key, (state) => ({ ...state, linkUrl: event.target.value, message: null }))
                        }
                      />
                    </label>
                  ) : null}

                  {showField("metadata") ? (
                    <label className="sm:col-span-2">
                      <span className="text-sm font-semibold">Metadata (JSON object)</span>
                      <Textarea
                        className="mt-2 min-h-28 font-mono text-xs"
                        value={section.metadataText}
                        onChange={(event) =>
                          updateSection(key, (state) => ({
                            ...state,
                            metadataText: event.target.value,
                            message: null
                          }))
                        }
                      />
                    </label>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
