"use client";

import { RefObject, useEffect, useState } from "react";

type InViewOptions = {
  threshold?: number;
  rootMargin?: string;
};

export function useSectionInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  { threshold = 0.2, rootMargin = "120px 0px 120px 0px" }: InViewOptions = {}
) {
  const [isInView, setIsInView] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined"
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return isInView;
}
