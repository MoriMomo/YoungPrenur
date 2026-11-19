import React from "react";
import Link from "next/link";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-stamp text-sheet hover:bg-stamp-deep border border-stamp hover:border-stamp-deep",
  secondary: "bg-sheet text-ink border border-rule-strong hover:bg-sheet-sunk hover:border-ink-3",
  ghost: "bg-transparent text-ink-2 border border-transparent hover:bg-sheet-sunk hover:text-ink",
  danger: "bg-sheet text-hold border border-hold-line hover:bg-hold-wash",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9 px-3.5 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
};

/** One button for the whole product: certificate-crisp corners, stamp-blue primary. */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = "") {
  return [
    "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors",
    "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none",
    VARIANT[variant],
    SIZE[size],
    extra,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export function Button({ variant = "primary", size = "md", className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

type LinkButtonProps = React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size };

export function LinkButton({ variant = "primary", size = "md", className = "", ...rest }: LinkButtonProps) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}
