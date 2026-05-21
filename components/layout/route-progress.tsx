"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function isSameDocumentNavigation(url: URL): boolean {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash !== window.location.hash
  );
}

export function RouteProgress() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    function clearTicker() {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    function startProgress() {
      if (isVisible) return;
      setIsVisible(true);
      setProgress(18);
      clearTicker();
      intervalRef.current = window.setInterval(() => {
        setProgress((current) => (current >= 88 ? current : current + Math.max(1, Math.round((90 - current) / 6))));
      }, 120);
    }

    function onClickCapture(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (isSameDocumentNavigation(url)) return;

      startProgress();
    }

    document.addEventListener("click", onClickCapture, true);

    return () => {
      document.removeEventListener("click", onClickCapture, true);
      clearTicker();
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const completeTimer = window.setTimeout(() => {
      setProgress(100);
    }, 0);
    const hideTimer = window.setTimeout(() => {
      setIsVisible(false);
      setProgress(0);
    }, 220);

    return () => {
      window.clearTimeout(completeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pathname, isVisible]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[70] h-0.5 bg-[var(--leaf)] transition-[width,opacity] duration-200 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ width: `${progress}%` }}
    />
  );
}
