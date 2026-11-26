"use client";

import { LoaderCircle } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
type Size = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-fg text-[#07080a] hover:bg-white shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_8px_24px_-12px_rgb(255_255_255/0.45)]",
  secondary: "bg-white/[0.06] text-fg hover:bg-white/[0.1] border border-line",
  outline: "border border-line-strong text-fg hover:bg-white/[0.05]",
  ghost: "text-muted hover:text-fg hover:bg-white/[0.05]",
  danger: "bg-neg/90 text-white hover:bg-neg shadow-[0_8px_24px_-12px_rgb(245_71_92/0.6)]",
  success: "bg-pos text-[#04140c] hover:bg-pos-strong shadow-[0_8px_24px_-12px_rgb(30_211_138/0.6)]",
};

const SIZES: Record<Size, string> = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
  icon: "size-10 rounded-lg",
  "icon-sm": "size-8 rounded-md",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading, icon, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "focus-ring relative inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,color,box-shadow,transform] duration-200 ease-out select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});
