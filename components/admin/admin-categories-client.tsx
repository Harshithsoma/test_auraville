"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  activeProductCount: number;
  createdAt: string;
  updatedAt: string;
};

type ListCategoriesResponse = {
  data: AdminCategory[];
};

type MutateCategoryResponse = {
  data: AdminCategory;
};

type DeleteCategoryResponse = {
  data: {
    id: string;
    deleted: true;
  };
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleString();
}

type FormMode = "create" | "edit";

export function AdminCategoriesClient() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  async function loadCategories() {
    setIsLoading(true);
    setListError(null);

    try {
      const response = await commerceApi.admin.categories.list<ListCategoriesResponse>();
      setCategories(response.data);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to load categories.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  function resetForm(nextMode: FormMode = "create") {
    setMode(nextMode);
    setEditingId(null);
    setName("");
    setSlug("");
    setFormError(null);
    setFormMessage(null);
  }

  function beginEdit(category: AdminCategory) {
    setMode("edit");
    setEditingId(category.id);
    setName(category.name);
    setSlug(category.slug);
    setFormError(null);
    setFormMessage(null);
  }

  function validateForm(): string | null {
    if (!name.trim()) {
      return "Category name is required.";
    }

    if (!slug.trim()) {
      return "Category slug is required.";
    }

    if (!slugPattern.test(slug.trim())) {
      return "Slug must use lowercase letters, numbers, and hyphens only.";
    }

    return null;
  }

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validateForm();
    if (validationMessage) {
      setFormError(validationMessage);
      setFormMessage(null);
      return;
    }

    setIsSaving(true);
    setFormError(null);
    setFormMessage(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim()
    };

    try {
      if (mode === "create") {
        const response = await commerceApi.admin.categories.create<MutateCategoryResponse, typeof payload>(payload);
        setCategories((current) => [response.data, ...current]);
        resetForm("create");
        setFormMessage("Category created.");
      } else if (editingId) {
        const response = await commerceApi.admin.categories.update<MutateCategoryResponse, typeof payload>(
          editingId,
          payload
        );
        setCategories((current) =>
          current.map((category) => (category.id === editingId ? response.data : category))
        );
        resetForm("create");
        setFormMessage("Category updated.");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to save category.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function onDelete(category: AdminCategory) {
    if (!window.confirm(`Delete category "${category.name}"?`)) {
      return;
    }

    setListError(null);
    try {
      await commerceApi.admin.categories.delete<DeleteCategoryResponse>(category.id);
      setCategories((current) => current.filter((entry) => entry.id !== category.id));
      if (editingId === category.id) {
        resetForm("create");
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "CATEGORY_IN_USE") {
          setListError("This category cannot be deleted because products are still assigned to it.");
          return;
        }
        setListError(error.message);
      } else {
        setListError("Unable to delete category.");
      }
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin</p>
            <h1 className="mt-2 text-3xl font-semibold">Categories</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Create, update, and remove catalog categories.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadCategories()}>
            Refresh
          </Button>
        </div>

        {listError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {listError}
          </div>
        ) : null}

        {isLoading ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            Loading categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            No categories found.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--line)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--mint)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-3">Name</th>
                  <th className="px-3 py-3">Slug</th>
                  <th className="px-3 py-3">Products</th>
                  <th className="px-3 py-3">Created</th>
                  <th className="px-3 py-3">Updated</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr className="border-t border-[var(--line)]" key={category.id}>
                    <td className="px-3 py-3 font-semibold">{category.name}</td>
                    <td className="px-3 py-3 text-xs">{category.slug}</td>
                    <td className="px-3 py-3 text-xs">
                      {category.activeProductCount} active / {category.productCount} total
                    </td>
                    <td className="px-3 py-3 text-xs">{formatDate(category.createdAt)}</td>
                    <td className="px-3 py-3 text-xs">{formatDate(category.updatedAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" onClick={() => beginEdit(category)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => void onDelete(category)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7" onSubmit={(event) => void onSave(event)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{mode === "create" ? "Add category" : "Edit category"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">Category slug should remain stable once published.</p>
          </div>
          {mode === "edit" ? (
            <Button type="button" variant="secondary" onClick={() => resetForm("create")}>
              Cancel edit
            </Button>
          ) : null}
        </div>

        {formError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {formError}
          </div>
        ) : null}
        {formMessage ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
            {formMessage}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-sm font-semibold">Name</span>
            <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            <span className="text-sm font-semibold">Slug</span>
            <Input className="mt-2" value={slug} onChange={(event) => setSlug(event.target.value)} />
          </label>
        </div>

        <div className="mt-6">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : mode === "create" ? "Create category" : "Save category"}
          </Button>
        </div>
      </form>
    </section>
  );
}
