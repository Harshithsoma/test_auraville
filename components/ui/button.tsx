import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "destructive" | "utility";
  href?: string;
  children: ReactNode;
};

const styles = {
  primary:
    "bg-[var(--leaf-deep)] text-white hover:bg-[var(--leaf)] disabled:cursor-not-allowed disabled:opacity-60",
  secondary:
    "border border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--leaf)] hover:text-[var(--leaf-deep)]",
  ghost: "text-[var(--leaf-deep)] hover:bg-[var(--mint)]",
  destructive:
    "border border-[#e7c9c6] bg-[#fff5f4] text-[var(--coral)] hover:border-[var(--coral)] hover:bg-[#ffeaea] disabled:cursor-not-allowed disabled:opacity-60",
  utility:
    "border border-[var(--line)] bg-[var(--mint)] text-[var(--leaf-deep)] hover:border-[var(--leaf)] disabled:cursor-not-allowed disabled:opacity-60"
};

export function Button({
  className,
  variant = "primary",
  href,
  children,
  ...props
}: ButtonProps) {
  const classes = clsx(
    "focus-ring inline-flex min-h-11 items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold transition active:scale-[0.98]",
    styles[variant],
    className
  );

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
