"use client";

import Image from "next/image";
import { useState } from "react";
import type { CustomerOrderItem } from "@/components/orders/order-data";

export function OrderItemThumbnail({
  item,
  sizeClass = "h-10 w-10"
}: {
  item: CustomerOrderItem;
  sizeClass?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const showImage = Boolean(item.image) && !imageFailed;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex ${sizeClass} shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-white`}
    >
      <span className="flex h-full w-full items-center justify-center text-[var(--leaf-deep)]">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24">
          <path
            d="M6 8.5h12l-1 10H7l-1-10Zm3 0V7a3 3 0 0 1 6 0v1.5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.7"
          />
        </svg>
      </span>
      {showImage ? (
        <Image
          alt=""
          className="object-cover"
          fill
          sizes="48px"
          src={item.image}
          unoptimized
          onError={() => setImageFailed(true)}
        />
      ) : null}
    </span>
  );
}
