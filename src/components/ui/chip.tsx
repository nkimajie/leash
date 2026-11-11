// Pill-shaped choices: "Gift cards" in Never buy, reasons in "Why not?", suggestions on Ask.

import { Check, Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";
import { classNames } from "@/lib/format";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** On chips are ink with a check; off chips are sand. */
  on?: boolean;
  /** Shows a plus, for "Add". */
  adds?: boolean;
};

export function Chip({ on = false, adds = false, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={adds ? undefined : on}
      {...props}
      className={classNames(
        "inline-flex min-h-11 items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm font-medium transition-colors disabled:opacity-50",
        on ? "bg-ink text-white" : "bg-hairline text-ink hover:bg-[#dad5c8]",
        className,
      )}
    >
      {on && <Check className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
      {adds && <Plus className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />}
      {children}
    </button>
  );
}
