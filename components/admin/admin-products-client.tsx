"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type Availability = "available" | "coming-soon";

type AdminVariant = {
  id: string;
  label: string;
  price: number;
  unit: string;
  stock: number;
  sku: string | null;
  isActive: boolean;
};

type AdminProduct = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: number;
  compareAtPrice: number | null;
  promoLabel: string | null;
  currency: "INR";
  image: string;
  gallery: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  categoryId: string;
  availability: Availability;
  releaseNote: string | null;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  badgeLabel: string | null;
  popularity: number;
  ingredients: string[];
  benefits: string[];
  isActive: boolean;
  variants: AdminVariant[];
  createdAt: string;
  updatedAt: string;
};

type ListProductsResponse = {
  data: AdminProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type GetProductResponse = {
  data: AdminProduct;
};

type MutateProductResponse = {
  data: AdminProduct;
};

type DeleteProductResponse = {
  data: {
    id: string;
    isActive: boolean;
  };
};

type UploadImageResponse = {
  data: {
    url: string;
    secureUrl: string;
    publicId: string;
  };
};

type VariantMutationResponse = {
  data: {
    id: string;
    label: string;
    price: number;
    unit: string;
    stock: number;
    sku: string | null;
    isActive: boolean;
  };
};

type VariantDeleteResponse = {
  data: {
    id: string;
    isActive: boolean;
  };
};

type FormVariant = {
  localKey: string;
  persisted: boolean;
  originalId: string;
  frontendVariantId: string;
  label: string;
  price: string;
  unit: string;
  stock: string;
  sku: string;
  isActive: boolean;
  isSaving: boolean;
};

type ProductFormState = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  price: string;
  compareAtPrice: string;
  promoLabel: string;
  currency: "INR";
  image: string;
  gallery: string[];
  categoryId: string;
  availability: Availability;
  releaseNote: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  badgeLabel: string;
  popularity: string;
  ingredientsText: string;
  benefitsText: string;
  isActive: boolean;
  variants: FormVariant[];
};

type FormMode = "create" | "edit";

type Filters = {
  search: string;
  availability: "all" | Availability;
  isActive: "all" | "true" | "false";
  isFeatured: "all" | "true" | "false";
  isBestSeller: "all" | "true" | "false";
  isNew: "all" | "true" | "false";
};

const defaultFilters: Filters = {
  search: "",
  availability: "all",
  isActive: "all",
  isFeatured: "all",
  isBestSeller: "all",
  isNew: "all"
};

function toTextList(values: string[]): string {
  return values.join("\n");
}

