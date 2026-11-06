import { VERDICT } from "@/lib/ui";
import type { Verdict } from "@/lib/types";

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${v.className}`}
    >
      {v.label}
    </span>
  );
}
