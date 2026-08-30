import type { ProductVariant } from "@/types/product";
import { sortVariantsLogically } from "@/components/product/card-variant";
import { isVariantActive } from "@/lib/product-lifecycle";

type ProductVariantChipsProps = {
  productId: string;
  productName: string;
  variants: ProductVariant[];
  selectedVariantId: string;
  getAvailableStock: (productId: string, variantId: string) => number | null;
  onSelect: (variantId: string) => void;
  surface?: "card" | "pdp";
};

type VariantState = "available" | "out-of-stock" | "coming-soon";

function getVariantState(variant: ProductVariant, stock: number | null): VariantState {
  if (!isVariantActive(variant)) return "coming-soon";
  if (typeof stock === "number" && stock <= 0) return "out-of-stock";
  return "available";
}

function getStateLabel(state: VariantState) {
  if (state === "coming-soon") return "Coming soon";
  if (state === "out-of-stock") return "Sold out";
  return "Available";
}

function hasLongLabels(variants: ProductVariant[]) {
  return variants.some((variant) => variant.label.trim().length > 8);
}

function getGridClass(variants: ProductVariant[], surface: "card" | "pdp") {
  const count = variants.length;
  const longLabels = hasLongLabels(variants);

  if (count <= 2) return "grid-cols-2";
  if (surface === "card") {
    if (count === 3) return "grid-cols-2 md:grid-cols-3";
    if (count === 4) return "grid-cols-2 md:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
  }
  if (count === 3) {
    if (longLabels) return "grid-cols-2 sm:grid-cols-3";
    return "grid-cols-3";
  }
  if (count === 4) {
    if (longLabels) return "grid-cols-2";
    return "grid-cols-2 sm:grid-cols-4";
  }
  return "grid-cols-2 sm:grid-cols-3";
}

function getChipClass(isSelected: boolean, state: VariantState, surface: "card" | "pdp") {
  const sizing =
    surface === "pdp"
      ? "min-h-11 rounded-lg px-3 py-2"
      : "min-h-9 rounded-md px-0.5 py-1.5 sm:px-1.5 md:px-0.5";
  const base = `focus-ring min-w-0 border text-center font-semibold leading-tight transition active:scale-95 ${sizing}`;

  if (isSelected && state === "available") {
    return `${base} border-[var(--leaf)] bg-[var(--leaf)] text-white shadow-sm ring-2 ring-[var(--leaf)]/15`;
  }

  if (isSelected) {
    return `${base} cursor-not-allowed border-[#c98f86] bg-[#fff7f6] text-[#8f5550] shadow-sm ring-2 ring-[#c98f86]/20`;
  }

  if (state !== "available") {
    return `${base} cursor-not-allowed border-[#ead7d2] bg-[#fff8f7] text-[#9b5a50] opacity-80`;
  }

  return `${base} border-[var(--line)] bg-white text-[var(--leaf-deep)] hover:border-[var(--leaf)]`;
}

export function ProductVariantChips({
  productId,
  productName,
  variants,
  selectedVariantId,
  getAvailableStock,
  onSelect,
  surface = "card"
}: ProductVariantChipsProps) {
  const sortedVariants = sortVariantsLogically(variants);

  if (sortedVariants.length <= 1) {
    return null;
  }

  const gapClass =
    surface === "card"
      ? sortedVariants.length > 4
        ? "gap-1"
        : "gap-1 sm:gap-1.5"
      : "gap-1.5 sm:gap-2";

  return (
    <fieldset className={surface === "pdp" ? "mt-3" : "mt-2"}>
      <legend className="sr-only">Choose pack size for {productName}</legend>
      <div className={`grid ${gapClass} ${getGridClass(sortedVariants, surface)}`}>
        {sortedVariants.map((variant) => {
          const stock = getAvailableStock(productId, variant.id) ?? variant.stock ?? null;
          const state = getVariantState(variant, stock);
          const isSelected = selectedVariantId === variant.id;
          const isDisabled = state !== "available";
          const stateLabel = getStateLabel(state);

          return (
            <button
              aria-label={`${variant.label}, ${stateLabel}${isSelected ? ", selected" : ""}`}
              aria-pressed={isSelected}
              className={getChipClass(isSelected, state, surface)}
              disabled={isDisabled}
              key={variant.id}
              title={`${variant.label} - ${stateLabel}`}
              type="button"
              onClick={() => onSelect(variant.id)}
            >
              <span
                className={
                  surface === "card"
                    ? sortedVariants.length > 4
                      ? "block whitespace-normal text-[9px] leading-tight"
                      : "block whitespace-normal text-[10px] leading-tight sm:text-[11px] md:text-[10px]"
                    : "block whitespace-normal break-words text-sm leading-tight"
                }
              >
                {variant.label}
              </span>
              {isDisabled ? (
                <span
                  className={
                    surface === "card"
                      ? "mt-0.5 block text-[8px] font-bold uppercase leading-tight tracking-wide sm:text-[9px]"
                      : "mt-0.5 block text-[9px] font-bold uppercase leading-tight tracking-wide sm:text-[10px]"
                  }
                >
                  {state === "coming-soon" ? "Soon" : "Sold out"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
