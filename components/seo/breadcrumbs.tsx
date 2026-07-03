import Link from "next/link";
import { buildBreadcrumbJsonLd, type BreadcrumbItem } from "@/lib/seo";
import { JsonLd } from "@/components/seo/json-ld";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length < 2) {
    return null;
  }

  const structuredData = buildBreadcrumbJsonLd(items);

  return (
    <>
      <JsonLd id="breadcrumb-json-ld" data={structuredData} />
      <nav aria-label="Breadcrumb" className="mb-5 text-xs font-medium text-[var(--muted)] sm:text-sm">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li className="flex items-center gap-1.5" key={`${item.href}-${item.name}`}>
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {isLast ? (
                  <span aria-current="page" className="line-clamp-1 text-[var(--foreground)]">
                    {item.name}
                  </span>
                ) : (
                  <Link className="focus-ring rounded transition hover:text-[var(--foreground)]" href={item.href}>
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
