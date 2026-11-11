// The LeashMeter: your limits on one bar. Filled up to what Leash may pay without asking, light up to
// your hard limit, hatched beyond it.
//
//   [■■■■■□□□□□□□□□□□□□□▨▨▨]
//   $0                 $240
//   $50 without asking · $200 hard limit

import { formatShortMoney } from "@/lib/format";

export function LeashMeter({ withoutAsking, hardLimit }: { withoutAsking: number; hardLimit: number }) {
  const end = hardLimit * 1.2;
  const at = (amount: number) => `${Math.min(100, (amount / end) * 100)}%`;

  return (
    <div>
      <div
        className="relative h-6 bg-leash-wash"
        role="img"
        aria-label={`${formatShortMoney(withoutAsking)} without asking, ${formatShortMoney(hardLimit)} hard limit`}
      >
        <div
          className="absolute inset-y-0 right-0"
          style={{
            left: at(hardLimit),
            backgroundColor: "#f7f5f0",
            backgroundImage: "repeating-linear-gradient(135deg, #c9c3b5 0 1.5px, transparent 1.5px 6px)",
          }}
        />
        <div className="absolute inset-y-0 left-0 bg-leash" style={{ width: at(withoutAsking) }} />
      </div>
      <div className="mt-2 flex justify-between font-mono text-xs text-ink-soft">
        <span>$0</span>
        <span>{formatShortMoney(Math.round(end))}</span>
      </div>
    </div>
  );
}
