type RatingStarsProps = {
  rating: number;
  reviewCount: number;
};

function Star({ fillPercent }: { fillPercent: number }) {
  return (
    <span className="relative inline-block h-4 w-4" aria-hidden="true">
      <span className="absolute inset-0 text-[#d4ddd7]">★</span>
      <span className="absolute inset-0 overflow-hidden text-[var(--gold)]" style={{ width: `${fillPercent}%` }}>
        ★
      </span>
    </span>
  );
}

export function RatingStars({ rating, reviewCount }: RatingStarsProps) {
  const clamped = Math.min(5, Math.max(0, rating));
  const fills = Array.from({ length: 5 }).map((_, index) => {
    const starValue = clamped - index;
    if (starValue >= 1) return 100;
    if (starValue <= 0) return 0;
    return Math.round(starValue * 100);
  });

  return (
    <div className="flex items-center gap-1 text-xs" aria-label={`${clamped.toFixed(1)} stars from ${reviewCount} reviews`}>
      <span className="flex items-center gap-px">
        {fills.map((fill, index) => (
          <Star fillPercent={fill} key={index} />
        ))}
      </span>
      <span className="font-semibold text-[var(--muted)]">({reviewCount})</span>
    </div>
  );
}
