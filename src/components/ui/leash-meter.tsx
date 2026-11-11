// The LeashMeter: your limits on one bar. Filled up to what Leash may pay without asking, light up to
// your hard limit, hatched beyond it. On the approval screen a pin shows where this purchase lands.
//
//   [■■■■■□□□□□□□□□□□□□□▨▨▨]
//   $0                 $240
//   $50 without asking · $200 hard limit

import { classNames, formatShortMoney } from "@/lib/format";

export function LeashMeter({
  withoutAsking,
  hardLimit,
  pin,
  tone = "blue",
}: {
  withoutAsking: number;
  hardLimit: number;
  /** A purchase amount to mark on the bar. */
  pin?: number;
  /** Blue for your settings; ink beside a stamped purchase. */
  tone?: "blue" | "ink";
}) {
  const end = Math.max(hardLimit * 1.2, pin ?? 0);
  const at = (amount: number) => `${Math.min(100, (amount / end) * 100)}%`;

  return (
    <div>
      <div className="relative h-6" role="img" aria-label={`${formatShortMoney(withoutAsking)} without asking, ${formatShortMoney(hardLimit)} hard limit`}>
        <div className={classNames("absolute inset-y-0 left-0 right-0", tone === "blue" ? "bg-leash-wash" : "bg-hairline")} />
        <div
          className="absolute inset-y-0 right-0"
          style={{
            left: at(hardLimit),
            backgroundColor: "#f7f5f0",
            backgroundImage: "repeating-linear-gradient(135deg, #c9c3b5 0 1.5px, transparent 1.5px 6px)",
          }}
        />
        <div className={classNames("absolute inset-y-0 left-0", tone === "blue" ? "bg-leash" : "bg-ink")} style={{ width: at(withoutAsking) }} />
        {pin !== undefined && <div className="absolute -inset-y-1.5 w-0.5 bg-ink" style={{ left: at(pin) }} />}
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-ink-soft">
        <span>$0</span>
        <span>{formatShortMoney(Math.round(end))}</span>
      </div>
    </div>
  );
}
