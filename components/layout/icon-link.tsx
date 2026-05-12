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
      className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] bg-white text-[var(--foreground)] transition active:scale-95 hover:border-[var(--leaf)] hover:text-[var(--leaf-deep)] sm:h-11 sm:w-11"
      href={href}
    >
      {children}
    </Link>
  );
}
