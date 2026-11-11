"use client";

// Everything the leash is holding for your decision. PayPal has reserved the money; nothing is
// taken until you approve, right here. Deny asks "Why not?" so your twin learns.

import { DecideButtons } from "@/components/approvals/decide-buttons";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/ui/receipt-row";
import { OutcomeStamp, Stamp } from "@/components/ui/stamp";
import { formatShortMoney } from "@/lib/format";
import { useLiveDecisions } from "@/lib/use-live-decisions";

export function WaitingForYou({ title = "Waiting for you" }: { title?: string }) {
  const { decisions } = useLiveDecisions();
  const held = decisions.filter((d) => d.outcome === "held").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reserved = held.reduce((sum, d) => sum + d.amount, 0);

  if (held.length === 0) {
    return (
      <Card>
        <h2 className="text-xl font-semibold">Nothing waiting for you</h2>
        <p className="mt-2 text-sm text-ink-soft">If something needs your okay, you&apos;ll find it here.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-xl leading-[26px] font-semibold sm:text-2xl">{title}</h2>
      <div className="mt-3">
        <Stamp tone="reserved">{formatShortMoney(reserved)} reserved, not taken</Stamp>
      </div>
      <ul className="mt-2 flex flex-col">
        {held.map((decision) => (
          <li key={decision.id} className="py-3">
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 truncate text-base">{decision.title}</span>
              <Amount decision={decision} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <OutcomeStamp outcome="held" size="compact" />
              <DecideButtons decision={decision} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-ink-soft">Only your tap releases money.</p>
    </Card>
  );
}
