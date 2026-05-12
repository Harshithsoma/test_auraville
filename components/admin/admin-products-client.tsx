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

type AdminCategoryOption = {
  id: string;
  name: string;
  slug: string;
};

type ListCategoriesResponse = {
  data: AdminCategoryOption[];
};

type FormVariant = {
  localKey: string;
  persisted: boolean;
  originalId: string;
  packSize: string;
  frontendVariantId: string;
  label: string;
  price: string;
  unit: string;
  stock: string;
  sku: string;
  skuManuallyEdited: boolean;
  isActive: boolean;
  isSaving: boolean;
};

type ProductFormState = {
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
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LOW_STOCK_THRESHOLD = 5;

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
    packSize: packSizeFromVariantId(variant.id),
    frontendVariantId: variant.id,
    label: variant.label,
    price: String(variant.price),
    unit: variant.unit,
    stock: String(variant.stock),
    sku: variant.sku ?? "",
    skuManuallyEdited: true,
    isActive: variant.isActive,
    isSaving: false
  };
}

function defaultForm(): ProductFormState {
  return {
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

function slugifyName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function ensureUniqueSlugSuffix(baseSlug: string, attempt: number): string {
  if (attempt <= 0) return baseSlug;
  return `${baseSlug}-${attempt}`;
}

function parsePackSize(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function packSizeFromVariantId(value: string): string {
  const match = /^pack-(\d+)$/i.exec(value.trim());
  return match ? match[1] : "";
}

function toVariantId(packSize: number): string {
  return `pack-${packSize}`;
}

function toVariantLabel(packSize: number): string {
  return `Pack of ${packSize}`;
}

function toVariantSku(baseSlug: string, packSize: number): string {
  const safeBase = baseSlug
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
  if (!safeBase) {
    return `PACK-${packSize}`;
  }
  return `${safeBase}-PACK-${packSize}`;
}

type VariantMutationPayload = {
  frontendVariantId: string;
  label: string;
  price: number;
  unit: string;
  stock: number;
  sku?: string;
  isActive: boolean;
};

export function AdminProductsClient() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listMessage, setListMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<AdminCategoryOption[]>([]);

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
  const [busyProductActionId, setBusyProductActionId] = useState<string | null>(null);
  const [galleryInput, setGalleryInput] = useState("");

  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [isUploadingGalleryImage, setIsUploadingGalleryImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  async function loadCategories() {
    try {
      const response = await commerceApi.admin.categories.list<ListCategoriesResponse>();
      setCategories(response.data);
    } catch {
      setCategories([]);
    }
  }

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

  useEffect(() => {
    void loadCategories();
  }, []);

  function resetForm(modeValue: FormMode) {
    setMode(modeValue);
    setEditingProductId(null);
    setFormState(defaultForm());
    setGalleryInput("");
    setFormError(null);
    setFormMessage(null);
    setUploadError(null);
    setIsSlugManuallyEdited(false);
  }

  async function beginEdit(productId: string) {
    setBusyProductActionId(productId);
    setMode("edit");
    setEditingProductId(productId);
    setFormError(null);
    setFormMessage(null);
    setUploadError(null);
    setIsLoadingFormProduct(true);

    try {
      const response = await commerceApi.admin.products.byId<GetProductResponse>(productId);
      setFormState(productToForm(response.data));
      setIsSlugManuallyEdited(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError("Unable to load product details.");
      }
    } finally {
      setIsLoadingFormProduct(false);
      setBusyProductActionId(null);
    }
  }

  async function handleSoftDeleteProduct(product: AdminProduct) {
    const actionLabel = product.isActive ? "Deactivate" : "Activate";
    if (!window.confirm(`${actionLabel} product "${product.name}"?`)) {
      return;
    }

    setBusyProductActionId(product.id);
    setListError(null);
    setListMessage(null);

    try {
      if (product.isActive) {
        await commerceApi.admin.products.softDelete<DeleteProductResponse>(product.id);
      } else {
        const payload = { isActive: true };
        await commerceApi.admin.products.update<MutateProductResponse, typeof payload>(product.id, payload);
      }
      const nextActive = !product.isActive;
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? { ...item, isActive: nextActive } : item))
      );
      setListMessage(
        nextActive
          ? `Product "${product.name}" activated successfully.`
          : `Product "${product.name}" deactivated successfully.`
      );
      if (editingProductId === product.id) {
        setFormState((current) => ({ ...current, isActive: nextActive }));
      }
      await loadProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setListError(error.message);
      } else {
        setListError(
          product.isActive
            ? "Unable to deactivate product."
            : "Unable to activate product."
        );
      }
    } finally {
      setBusyProductActionId(null);
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

  async function uploadGalleryImages(files: File[]) {
    if (files.length === 0) return;
    setIsUploadingGalleryImage(true);
    setUploadError(null);

    try {
      for (const file of files) {
        const response = await commerceApi.admin.uploads.uploadImage<UploadImageResponse>(file);
        const nextUrl = response.data.secureUrl || response.data.url;
        setFormState((current) => ({
          ...current,
          gallery: current.gallery.includes(nextUrl) ? current.gallery : [...current.gallery, nextUrl]
        }));
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setUploadError(error.message);
      } else {
        setUploadError("Gallery image upload failed.");
      }
    } finally {
      setIsUploadingGalleryImage(false);
    }
  }

  function buildProductCreatePayload(effectiveSlug: string) {
    return {
      slug: effectiveSlug,
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
        frontendVariantId: toVariantId(parsePackSize(variant.packSize) ?? 1),
        label: toVariantLabel(parsePackSize(variant.packSize) ?? 1),
        price: toNumber(variant.price),
        unit: "pack",
        stock: toNumber(variant.stock),
        sku:
          (variant.sku.trim() ||
            toVariantSku(effectiveSlug, parsePackSize(variant.packSize) ?? 1)) || undefined,
        isActive: variant.isActive
      }))
    };
  }

  function buildProductPatchPayload(effectiveSlug: string) {
    return {
      slug: effectiveSlug,
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

  function validateForm(effectiveSlug: string): string | null {
    if (!effectiveSlug) return "Slug is required.";
    if (!slugPattern.test(effectiveSlug)) {
      return "Slug must use lowercase letters, numbers, and hyphens only.";
    }
    if (!formState.name.trim()) return "Name is required.";
    if (!formState.tagline.trim()) return "Tagline is required.";
    if (!formState.description.trim()) return "Description is required.";
    if (!formState.longDescription.trim()) return "Long description is required.";
    if (!formState.image.trim()) return "Main image URL is required.";
    if (!formState.categoryId.trim()) return "Category is required.";
    if (mode === "create" && formState.variants.length === 0) {
      return "Add at least one variant with stock before creating product.";
    }

    const seenPackSizes = new Set<number>();
    const hasActiveStock = formState.variants.some(
      (variant) => variant.isActive && toNumber(variant.stock) > 0
    );
    if (mode === "create" && !hasActiveStock) {
      return "Add at least one active variant with stock greater than zero.";
    }

    for (const variant of formState.variants) {
      const stockValue = Number(variant.stock);
      const priceValue = Number(variant.price);
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        return "Variant price must be 0 or more.";
      }
      if (!Number.isFinite(stockValue) || stockValue < 0) {
        return "Variant stock must be 0 or more.";
      }
      const packSize = parsePackSize(variant.packSize);
      if (!packSize && !variant.persisted) {
        return "Pack size must be greater than zero.";
      }
      if (!packSize) {
        continue;
      }
      if (seenPackSizes.has(packSize)) {
        return "Duplicate pack sizes are not allowed for the same product.";
      }
      seenPackSizes.add(packSize);
    }

    return null;
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFormMessage(null);
    setListMessage(null);

    const autoSlug = slugifyName(formState.name);
    const effectiveSlug = (formState.slug.trim() || autoSlug).trim();
    const validationError = validateForm(effectiveSlug);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setIsSavingProduct(true);

    try {
      if (mode === "create") {
        const baseCreatePayload = buildProductCreatePayload(effectiveSlug);
        let createdSlug = effectiveSlug;
        let createdResponse: MutateProductResponse | null = null;

        for (let attempt = 0; attempt < 4; attempt += 1) {
          const candidateSlug = ensureUniqueSlugSuffix(effectiveSlug, attempt);
          const payload = { ...baseCreatePayload, slug: candidateSlug };
          try {
            createdResponse = await commerceApi.admin.products.create<MutateProductResponse, typeof payload>(payload);
            createdSlug = candidateSlug;
            break;
          } catch (error) {
            if (error instanceof ApiError && error.code === "SLUG_ALREADY_EXISTS" && !isSlugManuallyEdited) {
              continue;
            }
            throw error;
          }
        }

        if (!createdResponse) {
          setFormError("A product with this slug already exists. Please edit the slug.");
          return;
        }

        const createSuccessMessage =
          createdSlug !== effectiveSlug
            ? `Product created successfully. Slug set to "${createdSlug}" to avoid a duplicate.`
            : "Product created successfully.";
        resetForm("create");
        setFormMessage(createSuccessMessage);
        void loadCategories();
      } else {
        if (!editingProductId) {
          setFormError("No product selected for edit.");
          setIsSavingProduct(false);
          return;
        }

        const payload = buildProductPatchPayload(effectiveSlug);
        await commerceApi.admin.products.update<MutateProductResponse, typeof payload>(editingProductId, payload);
        await persistPendingVariantsForEdit(editingProductId, effectiveSlug);
        setFormMessage("Product updated successfully.");
      }

      await loadProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "SLUG_ALREADY_EXISTS") {
          setFormError("A product with this slug already exists. Please edit the slug.");
          return;
        }
        setFormError(error.message);
      } else {
        setFormError((current) => current ?? "Unable to save product right now.");
      }
    } finally {
      setIsSavingProduct(false);
    }
  }

  function addVariantRow(presetPackSize?: number) {
    const packValue = presetPackSize ? String(presetPackSize) : "";
    setFormState((current) => ({
      ...current,
      variants: [
        ...current.variants,
        {
          localKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          persisted: false,
          originalId: "",
          packSize: packValue,
          frontendVariantId: presetPackSize ? toVariantId(presetPackSize) : "",
          label: presetPackSize ? toVariantLabel(presetPackSize) : "",
          price: "0",
          unit: "pack",
          stock: "0",
          sku:
            presetPackSize && (current.slug.trim() || slugifyName(current.name))
              ? toVariantSku(current.slug.trim() || slugifyName(current.name), presetPackSize)
              : "",
          skuManuallyEdited: false,
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

  function prepareVariantMutation(variant: FormVariant, effectiveSlug: string): {
    payload: VariantMutationPayload;
    packSize: number | null;
    generatedId: string;
  } | null {
    const packSize = parsePackSize(variant.packSize);
    if (!packSize && !variant.persisted) {
      setFormError("Pack size must be greater than zero.");
      return null;
    }

    const generatedId = packSize !== null ? toVariantId(packSize) : variant.frontendVariantId.trim();
    const generatedLabel = packSize !== null ? toVariantLabel(packSize) : variant.label.trim();
    const generatedSku = packSize !== null ? toVariantSku(effectiveSlug, packSize) : variant.sku.trim();

    if (!generatedId || !generatedLabel) {
      setFormError("Variant id and label are required.");
      return null;
    }

    return {
      packSize,
      generatedId,
      payload: {
        frontendVariantId: generatedId,
        label: generatedLabel,
        price: toNumber(variant.price),
        unit: variant.unit.trim() || "pack",
        stock: toNumber(variant.stock),
        sku: variant.sku.trim() || generatedSku || undefined,
        isActive: variant.isActive
      }
    };
  }

  async function persistPendingVariantsForEdit(productId: string, effectiveSlug: string) {
    const pendingVariants = formState.variants.filter((variant) => !variant.persisted);
    if (pendingVariants.length === 0) {
      return;
    }

    for (const pendingVariant of pendingVariants) {
      const prepared = prepareVariantMutation(pendingVariant, effectiveSlug);
      if (!prepared) {
        throw new Error("Variant validation failed.");
      }

      const response = await commerceApi.admin.products.createVariant<VariantMutationResponse, VariantMutationPayload>(
        productId,
        prepared.payload
      );

      setFormState((current) => ({
        ...current,
        variants: current.variants.map((row) =>
          row.localKey === pendingVariant.localKey
            ? {
                ...row,
                packSize: prepared.packSize !== null ? String(prepared.packSize) : row.packSize,
                originalId: response.data.id,
                frontendVariantId: response.data.id,
                label: response.data.label,
                price: String(response.data.price),
                unit: response.data.unit,
                stock: String(response.data.stock),
                sku: response.data.sku ?? "",
                skuManuallyEdited: true,
                isActive: response.data.isActive,
                persisted: true,
                isSaving: false
              }
            : row
        )
      }));
    }
  }

  async function saveVariant(variant: FormVariant) {
    if (mode !== "edit" || !editingProductId) {
      return;
    }

    const packSize = parsePackSize(variant.packSize);
    const duplicateCount =
      packSize === null
        ? 0
        : formState.variants.filter(
            (row) => row.localKey !== variant.localKey && parsePackSize(row.packSize) === packSize
          ).length;
    if (packSize !== null && duplicateCount > 0) {
      setFormError(`Pack of ${packSize} already exists for this product.`);
      return;
    }

    const effectiveSlug = (formState.slug.trim() || slugifyName(formState.name)).trim();

    if (!effectiveSlug) {
      setFormError("Product name or slug is required before adding variants.");
      return;
    }

    const prepared = prepareVariantMutation(variant, effectiveSlug);
    if (!prepared) {
      return;
    }

    updateVariant(variant.localKey, (current) => ({ ...current, isSaving: true }));
    setFormError(null);

    try {
      if (variant.persisted) {
        const response = await commerceApi.admin.products.updateVariant<VariantMutationResponse, VariantMutationPayload>(
          editingProductId,
          variant.originalId,
          prepared.payload
        );

        updateVariant(variant.localKey, (current) => ({
          ...current,
          packSize: packSizeFromVariantId(response.data.id) || current.packSize,
          originalId: response.data.id,
          frontendVariantId: response.data.id,
          label: response.data.label,
          price: String(response.data.price),
          unit: response.data.unit,
          stock: String(response.data.stock),
          sku: response.data.sku ?? "",
          skuManuallyEdited: true,
          isActive: response.data.isActive,
          isSaving: false,
          persisted: true
        }));
        setFormMessage(`Variant "${prepared.generatedId}" updated.`);
      } else {
        const response = await commerceApi.admin.products.createVariant<VariantMutationResponse, VariantMutationPayload>(
          editingProductId,
          prepared.payload
        );

        updateVariant(variant.localKey, (current) => ({
          ...current,
          packSize: prepared.packSize !== null ? String(prepared.packSize) : current.packSize,
          originalId: response.data.id,
          frontendVariantId: response.data.id,
          label: response.data.label,
          price: String(response.data.price),
          unit: response.data.unit,
          stock: String(response.data.stock),
          sku: response.data.sku ?? "",
          skuManuallyEdited: true,
          isActive: response.data.isActive,
          isSaving: false,
          persisted: true
        }));
        setFormMessage(`Variant "${prepared.generatedId}" created.`);
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

  async function toggleVariantActiveState(variant: FormVariant) {
    if (mode !== "edit" || !editingProductId || !variant.persisted) {
      removeVariantRow(variant.localKey);
      return;
    }

    const actionLabel = variant.isActive ? "Deactivate" : "Activate";
    if (!window.confirm(`${actionLabel} variant "${variant.frontendVariantId}"?`)) {
      return;
    }

    updateVariant(variant.localKey, (current) => ({ ...current, isSaving: true }));

    try {
      if (variant.isActive) {
        await commerceApi.admin.products.softDeleteVariant<VariantDeleteResponse>(
          editingProductId,
          variant.originalId
        );
      } else {
        await commerceApi.admin.products.updateVariant<VariantMutationResponse, Pick<VariantMutationPayload, "isActive">>(
          editingProductId,
          variant.originalId,
          {
            isActive: true
          }
        );
      }
      updateVariant(variant.localKey, (current) => ({
        ...current,
        isActive: !variant.isActive,
        isSaving: false
      }));
      setFormMessage(
        variant.isActive
          ? `Variant "${variant.frontendVariantId}" deactivated.`
          : `Variant "${variant.frontendVariantId}" activated.`
      );
      await loadProducts();
    } catch (error) {
      updateVariant(variant.localKey, (current) => ({ ...current, isSaving: false }));
      if (error instanceof ApiError) {
        setFormError(error.message);
      } else {
        setFormError(variant.isActive ? "Unable to deactivate variant." : "Unable to activate variant.");
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

  function getVisibilityHint(product: AdminProduct): { label: string; tone: "good" | "warn" | "bad" } {
    const stock = listStockSummary.get(product.id);
    const activeStock = stock?.activeStock ?? 0;
    const activeVariants = product.variants.filter((variant) => variant.isActive);

    if (!product.isActive) {
      return { label: "Hidden: inactive", tone: "bad" };
    }

    if (!product.image?.trim()) {
      return { label: "Hidden: missing image", tone: "bad" };
    }

    if (!product.category?.name?.trim()) {
      return { label: "Hidden: missing category", tone: "bad" };
    }

    if (product.availability !== "available") {
      return { label: "Hidden: coming soon", tone: "warn" };
    }

    if (activeVariants.length === 0) {
      return { label: "Hidden: no active variant", tone: "warn" };
    }

    if (activeStock <= 0) {
      return { label: "Hidden: no stock", tone: "warn" };
    }

    return { label: "Visible on store", tone: "good" };
  }

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
        {listMessage ? (
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-sm text-[var(--leaf-deep)]">
            {listMessage}
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
                    <th className="px-3 py-3">Storefront</th>
                    <th className="px-3 py-3">Flags</th>
                    <th className="px-3 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const stock = listStockSummary.get(product.id);
                    const visibility = getVisibilityHint(product);
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
                          <p>{stock?.activeStock ?? 0} active / {stock?.totalStock ?? 0} total</p>
                          <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wide">
                            {(stock?.activeStock ?? 0) <= 0 ? (
                              <span className="rounded bg-[#fff3f2] px-2 py-1 text-[var(--coral)]">Out of stock</span>
                            ) : (stock?.activeStock ?? 0) <= LOW_STOCK_THRESHOLD ? (
                              <span className="rounded bg-[#fff7e8] px-2 py-1 text-[#9b6a1b]">Low stock</span>
                            ) : (
                              <span className="rounded bg-[var(--mint)] px-2 py-1 text-[var(--leaf-deep)]">In stock</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <span
                            className={`rounded px-2 py-1 text-[11px] font-semibold ${
                              visibility.tone === "good"
                                ? "bg-[var(--mint)] text-[var(--leaf-deep)]"
                                : visibility.tone === "warn"
                                  ? "bg-[#fff7e8] text-[#9b6a1b]"
                                  : "bg-[#fff3f2] text-[var(--coral)]"
                            }`}
                          >
                            {visibility.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={`rounded px-2 py-1 ${
                                product.isActive
                                  ? "bg-[var(--mint)] text-[var(--leaf-deep)]"
                                  : "bg-[#fff3f2] text-[var(--coral)]"
                              }`}
                            >
                              {product.isActive ? "active" : "inactive"}
                            </span>
                            {product.isFeatured ? (
                              <span className="rounded bg-[var(--mint)] px-2 py-1 text-[var(--leaf-deep)]">featured</span>
                            ) : null}
                            {product.isBestSeller ? (
                              <span className="rounded bg-[var(--mint)] px-2 py-1 text-[var(--leaf-deep)]">best seller</span>
                            ) : null}
                            {product.isNew ? (
                              <span className="rounded bg-[var(--mint)] px-2 py-1 text-[var(--leaf-deep)]">new</span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={busyProductActionId === product.id}
                              onClick={() => void beginEdit(product.id)}
                            >
                              {busyProductActionId === product.id ? "Opening..." : "Edit"}
                            </Button>
                            <Button
                              type="button"
                              variant={product.isActive ? "destructive" : "primary"}
                              disabled={busyProductActionId === product.id}
                              onClick={() => void handleSoftDeleteProduct(product)}
                            >
                              {busyProductActionId === product.id
                                ? product.isActive
                                  ? "Deactivating..."
                                  : "Activating..."
                                : product.isActive
                                  ? "Deactivate"
                                  : "Activate"}
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
                const visibility = getVisibilityHint(product);
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
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
                      {(stock?.activeStock ?? 0) <= 0 ? (
                        <span className="rounded bg-[#fff3f2] px-2 py-1 text-[var(--coral)]">Out of stock</span>
                      ) : (stock?.activeStock ?? 0) <= LOW_STOCK_THRESHOLD ? (
                        <span className="rounded bg-[#fff7e8] px-2 py-1 text-[#9b6a1b]">Low stock</span>
                      ) : (
                        <span className="rounded bg-[var(--mint)] px-2 py-1 text-[var(--leaf-deep)]">In stock</span>
                      )}
                    </div>
                    <div className="mt-2">
                      <span
                        className={`rounded px-2 py-1 text-[11px] font-semibold ${
                          visibility.tone === "good"
                            ? "bg-[var(--mint)] text-[var(--leaf-deep)]"
                            : visibility.tone === "warn"
                              ? "bg-[#fff7e8] text-[#9b6a1b]"
                              : "bg-[#fff3f2] text-[var(--coral)]"
                        }`}
                      >
                        {visibility.label}
                      </span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        className="flex-1"
                        type="button"
                        variant="secondary"
                        disabled={busyProductActionId === product.id}
                        onClick={() => void beginEdit(product.id)}
                      >
                        {busyProductActionId === product.id ? "Opening..." : "Edit"}
                      </Button>
                      <Button
                        className="flex-1"
                        type="button"
                        variant={product.isActive ? "destructive" : "primary"}
                        disabled={busyProductActionId === product.id}
                        onClick={() => void handleSoftDeleteProduct(product)}
                      >
                        {busyProductActionId === product.id
                          ? product.isActive
                            ? "Deactivating..."
                            : "Activating..."
                          : product.isActive
                            ? "Deactivate"
                            : "Activate"}
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
            <p className="mt-2 text-xs text-[var(--coral)]">
              Slug is auto-generated from name and can be edited manually.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Name is shown to customers. Slug controls the product URL. Category controls where the product is grouped.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Homepage sections show only Featured / Best Seller products. Active + Available products appear in `/products`.
            </p>
            {mode === "create" ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                URL slug: {formState.slug.trim() || slugifyName(formState.name) || "auto-generated from name"}
              </p>
            ) : null}
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
          <label className="sm:order-2">
            <span className="text-sm font-semibold">Slug</span>
            <Input
              className="mt-2"
              value={formState.slug}
              onChange={(event) => {
                setIsSlugManuallyEdited(true);
                setFormState((current) => ({ ...current, slug: event.target.value }));
              }}
            />
          </label>
          <label className="sm:order-1">
            <span className="text-sm font-semibold">Name</span>
            <Input
              className="mt-2"
              value={formState.name}
              onChange={(event) => {
                const nextName = event.target.value;
                const shouldAutoFillSlug =
                  mode === "create" &&
                  (!isSlugManuallyEdited || formState.slug.trim().length === 0);
                setFormState((current) => ({
                  ...current,
                  name: nextName,
                  ...(shouldAutoFillSlug ? { slug: slugifyName(nextName) } : {})
                }));
              }}
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
            <span className="text-sm font-semibold">Promo Badge Text</span>
            <Input
              className="mt-2"
              value={formState.promoLabel}
              onChange={(event) => setFormState((current) => ({ ...current, promoLabel: event.target.value }))}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Optional marketing badge shown on product cards, e.g. Launch Offer, Best Seller, New Arrival.
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              This does not change price, discount, tax, or coupon logic.
            </p>
          </label>
          <label>
            <span className="text-sm font-semibold">Currency</span>
            <Input className="mt-2" value={formState.currency} disabled />
          </label>
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold">Main Image URL</span>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Main image is used on product cards and as the primary PDP image.
            </p>
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
                {isUploadingMainImage ? "Uploading main image..." : "Upload to Cloudinary (auto-fills URL)"}
              </span>
            </div>
            {formState.image ? (
              <div className="mt-3 inline-flex rounded-lg border border-[var(--line)] bg-[var(--mint)] p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="Main product preview" className="h-20 w-20 rounded object-cover" src={formState.image} />
              </div>
            ) : null}
          </label>

          <div className="sm:col-span-2">
            <span className="text-sm font-semibold">Gallery Images</span>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Gallery images are additional PDP images. Upload multiple images directly from your system.
            </p>
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
                multiple
                onChange={(event) => {
                  const fileList = event.target.files;
                  if (!fileList || fileList.length === 0) return;
                  void uploadGalleryImages(Array.from(fileList));
                  event.currentTarget.value = "";
                }}
              />
              <span className="text-xs text-[var(--muted)]">
                {isUploadingGalleryImage ? "Uploading gallery images..." : "Upload and append to gallery"}
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {formState.gallery.map((url, index) => (
                <div className="rounded-lg border border-[var(--line)] bg-white p-2" key={`${url}-${index}`}>
                  <div className="overflow-hidden rounded-md border border-[var(--line)] bg-[var(--mint)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img alt={`Gallery ${index + 1}`} className="h-24 w-full object-cover" src={url} />
                  </div>
                  <p className="mt-2 truncate text-[11px] text-[var(--muted)]">{url}</p>
                  <Button
                    className="mt-2 w-full"
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      setFormState((current) => ({
                        ...current,
                        gallery: current.gallery.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <label>
            <span className="text-sm font-semibold">Category</span>
            <Select
              className="mt-2"
              value={formState.categoryId}
              onChange={(event) => setFormState((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            {categories.length === 0 ? (
              <p className="mt-2 text-xs text-[var(--coral)]">
                No categories available. Create one from Admin Categories first.
              </p>
            ) : (
              <p className="mt-2 text-xs text-[var(--muted)]">
                Choose the product group this item belongs to.
              </p>
            )}
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              Available = purchasable now. Coming soon = visible but not purchasable.
            </p>
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
          <div className="sm:col-span-2 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3 text-xs text-[var(--muted)]">
            <p>
              Active = visible on store. Availability controls whether customers can buy now.
            </p>
            <p className="mt-1">
              Featured = homepage featured section, Best Seller = best-selling section/page, New = new badge/section.
            </p>
            <p className="mt-1">
              Coming Soon products are not purchasable in normal buy flow.
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-[var(--line)] bg-[#f8fbf9] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold">Variants & Stock</h3>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="utility" onClick={() => addVariantRow(1)}>
                + Add Pack of 1
              </Button>
              <Button type="button" variant="utility" onClick={() => addVariantRow(3)}>
                + Add Pack of 3
              </Button>
              <Button type="button" variant="utility" onClick={() => addVariantRow(6)}>
                + Add Pack of 6
              </Button>
              <Button type="button" variant="secondary" onClick={() => addVariantRow()}>
                Add custom pack
              </Button>
            </div>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Variants define sellable packs. Stock is tracked per variant.
          </p>

          <div className="space-y-3">
            {formState.variants.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No variants added yet.</p>
            ) : (
              formState.variants.map((variant) => (
                <div className="rounded border border-[var(--line)] bg-white p-3" key={variant.localKey}>
                  <div className="grid gap-2 md:grid-cols-6">
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Pack Size</span>
                      <Input
                        className="mt-1"
                        min={1}
                        type="number"
                        placeholder={variant.persisted ? "Legacy" : "3"}
                        disabled={variant.persisted}
                        value={variant.packSize}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => {
                            const packSize = event.target.value;
                            const parsed = parsePackSize(packSize);
                            const slugBase = formState.slug.trim() || slugifyName(formState.name);
                            return {
                              ...current,
                              packSize,
                              ...(parsed
                                ? {
                                    frontendVariantId: toVariantId(parsed),
                                    label: toVariantLabel(parsed),
                                    sku:
                                      current.skuManuallyEdited && current.sku.trim()
                                        ? current.sku
                                        : toVariantSku(slugBase, parsed)
                                  }
                                : {})
                            };
                          })
                        }
                      />
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        {variant.frontendVariantId ? `Code: ${variant.frontendVariantId}` : "Code auto-generated"}
                      </p>
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Label</span>
                      <Input className="mt-1" value={variant.label} disabled />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Price</span>
                      <Input
                        className="mt-1"
                        min={0}
                        type="number"
                        placeholder="149"
                        value={variant.price}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({ ...current, price: event.target.value }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Stock</span>
                      <Input
                        className="mt-1"
                        min={0}
                        type="number"
                        placeholder="120"
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
                        placeholder="ENERGY-BAR-PACK-3"
                        value={variant.sku}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            sku: event.target.value.toUpperCase(),
                            skuManuallyEdited: true
                          }))
                        }
                      />
                    </label>
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--mint)] px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Status</p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wide">
                        {!variant.isActive ? (
                          <span className="rounded bg-[#fff3f2] px-2 py-1 text-[var(--coral)]">Inactive</span>
                        ) : Number(variant.stock) <= 0 ? (
                          <span className="rounded bg-[#fff3f2] px-2 py-1 text-[var(--coral)]">Out of stock</span>
                        ) : Number(variant.stock) < LOW_STOCK_THRESHOLD ? (
                          <span className="rounded bg-[#fff7e8] px-2 py-1 text-[#9b6a1b]">Low stock</span>
                        ) : (
                          <span className="rounded bg-[var(--mint)] px-2 py-1 text-[var(--leaf-deep)]">In stock</span>
                        )}
                      </div>
                    </div>
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
                      variant={variant.persisted ? (variant.isActive ? "destructive" : "primary") : "destructive"}
                      disabled={variant.isSaving}
                      onClick={() => void toggleVariantActiveState(variant)}
                    >
                      {variant.persisted ? (variant.isActive ? "Deactivate" : "Activate") : "Remove"}
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
              variant={formState.isActive ? "destructive" : "primary"}
              onClick={() => {
                const snapshot = products.find((product) => product.id === editingProductId);
                if (!snapshot) return;
                void handleSoftDeleteProduct(snapshot);
              }}
            >
              {formState.isActive ? "Deactivate product" : "Activate product"}
            </Button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
