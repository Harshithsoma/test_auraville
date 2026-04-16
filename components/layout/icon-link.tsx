import Link from "next/link";
import type { ReactNode } from "react";

type IconLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
};

export function IconLink({ href, label, children }: IconLinkProps) {
  return (
    <Link
      aria-label={label}
      className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--foreground)] transition hover:border-[var(--leaf)] hover:text-[var(--leaf-deep)]"
      href={href}
    >
      {children}
    </Link>
  );
}
