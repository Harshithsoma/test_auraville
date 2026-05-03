"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";

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

type SectionFormState = {
  key: string;
  title: string;
  subtitle: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  metadataText: string;
  isActive: boolean;
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

function toFormState(section: AdminHomepageSection | null, fallbackPosition: number): SectionFormState {
  return {
    key: section?.key ?? "",
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    body: section?.body ?? "",
    imageUrl: section?.imageUrl ?? "",
    linkUrl: section?.linkUrl ?? "",
    metadataText: section?.metadata ? JSON.stringify(section.metadata, null, 2) : "{}",
    isActive: section?.isActive ?? true,
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

  async function onSaveSection(key: string) {
    const current = sections[key];
    if (!current) return;

    let metadata: Record<string, unknown>;
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
      metadata,
      isActive: current.isActive,
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
            Edit and publish homepage sections. Changes are saved per section.
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
                    <span className="text-sm font-semibold">Title</span>
                    <Input
                      className="mt-2"
                      value={section.title}
                      onChange={(event) =>
                        updateSection(key, (state) => ({ ...state, title: event.target.value, message: null }))
                      }
                    />
                  </label>
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
                  <label className="flex items-end">
                    <span className="inline-flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm">
                      <input
                        checked={section.isActive}
                        type="checkbox"
                        onChange={(event) =>
                          updateSection(key, (state) => ({
                            ...state,
                            isActive: event.target.checked,
                            message: null
                          }))
                        }
                      />
                      Active
                    </span>
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
