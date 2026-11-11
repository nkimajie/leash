// "POWERED BY AG Grid": a quiet credit beside each hackathon sponsor's tool, where Leash uses it.
// Text only (no logos), in the design system's own style. Hover it to see what the tool does here.

import { classNames } from "@/lib/format";

const WHAT_IT_DOES = {
  PayPal: "Vault, Orders, authorize, capture, void, refund and Payouts: every payment Leash makes.",
  APIMatic: "Every PayPal call goes through PayPal's Server SDK, which APIMatic generates.",
  "AG Grid": "Your receipts: filters and sorting set by asking, live updates, and the totals row.",
  Bryntum: "Bryntum Scheduler draws this timeline.",
  Channel3: "Product search across real online stores.",
  Render: "Hosting, and the daily job that runs restocks.",
} as const;

export type Sponsor = keyof typeof WHAT_IT_DOES;

export function PoweredBy({ sponsor, className }: { sponsor: Sponsor; className?: string }) {
  return (
    <span
      title={WHAT_IT_DOES[sponsor]}
      className={classNames(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-white/80 pr-3 pl-2.5 whitespace-nowrap",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-leash" aria-hidden />
      <span className="font-mono text-[10px] tracking-[0.08em] text-ink-faint uppercase">Powered by</span>
      <span className="text-xs font-semibold tracking-[-0.01em] text-ink">{sponsor}</span>
    </span>
  );
}