function parseTextList(text: string): string[] {
  return text
    .split(/\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toFormVariant(variant: AdminVariant): FormVariant {
  return {
    localKey: `${variant.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    persisted: true,
    originalId: variant.id,
    frontendVariantId: variant.id,
    label: variant.label,
    price: String(variant.price),
    unit: variant.unit,
    stock: String(variant.stock),
    sku: variant.sku ?? "",
    isActive: variant.isActive,
    isSaving: false
  };
}

function defaultForm(): ProductFormState {
  return {
    id: "",
    slug: "",
    name: "",
    tagline: "",
    description: "",
    longDescription: "",
    price: "0",
    compareAtPrice: "",
    promoLabel: "",
    currency: "INR",
    image: "",
    gallery: [],
    categoryId: "",
    availability: "available",
    releaseNote: "",
    isFeatured: false,
    isBestSeller: false,
    isNew: false,
    badgeLabel: "",
    popularity: "0",
    ingredientsText: "",
    benefitsText: "",
    isActive: true,
    variants: []
  };
}

function productToForm(product: AdminProduct): ProductFormState {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    longDescription: product.longDescription,
    price: String(product.price),
    compareAtPrice: product.compareAtPrice === null ? "" : String(product.compareAtPrice),
    promoLabel: product.promoLabel ?? "",
    currency: product.currency,
    image: product.image,
    gallery: product.gallery,
    categoryId: product.categoryId,
    availability: product.availability,
    releaseNote: product.releaseNote ?? "",
    isFeatured: product.isFeatured,
    isBestSeller: product.isBestSeller,
    isNew: product.isNew,
    badgeLabel: product.badgeLabel ?? "",
    popularity: String(product.popularity),
    ingredientsText: toTextList(product.ingredients),
    benefitsText: toTextList(product.benefits),
    isActive: product.isActive,
    variants: product.variants.map(toFormVariant)
  };
}

function asBoolean(value: "all" | "true" | "false"): boolean | undefined {
  if (value === "all") return undefined;
  return value === "true";
}

function buildListQuery(filters: Filters, page: number, limit: number): Record<string, string | number | boolean | undefined> {
  return {
    page,
    limit,
    search: filters.search.trim() || undefined,
    availability: filters.availability === "all" ? undefined : filters.availability,
    isActive: asBoolean(filters.isActive),
    isFeatured: asBoolean(filters.isFeatured),
    isBestSeller: asBoolean(filters.isBestSeller),
    isNew: asBoolean(filters.isNew)
  };
}

function toNumber(value: string): number {
  const n = Number(value);
  if (Number.isNaN(n)) return 0;
  return Math.round(n);
}

export function AdminProductsClient() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });

  const [mode, setMode] = useState<FormMode>("create");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formState, setFormState] = useState<ProductFormState>(defaultForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [isLoadingFormProduct, setIsLoadingFormProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [galleryInput, setGalleryInput] = useState("");

  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function loadProducts(nextPage = page, nextLimit = limit, nextFilters = filters) {
    setIsLoadingList(true);
    setListError(null);

    try {
      const response = await commerceApi.admin.products.list<ListProductsResponse>(
        buildListQuery(nextFilters, nextPage, nextLimit)
      );
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to load products right now.");
      }
    } finally {
      setIsLoadingList(false);
    }
  }

  useEffect(() => {
    void loadProducts(page, limit, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters]);

  function resetForm(modeValue: FormMode) {
    setMode(modeValue);
    setEditingProductId(null);
    setFormState(defaultForm());
    setGalleryInput("");
    setFormError(null);
    setFormMessage(null);
    setUploadError(null);
  }

  async function beginEdit(productId: string) {
    setMode("edit");
    setEditingProductId(productId);
    setFormError(null);
    setFormMessage(null);
    setUploadError(null);
    setIsLoadingFormProduct(true);

    try {
      const response = await commerceApi.admin.products.byId<GetProductResponse>(productId);
      setFormState(productToForm(response.data));
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to load product details.");
      }
    } finally {
      setIsLoadingFormProduct(false);
    }
  }

  async function handleSoftDeleteProduct(product: AdminProduct) {
    if (!window.confirm(`Deactivate product \"${product.name}\"?`)) {
      return;
    }

    try {
      await commerceApi.admin.products.softDelete<DeleteProductResponse>(product.id);
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, isActive: false } : item))
      );
      if (editingProductId === product.id) {
        setFormState((current) => ({ ...current, isActive: false }));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError("Unable to deactivate product.");
      }
    }
  }

  async function uploadImage(file: File, target: "main" | "gallery") {
    setUploadError(null);
    if (target === "main") {
      setIsUploadingMainImage(true);
    } else {
      setIsUploadingGalleryImage(true);
    }

    try {
      const response = await commerceApi.admin.uploads.uploadImage<UploadImageResponse>(file);
      const nextUrl = response.data.secureUrl || response.data.url;
      if (target === "main") {
        setFormState((current) => ({ ...current, image: nextUrl }));
      } else {
        setFormState((current) => ({
          ...current,
          gallery: current.gallery.includes(nextUrl) ? current.gallery : [...current.gallery, nextUrl]
        }));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setUploadError(error.message);
      } else {
        setUploadError("Image upload failed.");
      }
    } finally {
      if (target === "main") {
        setIsUploadingMainImage(false);
      } else {
        setIsUploadingGalleryImage(false);
      }
    }
  }

  function buildProductCreatePayload() {
    return {
      id: formState.id.trim(),
      slug: formState.slug.trim(),
      name: formState.name.trim(),
      tagline: formState.tagline.trim(),
      description: formState.description.trim(),
      longDescription: formState.longDescription.trim(),
      price: toNumber(formState.price),
      compareAtPrice: formState.compareAtPrice.trim() ? toNumber(formState.compareAtPrice) : null,
      promoLabel: formState.promoLabel.trim() || null,
      currency: "INR" as const,
      image: formState.image.trim(),
      gallery: (formState.gallery.length > 0 ? formState.gallery : [formState.image.trim()]).filter(Boolean),
      categoryId: formState.categoryId.trim(),
      availability: formState.availability,
      releaseNote: formState.releaseNote.trim() || null,
      isFeatured: formState.isFeatured,
      isBestSeller: formState.isBestSeller,
      isNew: formState.isNew,
      badgeLabel: formState.badgeLabel.trim() || null,
      popularity: toNumber(formState.popularity),
      ingredients: parseTextList(formState.ingredientsText),
      benefits: parseTextList(formState.benefitsText),
      isActive: formState.isActive,
      variants: formState.variants.map((variant) => ({
        frontendVariantId: variant.frontendVariantId.trim(),
        label: variant.label.trim(),
        price: toNumber(variant.price),
        unit: variant.unit.trim(),
        stock: toNumber(variant.stock),
        sku: variant.sku.trim() || undefined,
        isActive: variant.isActive
      }))
    };
  }

  function buildProductPatchPayload() {
    return {
      slug: formState.slug.trim(),
      name: formState.name.trim(),
      tagline: formState.tagline.trim(),
      description: formState.description.trim(),
      longDescription: formState.longDescription.trim(),
      price: toNumber(formState.price),
      compareAtPrice: formState.compareAtPrice.trim() ? toNumber(formState.compareAtPrice) : null,
      promoLabel: formState.promoLabel.trim() || null,
      currency: "INR" as const,
      image: formState.image.trim(),
      gallery: (formState.gallery.length > 0 ? formState.gallery : [formState.image.trim()]).filter(Boolean),
      categoryId: formState.categoryId.trim(),
      availability: formState.availability,
      releaseNote: formState.releaseNote.trim() || null,
      isFeatured: formState.isFeatured,
      isBestSeller: formState.isBestSeller,
      isNew: formState.isNew,
      badgeLabel: formState.badgeLabel.trim() || null,
      popularity: toNumber(formState.popularity),
      ingredients: parseTextList(formState.ingredientsText),
      benefits: parseTextList(formState.benefitsText),
      isActive: formState.isActive
    };
  }

  function validateForm(modeValue: FormMode): string | null {
    if (modeValue === "create" && !formState.id.trim()) {
      return "Product id is required.";
    }
    if (!formState.slug.trim()) return "Slug is required.";
    if (!formState.name.trim()) return "Name is required.";
    if (!formState.tagline.trim()) return "Tagline is required.";
    if (!formState.description.trim()) return "Description is required.";
    if (!formState.longDescription.trim()) return "Long description is required.";
    if (!formState.image.trim()) return "Main image URL is required.";
    if (!formState.categoryId.trim()) return "Category id is required.";

    return null;
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);

    const validationError = validateForm(mode);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSavingProduct(true);

    try {
      if (mode === "create") {
        const payload = buildProductCreatePayload();
        await commerceApi.admin.products.create<MutateProductResponse, typeof payload>(payload);
        setFormMessage("Product created successfully.");
        resetForm("create");
      } else {
        if (!editingProductId) {
          setFormError("No product selected for edit.");
          setIsSavingProduct(false);
          return;
        }

        const payload = buildProductPatchPayload();
        await commerceApi.admin.products.update<MutateProductResponse, typeof payload>(editingProductId, payload);
        setFormMessage("Product updated successfully.");
      }

      await loadProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to save product right now.");
      }
    } finally {
      setIsSavingProduct(false);
    }
  }

  function addVariantRow() {
    setFormState((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          localKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          persisted: false,
          originalId: "",
          frontendVariantId: "",
          label: "",
          price: "0",
          unit: "",
          stock: "0",
          sku: "",
          isActive: true,
          isSaving: false
        }
      ]
    }));
  }

  function updateVariant(localKey: string, updater: (variant: FormVariant) => FormVariant) {
    setFormState((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.localKey === localKey ? updater(variant) : variant
      )
    }));
  }

  function removeVariantRow(localKey: string) {
    setFormState((current) => ({
      ...current,
      variants: current.variants.filter((variant) => variant.localKey !== localKey)
    }));
  }

  async function saveVariant(variant: FormVariant) {
    if (mode !== "edit" || !editingProductId) {
      return;
    }

    const trimmedId = variant.frontendVariantId.trim();
    const trimmedLabel = variant.label.trim();
    const trimmedUnit = variant.unit.trim();

    if (!trimmedId || !trimmedLabel || !trimmedUnit) {
      setFormError("Variant id, label, and unit are required.");
      return;
    }

    updateVariant(variant.localKey, (current) => ({ ...current, isSaving: true }));
    setFormError(null);

    try {
      if (variant.persisted) {
        const payload = {
          frontendVariantId: trimmedId,
          label: trimmedLabel,
          price: toNumber(variant.price),
          unit: trimmedUnit,
          stock: toNumber(variant.stock),
          sku: variant.sku.trim() || undefined,
          isActive: variant.isActive
        };

        const response = await commerceApi.admin.products.updateVariant<VariantMutationResponse, typeof payload>(
          editingProductId,
          variant.originalId,
          payload
        );

        updateVariant(variant.localKey, (current) => ({
          ...current,
          originalId: response.data.id,
          frontendVariantId: response.data.id,
          label: response.data.label,
          price: String(response.data.price),
          unit: response.data.unit,
          stock: String(response.data.stock),
          sku: response.data.sku ?? "",
          isActive: response.data.isActive,
          isSaving: false,
          persisted: true
        }));
      } else {
        const payload = {
          frontendVariantId: trimmedId,
          label: trimmedLabel,
          price: toNumber(variant.price),
          unit: trimmedUnit,
          stock: toNumber(variant.stock),
          sku: variant.sku.trim() || undefined,
          isActive: variant.isActive
        };

        const response = await commerceApi.admin.products.createVariant<VariantMutationResponse, typeof payload>(
          editingProductId,
          payload
        );

        updateVariant(variant.localKey, (current) => ({
          ...current,
          originalId: response.data.id,
          frontendVariantId: response.data.id,
          label: response.data.label,
          price: String(response.data.price),
          unit: response.data.unit,
          stock: String(response.data.stock),
          sku: response.data.sku ?? "",
          isActive: response.data.isActive,
          isSaving: false,
          persisted: true
        }));
      }

      await loadProducts();
    } catch (error) {
      updateVariant(variant.localKey, (current) => ({ ...current, isSaving: false }));
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to save variant.");
      }
    }
  }

  async function deactivateVariant(variant: FormVariant) {
    if (mode !== "edit" || !editingProductId || !variant.persisted) {
      removeVariantRow(variant.localKey);
      return;
    }

    if (!window.confirm(`Deactivate variant \"${variant.frontendVariantId}\"?`)) {
      return;
    }

    updateVariant(variant.localKey, (current) => ({ ...current, isSaving: true }));

    try {
      await commerceApi.admin.products.softDeleteVariant<VariantDeleteResponse>(
        editingProductId,
        variant.originalId
      );
      updateVariant(variant.localKey, (current) => ({
        ...current,
        isActive: false,
        isSaving: false
      }));
      await loadProducts();
    } catch (error) {
      updateVariant(variant.localKey, (current) => ({ ...current, isSaving: false }));
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to deactivate variant.");
      }
    }
  }

  const listStockSummary = useMemo(() => {
    return new Map(
      products.map((product) => {
        const active = product.variants.filter((variant) => variant.isActive);
        const activeStock = active.reduce((sum, variant) => sum + variant.stock, 0);
        const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
        return [product.id, { activeStock, totalStock, variantCount: product.variants.length }];
      })
    );
  }, [products]);

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--coral)]">Admin Products</p>
            <h1 className="mt-2 text-3xl font-semibold">Products, variants, and images</h1>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === "create" ? "primary" : "secondary"}
              onClick={() => resetForm("create")}
            >
              New product
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void loadProducts();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Search</span>
            <Input
              className="mt-2"
              placeholder="Name, slug, id..."
              value={filters.search}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, search: event.target.value }));
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Availability</span>
            <Select
              className="mt-2"
              value={filters.availability}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({
                  ...current,
                  availability: event.target.value as Filters["availability"]
                }));
              }}
            >
              <option value="all">All</option>
              <option value="available">Available</option>
              <option value="coming-soon">Coming soon</option>
            </Select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Active</span>
            <Select
              className="mt-2"
              value={filters.isActive}
              onChange={(event) => {
                setPage(1);
                setFilters((current) => ({ ...current, isActive: event.target.value as Filters["isActive"] }));
              }}
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Items/page</span>
            <Select
              className="mt-2"
              value={String(limit)}
              onChange={(event) => {
                setPage(1);
                setLimit(Number(event.target.value));
              }}
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </label>
        </div>

        {listError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
            {listError}
          </div>
        ) : null}

        {isLoadingList ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-4 text-sm text-[var(--muted)]">
            No products found for current filters.
          </div>
        ) : (
          <>
            <div className="mt-4 hidden overflow-x-auto rounded-lg border border-[var(--line)] lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--mint)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                  <tr>
                    <th className="px-3 py-3">Product</th>
                    <th className="px-3 py-3">Slug</th>
                    <th className="px-3 py-3">Category</th>
                    <th className="px-3 py-3">Price</th>
                    <th className="px-3 py-3">Stock</th>
                    <th className="px-3 py-3">Flags</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stock = listStockSummary.get(product.id);
                    return (
                      <tr className="border-t border-[var(--line)]" key={product.id}>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt={product.name} className="h-12 w-12 rounded object-cover" src={product.image} />
                            <div>
                              <p className="font-semibold">{product.name}</p>
                              <p className="text-xs text-[var(--muted)]">{product.availability}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">{product.slug}</td>
                        <td className="px-3 py-3 text-xs">{product.category.name}</td>
                        <td className="px-3 py-3">{formatPrice(product.price)}</td>
                        <td className="px-3 py-3 text-xs">
                          {stock?.activeStock ?? 0} active / {stock?.totalStock ?? 0} total
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <div className="flex flex-wrap gap-1">
                            <span className={`rounded px-2 py-1 ${product.isActive ? "bg-[var(--mint)]" : "bg-[#fff3f2]"}`}>
                              {product.isActive ? "active" : "inactive"}
                            </span>
                            {product.isFeatured ? <span className="rounded bg-[var(--mint)] px-2 py-1">featured</span> : null}
                            {product.isBestSeller ? <span className="rounded bg-[var(--mint)] px-2 py-1">best seller</span> : null}
                            {product.isNew ? <span className="rounded bg-[var(--mint)] px-2 py-1">new</span> : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button type="button" variant="secondary" onClick={() => void beginEdit(product.id)}>
                              Edit
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => void handleSoftDeleteProduct(product)}>
                              Deactivate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid gap-3 lg:hidden">
              {products.map((product) => {
                const stock = listStockSummary.get(product.id);
                return (
                  <article className="rounded-lg border border-[var(--line)] bg-white p-4" key={product.id}>
                    <div className="flex gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img alt={product.name} className="h-14 w-14 rounded object-cover" src={product.image} />
                      <div className="min-w-0">
                        <p className="font-semibold">{product.name}</p>
                        <p className="truncate text-xs text-[var(--muted)]">{product.slug}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{product.category.name}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm">{formatPrice(product.price)}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Stock: {stock?.activeStock ?? 0} active / {stock?.totalStock ?? 0} total
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Button className="flex-1" type="button" variant="secondary" onClick={() => void beginEdit(product.id)}>
                        Edit
                      </Button>
                      <Button className="flex-1" type="button" variant="ghost" onClick={() => void handleSoftDeleteProduct(product)}>
                        Deactivate
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <p className="text-[var(--muted)]">
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)} ({pagination.total} products)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pagination.totalPages === 0 || page >= pagination.totalPages}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      <form className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7" onSubmit={(event) => void saveProduct(event)}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold">{mode === "create" ? "Create product" : "Edit product"}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {mode === "create"
                ? "Create a product with variants and gallery assets."
                : "Update product fields and manage variants."}
            </p>
            <p className="mt-2 text-xs text-[var(--coral)]">Slug and ID are important identifiers. Change carefully.</p>
          </div>
          {mode === "edit" ? (
            <Button type="button" variant="secondary" onClick={() => resetForm("create")}>Switch to create</Button>
          ) : null}
        </div>

        {formError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">{formError}</div>
        ) : null}
        {formMessage ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">{formMessage}</div>
        ) : null}
        {uploadError ? (
          <div className="mt-4 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">{uploadError}</div>
        ) : null}
        {isLoadingFormProduct ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--muted)]">Loading product details...</div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="text-sm font-semibold">ID</span>
            <Input
              className="mt-2"
              value={formState.id}
              disabled={mode === "edit"}
              onChange={(event) => setFormState((current) => ({ ...current, id: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Slug</span>
            <Input
              className="mt-2"
              value={formState.slug}
              onChange={(event) => setFormState((current) => ({ ...current, slug: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Name</span>
            <Input
              className="mt-2"
              value={formState.name}
              onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Tagline</span>
            <Input
              className="mt-2"
              value={formState.tagline}
              onChange={(event) => setFormState((current) => ({ ...current, tagline: event.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold">Description</span>
            <Textarea
              className="mt-2 min-h-20"
              value={formState.description}
              onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold">Long Description</span>
            <Textarea
              className="mt-2 min-h-28"
              value={formState.longDescription}
              onChange={(event) => setFormState((current) => ({ ...current, longDescription: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Price</span>
            <Input
              className="mt-2"
              type="number"
              min={0}
              value={formState.price}
              onChange={(event) => setFormState((current) => ({ ...current, price: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Compare At Price</span>
            <Input
              className="mt-2"
              type="number"
              min={0}
              value={formState.compareAtPrice}
              onChange={(event) => setFormState((current) => ({ ...current, compareAtPrice: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Promo Label</span>
            <Input
              className="mt-2"
              value={formState.promoLabel}
              onChange={(event) => setFormState((current) => ({ ...current, promoLabel: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Currency</span>
            <Input className="mt-2" value={formState.currency} disabled />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold">Main Image URL</span>
            <Input
              className="mt-2"
              value={formState.image}
              onChange={(event) => setFormState((current) => ({ ...current, image: event.target.value }))}
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file, "main");
                  event.currentTarget.value = "";
                }}
              />
              <span className="text-xs text-[var(--muted)]">
                {isUploadingMainImage ? "Uploading main image..." : "Upload to Cloudinary"}
              </span>
            </div>
          </label>

          <div className="sm:col-span-2">
            <span className="text-sm font-semibold">Gallery URLs</span>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="https://..."
                value={galleryInput}
                onChange={(event) => setGalleryInput(event.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const nextUrl = galleryInput.trim();
                  if (!nextUrl) return;
                  setFormState((current) => ({
                    ...current,
                    gallery: current.gallery.includes(nextUrl) ? current.gallery : [...current.gallery, nextUrl]
                  }));
                  setGalleryInput("");
                }}
              >
                Add URL
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImage(file, "gallery");
                  event.currentTarget.value = "";
                }}
              />
              <span className="text-xs text-[var(--muted)]">
                {isUploadingGalleryImage ? "Uploading gallery image..." : "Upload and append to gallery"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {formState.gallery.map((url, index) => (
                <div className="rounded border border-[var(--line)] bg-[var(--mint)] px-2 py-1 text-xs" key={`${url}-${index}`}>
                  <div className="flex items-center gap-2">
                    <span className="max-w-[220px] truncate">{url}</span>
                    <button
                      type="button"
                      className="text-[var(--coral)]"
                      onClick={() => {
                        setFormState((current) => ({
                          ...current,
                          gallery: current.gallery.filter((_, i) => i !== index)
                        }));
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <label>
            <span className="text-sm font-semibold">Category ID</span>
            <Input
              className="mt-2"
              value={formState.categoryId}
              onChange={(event) => setFormState((current) => ({ ...current, categoryId: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Availability</span>
            <Select
              className="mt-2"
              value={formState.availability}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  availability: event.target.value as Availability
                }))
              }
            >
              <option value="available">available</option>
              <option value="coming-soon">coming-soon</option>
            </Select>
          </label>
          <label>
            <span className="text-sm font-semibold">Release Note</span>
            <Input
              className="mt-2"
              value={formState.releaseNote}
              onChange={(event) => setFormState((current) => ({ ...current, releaseNote: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Badge Label</span>
            <Input
              className="mt-2"
              value={formState.badgeLabel}
              onChange={(event) => setFormState((current) => ({ ...current, badgeLabel: event.target.value }))}
            />
          </label>
          <label>
            <span className="text-sm font-semibold">Popularity</span>
            <Input
              className="mt-2"
              type="number"
              min={0}
              value={formState.popularity}
              onChange={(event) => setFormState((current) => ({ ...current, popularity: event.target.value }))}
            />
          </label>

          <label className="sm:col-span-2">
            <span className="text-sm font-semibold">Ingredients (comma or new line separated)</span>
            <Textarea
              className="mt-2 min-h-20"
              value={formState.ingredientsText}
              onChange={(event) => setFormState((current) => ({ ...current, ingredientsText: event.target.value }))}
            />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold">Benefits (comma or new line separated)</span>
            <Textarea
              className="mt-2 min-h-20"
              value={formState.benefitsText}
              onChange={(event) => setFormState((current) => ({ ...current, benefitsText: event.target.value }))}
            />
          </label>

          <div className="sm:col-span-2 grid gap-2 sm:grid-cols-4">
            <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm">
              <input
                checked={formState.isActive}
                type="checkbox"
                onChange={(event) => setFormState((current) => ({ ...current, isActive: event.target.checked }))}
              />
              Active
            </label>
            <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm">
              <input
                checked={formState.isFeatured}
                type="checkbox"
                onChange={(event) => setFormState((current) => ({ ...current, isFeatured: event.target.checked }))}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm">
              <input
                checked={formState.isBestSeller}
                type="checkbox"
                onChange={(event) => setFormState((current) => ({ ...current, isBestSeller: event.target.checked }))}
              />
              Best seller
            </label>
            <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm">
              <input
                checked={formState.isNew}
                type="checkbox"
                onChange={(event) => setFormState((current) => ({ ...current, isNew: event.target.checked }))}
              />
              New
            </label>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-[var(--line)] bg-[#f8fbf9] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Variants</h3>
            <Button type="button" variant="secondary" onClick={addVariantRow}>
              Add variant
            </Button>
          </div>

          <div className="space-y-3">
            {formState.variants.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No variants added yet.</p>
            ) : (
              formState.variants.map((variant) => (
                <div className="rounded border border-[var(--line)] bg-white p-3" key={variant.localKey}>
                  <div className="grid gap-2 md:grid-cols-6">
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Variant Id</span>
                      <Input
                        className="mt-1"
                        value={variant.frontendVariantId}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            frontendVariantId: event.target.value
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Label</span>
                      <Input
                        className="mt-1"
                        value={variant.label}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({ ...current, label: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Price</span>
                      <Input
                        className="mt-1"
                        min={0}
                        type="number"
                        value={variant.price}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({ ...current, price: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Unit</span>
                      <Input
                        className="mt-1"
                        value={variant.unit}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({ ...current, unit: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Stock</span>
                      <Input
                        className="mt-1"
                        min={0}
                        type="number"
                        value={variant.stock}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({ ...current, stock: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">SKU</span>
                      <Input
                        className="mt-1"
                        value={variant.sku}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({ ...current, sku: event.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={variant.isActive}
                        type="checkbox"
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            isActive: event.target.checked
                          }))
                        }
                      />
                      Active
                    </label>

                    {mode === "edit" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={variant.isSaving}
                        onClick={() => void saveVariant(variant)}
                      >
                        {variant.isSaving ? "Saving..." : "Save variant"}
                      </Button>
                    ) : null}

                    <Button
                      type="button"
                      variant="ghost"
                      disabled={variant.isSaving}
                      onClick={() => void deactivateVariant(variant)}
                    >
                      {variant.persisted ? "Deactivate" : "Remove"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="submit" disabled={isSavingProduct || isLoadingFormProduct}>
            {isSavingProduct ? "Saving..." : mode === "create" ? "Create product" : "Save product"}
          </Button>
          {mode === "edit" && editingProductId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                const snapshot = products.find((product) => product.id === editingProductId);
                if (!snapshot) return;
                void handleSoftDeleteProduct(snapshot);
              }}
            >
              Deactivate product
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
