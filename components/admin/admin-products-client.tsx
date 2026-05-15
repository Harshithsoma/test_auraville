"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, commerceApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { formatPrice } from "@/components/ui/price";

type Availability = "available" | "coming-soon";

type AdminVariant = {
  id: string;
  label: string;
  price: number;
  compareAtPrice: number | null;
  discountPercent: number;
  unit: string;
  stock: number;
  sku: string | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  sortOrder: number;
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
    compareAtPrice: number | null;
    discountPercent: number;
    unit: string;
    stock: number;
    sku: string | null;
    isFeatured: boolean;
    isBestSeller: boolean;
    sortOrder: number;
    isActive: boolean;
  };
};

type VariantDeleteResponse = {
  data: {
    id: string;
    isActive: boolean;
  };
};

type HardDeleteProductResponse = {
  data: {
    id: string;
    deleted: boolean;
  };
};

type HardDeleteVariantResponse = {
  data: {
    id: string;
    deleted: boolean;
  };
};

type DeleteDialogState =
  | {
      kind: "product";
      productId: string;
      productName: string;
    }
  | {
      kind: "variant";
      productId: string;
      variantId: string;
      variantLabel: string;
      variantLocalKey: string;
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
  compareAtPrice: string;
  discountPercent: string;
  unit: string;
  stock: string;
  sku: string;
  skuManuallyEdited: boolean;
  isFeatured: boolean;
  isBestSeller: boolean;
  sortOrder: string;
  isActive: boolean;
  isSaving: boolean;
  initialPackSize: string;
  initialLabel: string;
  initialPrice: string;
  initialCompareAtPrice: string;
  initialDiscountPercent: string;
  initialStock: string;
  initialSku: string;
  initialIsFeatured: boolean;
  initialIsBestSeller: boolean;
  initialSortOrder: string;
  initialIsActive: boolean;
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
  const packSize = packSizeFromVariantId(variant.id);
  const price = String(variant.price);
  const compareAtPrice = String(variant.compareAtPrice ?? variant.price);
  const discountPercent = String(variant.discountPercent ?? 0);
  const stock = String(variant.stock);
  const sku = variant.sku ?? "";
  return {
    localKey: `${variant.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    persisted: true,
    originalId: variant.id,
    packSize,
    frontendVariantId: variant.id,
    label: variant.label,
    price,
    compareAtPrice,
    discountPercent,
    unit: variant.unit,
    stock,
    sku,
    skuManuallyEdited: true,
    isFeatured: variant.isFeatured,
    isBestSeller: variant.isBestSeller,
    sortOrder: String(variant.sortOrder ?? 0),
    isActive: variant.isActive,
    isSaving: false,
    initialPackSize: packSize,
    initialLabel: variant.label,
    initialPrice: price,
    initialCompareAtPrice: compareAtPrice,
    initialDiscountPercent: discountPercent,
    initialStock: stock,
    initialSku: sku,
    initialIsFeatured: variant.isFeatured,
    initialIsBestSeller: variant.isBestSeller,
    initialSortOrder: String(variant.sortOrder ?? 0),
    initialIsActive: variant.isActive
  };
}

function defaultForm(): ProductFormState {
  return {
    slug: "",
    name: "",
    tagline: "",
    description: "",
    longDescription: "",
    price: "",
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

function serializeProductFields(state: ProductFormState): string {
  return JSON.stringify({
    slug: state.slug.trim(),
    name: state.name.trim(),
    tagline: state.tagline.trim(),
    description: state.description.trim(),
    longDescription: state.longDescription.trim(),
    price: state.price.trim(),
    compareAtPrice: state.compareAtPrice.trim(),
    promoLabel: state.promoLabel.trim(),
    currency: state.currency,
    image: state.image.trim(),
    gallery: state.gallery,
    categoryId: state.categoryId,
    availability: state.availability,
    releaseNote: state.releaseNote.trim(),
    isFeatured: state.isFeatured,
    isBestSeller: state.isBestSeller,
    isNew: state.isNew,
    badgeLabel: state.badgeLabel.trim(),
    popularity: state.popularity.trim(),
    ingredientsText: state.ingredientsText.trim(),
    benefitsText: state.benefitsText.trim(),
    isActive: state.isActive
  });
}

function hasVariantSectionChanges(variants: FormVariant[]): boolean {
  return variants.some((variant) => {
    if (!variant.persisted) {
      return Boolean(
        variant.packSize.trim() ||
          variant.label.trim() ||
          variant.price.trim() ||
          variant.compareAtPrice.trim() ||
          variant.discountPercent.trim() ||
          variant.stock.trim() ||
          variant.sku.trim() ||
          variant.isFeatured ||
          variant.isBestSeller ||
          variant.sortOrder.trim() !== "0" ||
          !variant.isActive
      );
    }

    return (
      variant.packSize.trim() !== variant.initialPackSize.trim() ||
      variant.label.trim() !== variant.initialLabel.trim() ||
      variant.price.trim() !== variant.initialPrice.trim() ||
      variant.compareAtPrice.trim() !== variant.initialCompareAtPrice.trim() ||
      variant.discountPercent.trim() !== variant.initialDiscountPercent.trim() ||
      variant.stock.trim() !== variant.initialStock.trim() ||
      variant.sku.trim() !== variant.initialSku.trim() ||
      variant.isFeatured !== variant.initialIsFeatured ||
      variant.isBestSeller !== variant.initialIsBestSeller ||
      variant.sortOrder.trim() !== variant.initialSortOrder.trim() ||
      variant.isActive !== variant.initialIsActive
    );
  });
}

function isVariantDirty(variant: FormVariant): boolean {
  if (!variant.persisted) {
    return Boolean(
      variant.packSize.trim() ||
        variant.label.trim() ||
        variant.price.trim() ||
        variant.compareAtPrice.trim() ||
        variant.discountPercent.trim() ||
        variant.stock.trim() ||
        variant.sku.trim() ||
        variant.isFeatured ||
        variant.isBestSeller ||
        variant.sortOrder.trim() !== "0" ||
        !variant.isActive
    );
  }

  return (
    variant.packSize.trim() !== variant.initialPackSize.trim() ||
    variant.label.trim() !== variant.initialLabel.trim() ||
    variant.price.trim() !== variant.initialPrice.trim() ||
    variant.compareAtPrice.trim() !== variant.initialCompareAtPrice.trim() ||
    variant.discountPercent.trim() !== variant.initialDiscountPercent.trim() ||
    variant.stock.trim() !== variant.initialStock.trim() ||
    variant.sku.trim() !== variant.initialSku.trim() ||
    variant.isFeatured !== variant.initialIsFeatured ||
    variant.isBestSeller !== variant.initialIsBestSeller ||
    variant.sortOrder.trim() !== variant.initialSortOrder.trim() ||
    variant.isActive !== variant.initialIsActive
  );
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

function clampDiscountPercent(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function computeSellingPrice(compareAtPrice: string, discountPercent: string): number {
  const mrp = Math.max(0, toNumber(compareAtPrice));
  const discount = clampDiscountPercent(discountPercent);
  return Math.max(0, Math.round(mrp * (1 - discount / 100)));
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

function toVariantIdFromLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized ? `variant-${normalized}` : "variant-custom";
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

function getPrimaryVariantForProjection(variants: FormVariant[]): FormVariant | null {
  if (variants.length === 0) {
    return null;
  }

  const ranked = [...variants].sort((a, b) => {
    const stockA = toNumber(a.stock);
    const stockB = toNumber(b.stock);
    const rankA = a.isActive && stockA > 0 ? 0 : a.isActive ? 1 : 2;
    const rankB = b.isActive && stockB > 0 ? 0 : b.isActive ? 1 : 2;
    if (rankA !== rankB) return rankA - rankB;
    return toNumber(a.sortOrder) - toNumber(b.sortOrder);
  });

  return ranked[0] ?? null;
}

type VariantMutationPayload = {
  frontendVariantId: string;
  label: string;
  price?: number;
  compareAtPrice: number;
  discountPercent: number;
  unit: string;
  stock: number;
  sku?: string;
  isFeatured: boolean;
  isBestSeller: boolean;
  sortOrder: number;
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
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingPermanent, setIsDeletingPermanent] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState<string | null>(null);
  const formCardRef = useRef<HTMLFormElement | null>(null);
  const initialProductSnapshotRef = useRef<string>(serializeProductFields(defaultForm()));

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

  useEffect(() => {
    if (!deleteDialog) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeletingPermanent) {
        setDeleteDialog(null);
        setDeleteConfirmText("");
        setDeleteDialogError(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteDialog, isDeletingPermanent]);

  const isProductSectionDirty = useMemo(
    () => serializeProductFields(formState) !== initialProductSnapshotRef.current,
    [formState]
  );
  const hasVariantChanges = useMemo(() => hasVariantSectionChanges(formState.variants), [formState.variants]);
  const isMainSaveDisabled = isSavingProduct || isLoadingFormProduct || !isProductSectionDirty;

  function resetForm(modeValue: FormMode) {
    const nextDefaultForm = defaultForm();
    setMode(modeValue);
    setEditingProductId(null);
    setFormState(nextDefaultForm);
    setGalleryInput("");
    setFormError(null);
    setFormMessage(null);
    setUploadError(null);
    setIsSlugManuallyEdited(false);
    initialProductSnapshotRef.current = serializeProductFields(nextDefaultForm);
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
      const nextFormState = productToForm(response.data);
      setFormState(nextFormState);
      initialProductSnapshotRef.current = serializeProductFields(nextFormState);
      setIsSlugManuallyEdited(true);
      requestAnimationFrame(() => {
        formCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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

  function openProductDeleteDialog(product: AdminProduct) {
    setDeleteDialog({
      kind: "product",
      productId: product.id,
      productName: product.name
    });
    setDeleteConfirmText("");
    setDeleteDialogError(null);
    setFormError(null);
    setListError(null);
  }

  function openVariantDeleteDialog(variant: FormVariant) {
    if (mode !== "edit" || !editingProductId || !variant.persisted) {
      return;
    }

    setDeleteDialog({
      kind: "variant",
      productId: editingProductId,
      variantId: variant.originalId,
      variantLabel: variant.label,
      variantLocalKey: variant.localKey
    });
    setDeleteConfirmText("");
    setDeleteDialogError(null);
    setFormError(null);
    setListError(null);
  }

  async function confirmPermanentDelete() {
    if (!deleteDialog || isDeletingPermanent) return;

    setIsDeletingPermanent(true);
    setFormError(null);
    setFormMessage(null);
    setListError(null);
    setListMessage(null);
    setDeleteDialogError(null);

    try {
      if (deleteDialog.kind === "product") {
        await commerceApi.admin.products.hardDelete<
          HardDeleteProductResponse,
          { confirmText: string }
        >(deleteDialog.productId, {
          confirmText: deleteConfirmText
        });

        if (editingProductId === deleteDialog.productId) {
          resetForm("create");
        }

        setListMessage(`Product "${deleteDialog.productName}" deleted permanently.`);
      } else {
        await commerceApi.admin.products.hardDeleteVariant<
          HardDeleteVariantResponse,
          { confirmText: string }
        >(deleteDialog.productId, deleteDialog.variantId, {
          confirmText: deleteConfirmText
        });

        setFormState((current) => ({
          ...current,
          variants: current.variants.filter((variant) => variant.localKey !== deleteDialog.variantLocalKey)
        }));
        setFormMessage(`Variant "${deleteDialog.variantLabel}" deleted permanently.`);
      }

      setDeleteDialog(null);
      setDeleteConfirmText("");
      setDeleteDialogError(null);
      await loadProducts();
    } catch (error) {
      if (error instanceof ApiError) {
        setDeleteDialogError(error.message);
        if (deleteDialog.kind === "product") {
          setListError(error.message);
        } else {
          setFormError(error.message);
        }
      } else if (deleteDialog.kind === "product") {
        setDeleteDialogError("Unable to permanently delete product.");
        setListError("Unable to permanently delete product.");
      } else {
        setDeleteDialogError("Unable to permanently delete variant.");
        setFormError("Unable to permanently delete variant.");
      }
    } finally {
      setIsDeletingPermanent(false);
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
    const primaryVariant = getPrimaryVariantForProjection(formState.variants);
    const projectedPrice = primaryVariant
      ? computeSellingPrice(primaryVariant.compareAtPrice, primaryVariant.discountPercent)
      : toNumber(formState.price);
    const projectedCompareAt = primaryVariant
      ? toNumber(primaryVariant.compareAtPrice)
      : formState.compareAtPrice.trim()
        ? toNumber(formState.compareAtPrice)
        : projectedPrice;

    return {
      slug: effectiveSlug,
      name: formState.name.trim(),
      tagline: formState.tagline.trim(),
      description: formState.description.trim(),
      longDescription: formState.longDescription.trim(),
      price: projectedPrice,
      compareAtPrice: projectedCompareAt >= projectedPrice ? projectedCompareAt : null,
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
        frontendVariantId:
          variant.frontendVariantId.trim() ||
          (parsePackSize(variant.packSize) !== null
            ? toVariantId(parsePackSize(variant.packSize) ?? 1)
            : toVariantIdFromLabel(variant.label)),
        label: variant.label.trim() || toVariantLabel(parsePackSize(variant.packSize) ?? 1),
        compareAtPrice: toNumber(variant.compareAtPrice),
        discountPercent: clampDiscountPercent(variant.discountPercent),
        unit: variant.unit.trim() || "pack",
        stock: toNumber(variant.stock),
        sku:
          (variant.sku.trim() ||
            toVariantSku(effectiveSlug, parsePackSize(variant.packSize) ?? 1)) || undefined,
        isFeatured: variant.isFeatured,
        isBestSeller: variant.isBestSeller,
        sortOrder: toNumber(variant.sortOrder),
        isActive: variant.isActive
      }))
    };
  }

function buildProductPatchPayload(effectiveSlug: string) {
    const primaryVariant = getPrimaryVariantForProjection(formState.variants);
    const projectedPrice = primaryVariant
      ? computeSellingPrice(primaryVariant.compareAtPrice, primaryVariant.discountPercent)
      : toNumber(formState.price);
    const projectedCompareAt = primaryVariant
      ? toNumber(primaryVariant.compareAtPrice)
      : formState.compareAtPrice.trim()
        ? toNumber(formState.compareAtPrice)
        : projectedPrice;

    return {
      slug: effectiveSlug,
      name: formState.name.trim(),
      tagline: formState.tagline.trim(),
      description: formState.description.trim(),
      longDescription: formState.longDescription.trim(),
      price: projectedPrice,
      compareAtPrice: projectedCompareAt >= projectedPrice ? projectedCompareAt : null,
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
      const mrpValue = Number(variant.compareAtPrice);
      const discountValue = Number(variant.discountPercent);
      if (!Number.isFinite(mrpValue) || mrpValue < 0) {
        return "Variant MRP must be 0 or more.";
      }
      if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100) {
        return "Variant discount must be between 0 and 100.";
      }
      if (!Number.isFinite(stockValue) || stockValue < 0) {
        return "Variant stock must be 0 or more.";
      }
      const packSize = parsePackSize(variant.packSize);
      if (!packSize && !variant.label.trim()) {
        return "Provide either pack size or a custom variant label.";
      }
      if (!packSize) {
        continue;
      }
      if (seenPackSizes.has(packSize)) {
        return "Duplicate pack sizes are not allowed for the same product.";
      }
      seenPackSizes.add(packSize);

      if (!variant.label.trim()) {
        return "Variant label is required.";
      }
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

    if (!isProductSectionDirty) {
      setFormMessage(
        mode === "edit"
          ? "No product field changes to save. Variants use their own Save variant button."
          : "No changes to save yet. Update product fields to continue."
      );
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
        initialProductSnapshotRef.current = serializeProductFields({
          ...formState,
          slug: effectiveSlug
        });
        setFormState((current) => ({ ...current, slug: effectiveSlug }));
        setFormMessage("Product saved successfully.");
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
    const defaultSku =
      presetPackSize && (formState.slug.trim() || slugifyName(formState.name))
        ? toVariantSku(formState.slug.trim() || slugifyName(formState.name), presetPackSize)
        : "";
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
          compareAtPrice: "0",
          discountPercent: "0",
          unit: "pack",
          stock: "0",
          sku: defaultSku,
          skuManuallyEdited: false,
          isFeatured: false,
          isBestSeller: false,
          sortOrder: String(current.variants.length),
          isActive: true,
          isSaving: false,
          initialPackSize: "",
          initialLabel: "",
          initialPrice: "0",
          initialCompareAtPrice: "0",
          initialDiscountPercent: "0",
          initialStock: "0",
          initialSku: "",
          initialIsFeatured: false,
          initialIsBestSeller: false,
          initialSortOrder: String(current.variants.length),
          initialIsActive: true
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
    if (!packSize && !variant.label.trim()) {
      setFormError("Provide either pack size or a custom variant label.");
      return null;
    }

    const generatedId =
      variant.frontendVariantId.trim() ||
      (packSize !== null ? toVariantId(packSize) : toVariantIdFromLabel(variant.label));
    const generatedLabel = variant.label.trim() || (packSize !== null ? toVariantLabel(packSize) : "");
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
        compareAtPrice: toNumber(variant.compareAtPrice),
        discountPercent: clampDiscountPercent(variant.discountPercent),
        unit: variant.unit.trim() || "pack",
        stock: toNumber(variant.stock),
        sku: variant.sku.trim() || generatedSku || undefined,
        isFeatured: variant.isFeatured,
        isBestSeller: variant.isBestSeller,
        sortOrder: toNumber(variant.sortOrder),
        isActive: variant.isActive
      }
    };
  }

  async function saveVariant(variant: FormVariant) {
    if (mode !== "edit" || !editingProductId) {
      return;
    }

    if (!isVariantDirty(variant)) {
      setFormMessage(`No changes to save for variant "${variant.frontendVariantId || variant.label || "new"}".`);
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
          compareAtPrice: String(response.data.compareAtPrice ?? response.data.price),
          discountPercent: String(response.data.discountPercent),
          unit: response.data.unit,
          stock: String(response.data.stock),
          sku: response.data.sku ?? "",
          skuManuallyEdited: true,
          isFeatured: response.data.isFeatured,
          isBestSeller: response.data.isBestSeller,
          sortOrder: String(response.data.sortOrder ?? 0),
          isActive: response.data.isActive,
          isSaving: false,
          persisted: true,
          initialPackSize: packSizeFromVariantId(response.data.id) || current.packSize,
          initialLabel: response.data.label,
          initialPrice: String(response.data.price),
          initialCompareAtPrice: String(response.data.compareAtPrice ?? response.data.price),
          initialDiscountPercent: String(response.data.discountPercent),
          initialStock: String(response.data.stock),
          initialSku: response.data.sku ?? "",
          initialIsFeatured: response.data.isFeatured,
          initialIsBestSeller: response.data.isBestSeller,
          initialSortOrder: String(response.data.sortOrder ?? 0),
          initialIsActive: response.data.isActive
        }));
        setFormMessage("Variant saved successfully.");
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
          compareAtPrice: String(response.data.compareAtPrice ?? response.data.price),
          discountPercent: String(response.data.discountPercent),
          unit: response.data.unit,
          stock: String(response.data.stock),
          sku: response.data.sku ?? "",
          skuManuallyEdited: true,
          isFeatured: response.data.isFeatured,
          isBestSeller: response.data.isBestSeller,
          sortOrder: String(response.data.sortOrder ?? 0),
          isActive: response.data.isActive,
          isSaving: false,
          persisted: true,
          initialPackSize: prepared.packSize !== null ? String(prepared.packSize) : current.packSize,
          initialLabel: response.data.label,
          initialPrice: String(response.data.price),
          initialCompareAtPrice: String(response.data.compareAtPrice ?? response.data.price),
          initialDiscountPercent: String(response.data.discountPercent),
          initialStock: String(response.data.stock),
          initialSku: response.data.sku ?? "",
          initialIsFeatured: response.data.isFeatured,
          initialIsBestSeller: response.data.isBestSeller,
          initialSortOrder: String(response.data.sortOrder ?? 0),
          initialIsActive: response.data.isActive
        }));
        setFormMessage("Variant saved successfully.");
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
        isSaving: false,
        initialIsActive: !variant.isActive
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

  const deleteExpectedText =
    deleteDialog?.kind === "product"
      ? deleteDialog.productName
      : deleteDialog?.kind === "variant"
        ? deleteDialog.variantLabel
        : "";
  const canConfirmDelete =
    Boolean(deleteDialog) &&
    deleteConfirmText.trim() === deleteExpectedText.trim() &&
    !isDeletingPermanent;
  const closeDeleteDialog = () => {
    if (isDeletingPermanent) return;
    setDeleteDialog(null);
    setDeleteConfirmText("");
    setDeleteDialogError(null);
  };

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
                            <Button
                              type="button"
                              variant="destructive"
                              disabled={busyProductActionId === product.id}
                              onClick={() => openProductDeleteDialog(product)}
                            >
                              Delete
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
                      <Button
                        className="flex-1"
                        type="button"
                        variant="destructive"
                        disabled={busyProductActionId === product.id}
                        onClick={() => openProductDeleteDialog(product)}
                      >
                        Delete
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

      <form
        className="rounded-lg border border-[var(--line)] bg-white p-5 md:p-7"
        onSubmit={(event) => void saveProduct(event)}
        ref={formCardRef}
      >
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
            {mode === "edit" ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Product fields save with <span className="font-semibold">Save product</span>. Variants have separate
                <span className="font-semibold"> Save variant</span> actions.
              </p>
            ) : null}
            {mode === "create" ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                URL slug: {formState.slug.trim() || slugifyName(formState.name) || "auto-generated from name"}
              </p>
            ) : null}
            {mode === "edit" ? (
              <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--mint)] p-3">
                <p className="text-sm font-semibold text-[var(--leaf-deep)]">Editing: {formState.name || "Selected product"}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`rounded px-2 py-1 font-semibold ${
                      formState.isActive ? "bg-[#dff4e6] text-[var(--leaf-deep)]" : "bg-[#fff3f2] text-[var(--coral)]"
                    }`}
                  >
                    {formState.isActive ? "Active" : "Inactive"}
                  </span>
                  {formState.isFeatured ? (
                    <span className="rounded bg-[#e8f4ec] px-2 py-1 font-semibold text-[var(--leaf-deep)]">Featured</span>
                  ) : null}
                  {formState.isBestSeller ? (
                    <span className="rounded bg-[#e8f4ec] px-2 py-1 font-semibold text-[var(--leaf-deep)]">Best Seller</span>
                  ) : null}
                  {formState.isNew ? (
                    <span className="rounded bg-[#e8f4ec] px-2 py-1 font-semibold text-[var(--leaf-deep)]">New</span>
                  ) : null}
                </div>
              </div>
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
            <span className="text-sm font-semibold">Projected Selling Price (legacy product field)</span>
            <Input
              className="mt-2 bg-[var(--mint)]/35"
              type="number"
              min={0}
              value={
                getPrimaryVariantForProjection(formState.variants)
                  ? String(
                      computeSellingPrice(
                        getPrimaryVariantForProjection(formState.variants)?.compareAtPrice ?? "0",
                        getPrimaryVariantForProjection(formState.variants)?.discountPercent ?? "0"
                      )
                    )
                  : formState.price
              }
              readOnly
            />
            <p className="mt-1 text-xs text-[var(--muted)]">Prices are managed per variant in the Variants section.</p>
          </label>
          <label>
            <span className="text-sm font-semibold">Projected Compare-at Price (legacy product field)</span>
            <Input
              className="mt-2 bg-[var(--mint)]/35"
              type="number"
              min={0}
              value={
                getPrimaryVariantForProjection(formState.variants)?.compareAtPrice ??
                formState.compareAtPrice
              }
              readOnly
            />
            <p className="mt-1 text-xs text-[var(--muted)]">This is auto-derived from the primary variant.</p>
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              Optional short product update shown internally or in product detail if enabled.
            </p>
          </label>
          <label>
            <span className="text-sm font-semibold">Badge Label</span>
            <Input
              className="mt-2"
              value={formState.badgeLabel}
              onChange={(event) => setFormState((current) => ({ ...current, badgeLabel: event.target.value }))}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Small marketing label shown on product cards, for example New, Trending, Limited.
            </p>
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
            <p className="mt-1 text-xs text-[var(--muted)]">
              Manual ranking score used for popular sorting. Higher value appears earlier.
            </p>
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
                disabled
                onChange={(event) => setFormState((current) => ({ ...current, isFeatured: event.target.checked }))}
              />
              Featured (variant-driven)
            </label>
            <label className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--mint)] px-3 py-2 text-sm">
              <input
                checked={formState.isBestSeller}
                type="checkbox"
                disabled
                onChange={(event) => setFormState((current) => ({ ...current, isBestSeller: event.target.checked }))}
              />
              Best seller (variant-driven)
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
              Featured and Best Seller visibility is controlled per variant below. New remains product-level.
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
              <Button type="button" variant="utility" onClick={() => addVariantRow(12)}>
                + Add Box of 12
              </Button>
              <Button type="button" variant="secondary" onClick={() => addVariantRow()}>
                + Add Custom
              </Button>
            </div>
          </div>
          <p className="mb-3 text-xs text-[var(--muted)]">
            Variants define sellable options. Prices are managed per variant (MRP + discount). Stock is tracked per variant.
          </p>

          <div className="space-y-3">
            {formState.variants.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No variants added yet.</p>
            ) : (
              formState.variants.map((variant) => (
                <div className="rounded border border-[var(--line)] bg-white p-3" key={variant.localKey}>
                  <div className="grid gap-2 md:grid-cols-8">
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
                                    label:
                                      current.label.trim() || toVariantLabel(parsed),
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
                      <Input
                        className="mt-1"
                        placeholder="Pack of 4 / 250g / 500g"
                        value={variant.label}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            label: event.target.value
                          }))
                        }
                      />
                      <p className="mt-1 text-[10px] text-[var(--muted)]">
                        Customer-facing label, for example Pack of 1, Pack of 4, 250g, 500g.
                      </p>
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Original Price / MRP</span>
                      <Input
                        className="mt-1"
                        min={0}
                        type="number"
                        placeholder="199"
                        value={variant.compareAtPrice}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            compareAtPrice: event.target.value,
                            price: String(computeSellingPrice(event.target.value, current.discountPercent))
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Discount %</span>
                      <Input
                        className="mt-1"
                        min={0}
                        max={100}
                        type="number"
                        placeholder="10"
                        value={variant.discountPercent}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            discountPercent: event.target.value,
                            price: String(computeSellingPrice(current.compareAtPrice, event.target.value))
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Selling Price</span>
                      <Input className="mt-1 bg-[var(--mint)]/35" value={variant.price} readOnly />
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
                      <p className="mt-1 text-[10px] text-[var(--muted)]">Unique inventory code for this exact variant.</p>
                    </label>
                    <label>
                      <span className="text-xs font-semibold uppercase text-[var(--muted)]">Sort Order</span>
                      <Input
                        className="mt-1"
                        min={0}
                        type="number"
                        value={variant.sortOrder}
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            sortOrder: event.target.value
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

                  <div className="mt-3 flex flex-wrap items-center gap-3">
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
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={variant.isFeatured}
                        type="checkbox"
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            isFeatured: event.target.checked
                          }))
                        }
                      />
                      Featured variant
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        checked={variant.isBestSeller}
                        type="checkbox"
                        onChange={(event) =>
                          updateVariant(variant.localKey, (current) => ({
                            ...current,
                            isBestSeller: event.target.checked
                          }))
                        }
                      />
                      Best seller variant
                    </label>

                    {mode === "edit" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={variant.isSaving || !isVariantDirty(variant)}
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
                    {variant.persisted ? (
                      <Button
                        type="button"
                        variant="destructive"
                        disabled={variant.isSaving}
                        onClick={() => openVariantDeleteDialog(variant)}
                      >
                        Delete variant
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="submit" disabled={isMainSaveDisabled}>
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
        {mode === "edit" && !isProductSectionDirty ? (
          <p className="mt-2 text-xs text-[var(--muted)]">
            No product field changes to save.
            {hasVariantChanges ? " Variant updates can be saved using each row’s Save variant button." : ""}
          </p>
        ) : null}
      </form>
      {deleteDialog ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 px-4 py-8"
          role="dialog"
          onClick={closeDeleteDialog}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-[var(--line)] bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--coral)]">
              Permanent delete
            </p>
            <h3 className="mt-2 text-xl font-semibold">
              {deleteDialog.kind === "product" ? "Delete product permanently?" : "Delete variant permanently?"}
            </h3>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {deleteDialog.kind === "product"
                ? "Deleting this product permanently removes it from storefront management. Historical orders and reviews remain preserved where required."
                : `Delete variant "${deleteDialog.variantLabel}" permanently? Historical references are protected and will block this action when needed.`}
            </p>
            <p className="mt-4 text-xs text-[var(--muted)]">
              Type <span className="font-semibold text-[var(--ink)]">{deleteExpectedText}</span> to confirm.
            </p>
            <Input
              className="mt-2"
              disabled={isDeletingPermanent}
              placeholder={deleteExpectedText}
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
            />
            {deleteDialogError ? (
              <div className="mt-3 rounded-lg border border-[#e7c9c6] bg-[#fff7f7] p-3 text-sm text-[var(--coral)]">
                {deleteDialogError}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={isDeletingPermanent}
                onClick={closeDeleteDialog}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canConfirmDelete}
                onClick={() => void confirmPermanentDelete()}
              >
                {isDeletingPermanent ? "Deleting..." : "Delete permanently"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
