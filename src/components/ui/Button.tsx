import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
  ariaLabel?: string;
};

export function Button({
  href,
  children,
  icon: Icon,
  variant = "primary",
  ariaLabel,
}: ButtonProps) {
  const className =
    variant === "primary"
      ? "bg-[#111827] text-white"
      : "border border-slate-200 bg-white text-[#111827]";

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex h-12 items-center gap-2 rounded-full px-6 small-label transition-transform hover:scale-[1.02] ${className}`}
    >
      {children}
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
    </Link>
  );
}
