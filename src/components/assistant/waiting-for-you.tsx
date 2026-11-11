"use client";

// Everything the leash is holding for your decision. PayPal has reserved the money; nothing is
// taken until you approve. Deny asks "Why not?" so your twin learns.

import { useState } from "react";
import type { Decision } from "@/schemas";
import { WhyNotSheet } from "@/components/approvals/why-not-sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Amount } from "@/components/ui/receipt-row";
import { OutcomeStamp, Stamp } from "@/components/ui/stamp";
import { approveDecision } from "@/lib/api-client";
import { formatShortMoney } from "@/lib/format";
import { useLiveDecisions } from "@/lib/use-live-decisions";

export function WaitingForYou() {
  const { decisions, refresh } = useLiveDecisions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [denying, setDenying] = useState<Decision | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const held = decisions.filter((d) => d.outcome === "held").sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const reserved = held.reduce((sum, d) => sum + d.amount, 0);

  async function approve(decision: Decision) {
    setBusyId(decision.id);
    setProblem(null);
    try {
      await approveDecision(decision.id);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't approve it.");
    } finally {
      await refresh();
      setBusyId(null);
    }
  }

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
      <h2 className="text-xl leading-[26px] font-semibold sm:text-2xl">Waiting for you</h2>
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
            <div className="mt-2 flex items-center justify-between gap-3">
              <OutcomeStamp outcome="held" size="compact" />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="w-[100px] sm:w-[104px]"
                  disabled={busyId === decision.id}
                  onClick={() => setDenying(decision)}
                >
                  Deny
                </Button>
                <Button
                  className="w-[110px] sm:w-[112px]"
                  disabled={busyId === decision.id}
                  onClick={() => approve(decision)}
                >
                  {busyId === decision.id ? "Paying…" : "Approve"}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {problem && <p className="mt-2 text-sm text-failed">{problem}</p>}
      <p className="mt-2 text-xs text-ink-soft">Only your tap releases money.</p>
      <WhyNotSheet decision={denying} onClose={() => setDenying(null)} onDenied={() => refresh()} />
    </Card>
  );
}
