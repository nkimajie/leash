import type { Outcome } from "@/schemas";
import { classNames } from "@/lib/format";
import { OUTCOME_STYLE } from "@/lib/labels";

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  const style = OUTCOME_STYLE[outcome];
  return (
    <span
      className={classNames(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        style.tone,
      )}
    >
      <span className={classNames("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}
