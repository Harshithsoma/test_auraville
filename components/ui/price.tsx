export function formatPrice(value: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(value);
}

export function Price({ value, currency }: { value: number; currency?: string }) {
  return <span>{formatPrice(value, currency)}</span>;
}

function getSavingsPercent(value: number, compareAtPrice?: number) {
  if (!compareAtPrice || compareAtPrice <= value) return 0;
  return Math.round(((compareAtPrice - value) / compareAtPrice) * 100);
}

export function PriceWithCompare({
  value,
  compareAtPrice,
  currency = "INR",
  showSavingsPill = true,
  className = ""
}: {
  value: number;
  compareAtPrice?: number;
  currency?: string;
  showSavingsPill?: boolean;
  className?: string;
}) {
  const savings = getSavingsPercent(value, compareAtPrice);
  const hasComparePrice = Boolean(compareAtPrice && compareAtPrice > value);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`.trim()}>
      <span className="font-bold">{formatPrice(value, currency)}</span>
      {hasComparePrice ? (
        <span className="text-[0.9em] font-medium text-[#9ba59f] line-through">
          {formatPrice(compareAtPrice!, currency)}
        </span>
      ) : null}
      {showSavingsPill && savings > 0 ? (
        <span className="rounded-full bg-[#e8f8ef] px-2.5 py-0.5 text-[0.82em] font-semibold text-[#2f9e74]">
          Save {savings}%
        </span>
      ) : null}
    </div>
  );
}
