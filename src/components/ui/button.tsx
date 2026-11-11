import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/format";

// Electric blue with a soft light-blue rim for the main action; ink outline for the other choice;
// PayPal gold only for connecting PayPal.
const VARIANTS = {
  primary: "bg-leash text-white border-[1.5px] border-leash-rim hover:bg-leash-pressed active:bg-leash-pressed",
  secondary: "border border-ink text-ink bg-white/0 hover:bg-hairline/50 active:bg-hairline",
  text: "text-ink hover:bg-hairline/50 active:bg-hairline",
  danger: "text-failed hover:bg-failed-wash",
  paypal: "bg-paypal text-ink hover:brightness-95",
} as const;

const SIZES = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-[10px]",
  md: "h-12 px-5 text-base gap-2 rounded-xl",
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
        "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leash disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    />
  );
}

/** The same look for a link that acts like a button. */
export function buttonClasses(variant: keyof typeof VARIANTS = "primary", size: keyof typeof SIZES = "md") {
  return classNames(
    "inline-flex items-center justify-center font-medium transition-colors",
    VARIANTS[variant],
    SIZES[size],
  );
}

/** Square icon buttons in the top bar: bell, profile, settings. */
export function IconButton({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={classNames(
        "relative grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-hairline bg-white text-ink transition-colors hover:bg-paper",
        className,
      )}
    />
  );
}
