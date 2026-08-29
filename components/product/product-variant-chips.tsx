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

function getGridClass(count: number) {
  if (count <= 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-2 sm:grid-cols-3";
  if (count === 4) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

function getChipClass(isSelected: boolean, state: VariantState) {
  const base =
    "focus-ring min-h-8 min-w-0 rounded-full border px-2 py-1 text-center text-[10px] font-semibold leading-tight transition active:scale-95 sm:px-2.5 sm:text-[11px]";

  if (isSelected && state === "available") {
    return `${base} border-[var(--leaf)] bg-[var(--leaf)] text-white shadow-sm ring-2 ring-[var(--leaf)]/15`;
  }

  if (isSelected) {
    return `${base} cursor-not-allowed border-[var(--leaf)] bg-[#fff8f7] text-[#8f5550] shadow-sm ring-2 ring-[var(--leaf)]/20`;
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
  onSelect
}: ProductVariantChipsProps) {
  const sortedVariants = sortVariantsLogically(variants);

  if (sortedVariants.length <= 1) {
    return null;
  }

  return (
    <fieldset className="mt-2">
      <legend className="sr-only">Choose pack size for {productName}</legend>
      <div className={`grid gap-1.5 ${getGridClass(sortedVariants.length)}`}>
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
              className={getChipClass(isSelected, state)}
              disabled={isDisabled}
              key={variant.id}
              title={`${variant.label} - ${stateLabel}`}
              type="button"
              onClick={() => onSelect(variant.id)}
            >
              <span className="block whitespace-normal break-words">{variant.label}</span>
              {isDisabled ? (
                <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">
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
