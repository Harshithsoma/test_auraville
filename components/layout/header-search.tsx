"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";
import { fetchProducts } from "@/lib/catalog-api";
import { filterSearchIndex, getSearchIndex, preloadSearchIndex } from "@/lib/search-index-cache";
import type { Product } from "@/types/product";

const SUGGESTION_LIMIT = 7;
const SEARCH_DEBOUNCE_MS = 100;

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
      <path
        d="m20 20-4.2-4.2m1.2-5.3a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

type HeaderSearchProps = {
  className?: string;
};

export function HeaderSearch({ className = "" }: HeaderSearchProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);

  const closeSearch = useCallback(() => {
    requestIdRef.current += 1;
    setIsOpen(false);
    setQuery("");
    setSuggestions([]);
    setErrorMessage(null);
    setIsLoading(false);
  }, []);

  const loadSuggestions = useCallback(async (searchText: string) => {
    const indexProducts = getSearchIndex();
    if (indexProducts && indexProducts.length > 0) {
      setSuggestions(filterSearchIndex(searchText, SUGGESTION_LIMIT));
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      await preloadSearchIndex();
      if (requestId !== requestIdRef.current) {
        return;
      }

      setSuggestions(filterSearchIndex(searchText, SUGGESTION_LIMIT));
      setErrorMessage(null);
      setIsLoading(false);
      return;
    } catch {
      // Fall back to direct search request when preload fails.
    }

    try {
      const response = await fetchProducts({
        page: 1,
        limit: SUGGESTION_LIMIT,
        search: searchText || undefined,
        sort: "popular"
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      setSuggestions(response.data);
    } catch (error) {
      if (requestId !== requestIdRef.current) {
        return;
      }

      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unable to load suggestions right now.");
      }
      setSuggestions([]);
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSearch();
      }
    }

    window.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeSearch]);

  useEffect(() => {
    void preloadSearchIndex();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const hasIndex = !!getSearchIndex()?.length;
    const localInstant = filterSearchIndex(query, SUGGESTION_LIMIT);
    if (hasIndex || !query.trim() || localInstant.length > 0) {
      setSuggestions(localInstant);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      const searchText = query.trim();
      void loadSuggestions(searchText);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isOpen, query, loadSuggestions]);

  useEffect(() => {
    closeSearch();
  }, [pathname, closeSearch]);

  function openSearch() {
    setIsOpen(true);
    setErrorMessage(null);
    const instant = filterSearchIndex("", SUGGESTION_LIMIT);
    if (instant.length > 0) {
      setSuggestions(instant);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    const requestId = ++requestIdRef.current;
    void preloadSearchIndex().then(() => {
      if (requestId !== requestIdRef.current) {
        return;
      }
      const local = filterSearchIndex(query, SUGGESTION_LIMIT);
      if (local.length > 0 || !query.trim()) {
        setSuggestions(local);
      }
      setIsLoading(false);
    }).catch(() => {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setIsLoading(false);
    });
    requestAnimationFrame(() => {
      desktopInputRef.current?.focus();
      mobileInputRef.current?.focus();
    });
  }

  function goToSearchResults(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    closeSearch();
    if (trimmed.length === 0) {
      router.push("/search");
      return;
    }
    router.push(`/search?search=${encodeURIComponent(trimmed)}`);
  }

  function renderSuggestionList() {
    if (isLoading) {
      return <p className="p-3 text-sm text-[var(--muted)]">Loading suggestions...</p>;
    }

    if (errorMessage) {
      return (
        <p className="p-3 text-sm font-semibold text-[var(--coral)]">
          {errorMessage}
        </p>
      );
    }

    if (suggestions.length === 0) {
      return <p className="p-3 text-sm text-[var(--muted)]">No products found.</p>;
    }

    return (
      <ul className="max-h-[420px] overflow-y-auto py-1">
        {suggestions.map((product) => (
          <li key={product.id}>
            <Link
              className="focus-ring grid grid-cols-[52px_1fr] items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--mint)]"
              href={`/product/${product.slug}`}
              onClick={closeSearch}
            >
              <div className="relative h-12 w-12 overflow-hidden rounded-md border border-[var(--line)] bg-[var(--mint)]">
                <Image
                  alt={product.name}
                  className="object-cover"
                  fill
                  sizes="52px"
                  src={product.image}
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="truncate text-xs text-[var(--muted)]">
                  {product.category} · {product.tagline}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  function desktopDropdown() {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="absolute left-0 top-full z-[140] mt-2 w-full rounded-xl border border-[var(--line)] bg-white shadow-xl shadow-[#17211c1a]">
        {renderSuggestionList()}
      </div>
    );
  }

  return (
    <div className={`relative flex items-center gap-2 ${className}`} ref={wrapperRef}>
      <div
        className={`relative hidden overflow-visible transition-[width,opacity] duration-200 ease-out lg:block ${
          isOpen
            ? "pointer-events-auto w-[320px] opacity-100 xl:w-[380px]"
            : "pointer-events-none w-0 opacity-0"
        }`}
      >
        <form className="relative" onSubmit={goToSearchResults}>
          <input
            ref={desktopInputRef}
            className="focus-ring h-11 w-full rounded-lg border border-[var(--line)] bg-white pl-10 pr-3 text-sm"
            placeholder="Search products"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <SearchIcon />
          </span>
        </form>
        {desktopDropdown()}
      </div>

      <button
        aria-expanded={isOpen}
        aria-label="Search products"
        className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--foreground)] transition active:scale-95 hover:border-[var(--leaf)] hover:text-[var(--leaf-deep)] sm:h-11 sm:w-11"
        type="button"
        onClick={() => {
          if (isOpen) {
            closeSearch();
            return;
          }
          openSearch();
        }}
      >
        <SearchIcon />
      </button>

      {isOpen ? (
        <div className="fixed left-0 right-0 top-20 z-[140] border-b border-[var(--line)] bg-white shadow-xl shadow-[#17211c1a] lg:hidden">
          <form className="relative border-b border-[var(--line)] p-3" onSubmit={goToSearchResults}>
            <input
              ref={mobileInputRef}
              className="focus-ring h-11 w-full rounded-lg border border-[var(--line)] bg-white pl-10 pr-3 text-sm"
              placeholder="Search products"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-[var(--muted)]">
              <SearchIcon />
            </span>
          </form>
          {renderSuggestionList()}
        </div>
      ) : null}
    </div>
  );
}
