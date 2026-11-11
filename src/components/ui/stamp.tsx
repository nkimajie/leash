// Stamps: every amount carries one, saying what happened to the money. Mono type, never colour alone.

import { LinkIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Outcome } from "@/schemas";
import { classNames } from "@/lib/format";
import { OUTCOME_STYLE, STAMP_TONE_CLASSES, type StampTone } from "@/lib/labels";

const SIZES = {
  compact: "h-6 px-2 text-xs", // "Paid"
  row: "h-8 px-3 text-xs font-medium", // "Paid · PayPal captured"
  large: "h-11 px-3 text-sm font-medium", // the same, on a receipt or a result
} as const;

export type StampSize = keyof typeof SIZES;

export function Stamp({ tone, size = "row", children }: { tone: StampTone; size?: StampSize; children: ReactNode }) {
  return (
    <span
      className={classNames(
        "inline-flex shrink-0 items-center gap-2 rounded-lg font-mono whitespace-nowrap",
        STAMP_TONE_CLASSES[tone],
        SIZES[size],
      )}
    >
      {/* Blocked means the leash worked: it gets the leash's link, not an alarm. */}
      {tone === "blocked" && <LinkIcon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
      {children}
    </span>
  );
}

/** "Paid · PayPal captured", or just "Paid" when compact. */
export function OutcomeStamp({ outcome, size = "row" }: { outcome: Outcome; size?: StampSize }) {
  const style = OUTCOME_STYLE[outcome];
  return (
    <Stamp tone={style.tone} size={size}>
      {size === "compact" ? style.label : `${style.label} · ${style.paypal}`}
    </Stamp>
  );
}
