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

function getVariantState(variant: ProductVariant, stock: number | null): "available" | "out-of-stock" | "coming-soon" {
  if (!isVariantActive(variant)) return "coming-soon";
  if (typeof stock === "number" && stock <= 0) return "out-of-stock";
  return "available";
}

function getStateLabel(state: ReturnType<typeof getVariantState>) {
  if (state === "coming-soon") return "Coming soon";
  if (state === "out-of-stock") return "Out of stock";
  return "Available";
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
    <fieldset className="mt-2 min-h-[38px]">
      <legend className="sr-only">Choose pack size for {productName}</legend>
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
              className={`focus-ring min-h-8 max-w-[7.5rem] shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-tight transition active:scale-95 sm:text-xs ${
                isSelected
                  ? "border-[var(--leaf)] bg-[var(--leaf)] text-white shadow-sm"
                  : "border-[var(--line)] bg-white text-[var(--leaf-deep)] hover:border-[var(--leaf)]"
              } ${
                isDisabled
                  ? "cursor-not-allowed border-[#ead7d2] bg-[#fff8f7] text-[#9b5a50] opacity-75 hover:border-[#ead7d2]"
                  : ""
              }`}
              disabled={isDisabled}
              key={variant.id}
              title={`${variant.label} - ${stateLabel}`}
              type="button"
              onClick={() => onSelect(variant.id)}
            >
              <span className="block truncate">{variant.label}</span>
              {isDisabled ? (
                <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-wide sm:text-[10px]">
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
