import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/format";

const VARIANTS = {
  primary: "bg-stone-900 text-white hover:bg-stone-800 shadow-sm",
  secondary: "bg-white text-stone-800 ring-1 ring-inset ring-stone-300 hover:bg-stone-50",
  approve: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
  ghost: "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
  danger: "text-rose-700 hover:bg-rose-50",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-14 px-6 text-base gap-2",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  );
}
