"use client";

// Phone-sized screen for one held purchase or payment.
// Approve: PayPal takes the reserved money. Deny: PayPal releases it, nothing is charged.

import { ShieldAlert, ShoppingBag, UserRound } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Decision } from "@/schemas";
import { approveDecision, denyDecision, fetchDecision } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import { RULE_LABEL } from "@/lib/labels";
import { LeashLogo } from "@/components/layout/leash-logo";
import { Button } from "@/components/ui/button";
import { OutcomeBadge } from "@/components/ui/outcome-badge";

export function ApprovalScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [busyWith, setBusyWith] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDecision(id)
      .then(setDecision)
      .catch(() => setNotFound(true));
  }, [id]);

  async function decide(choice: "approve" | "deny") {
    setBusyWith(choice);
    setError(null);
    try {
      setDecision(await (choice === "approve" ? approveDecision(id) : denyDecision(id)));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusyWith(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-5 px-4 py-8">
      <div className="flex justify-center">
        <LeashLogo />
      </div>

      {notFound && <p className="mt-10 text-center text-stone-500">This approval request doesn&apos;t exist.</p>}
      {!decision && !notFound && <p className="mt-10 animate-pulse text-center text-stone-400">Loading…</p>}

      {decision && (
        <>
          <p className="text-center text-sm font-medium text-stone-500">
            {decision.kind === "payment" ? "Your assistant wants to send money" : "Your assistant wants to buy"}
          </p>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-stone-100 text-stone-600">
                {decision.kind === "payment" ? <UserRound className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <div className="font-semibold leading-snug">{decision.title}</div>
                <div className="text-sm text-stone-500">{decision.counterparty}</div>
              </div>
            </div>

            <div className="mt-6 text-5xl font-semibold tabular-nums tracking-tight">
              {formatMoney(decision.amount)}
            </div>

            <div className="mt-5 flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                <span className="font-medium">{RULE_LABEL[decision.ruleHit]}.</span> {decision.ruleExplanation}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-stone-600">
              <span className="font-medium text-stone-900">Why: </span>
              {decision.aiReasoning}
            </p>
          </div>

          {decision.outcome === "held" ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={busyWith !== null}
                  onClick={() => decide("deny")}
                  className="rounded-2xl"
                >
                  {busyWith === "deny" ? "Releasing…" : "Deny"}
                </Button>
                <Button
                  size="lg"
                  variant="approve"
                  disabled={busyWith !== null}
                  onClick={() => decide("approve")}
                  className="rounded-2xl"
                >
                  {busyWith === "approve" ? "Paying…" : "Approve"}
                </Button>
              </div>
              <p className="text-center text-xs text-stone-500">
                PayPal has reserved {formatMoney(decision.amount)} but not taken it. Deny and it&apos;s released.
              </p>
            </>
          ) : (
            <FinalOutcome decision={decision} />
          )}

          {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">{error}</p>}

          <Link
            href="/control-room"
            className="mt-auto text-center text-sm text-stone-500 underline-offset-4 hover:underline"
          >
            Open the control room
          </Link>
        </>
      )}
    </main>
  );
}

function FinalOutcome({ decision }: { decision: Decision }) {
  const message: Partial<Record<Decision["outcome"], string>> = {
    approved: `Done. PayPal took ${formatMoney(decision.amount)}.`,
    denied: "Denied. PayPal released the reserved money, so you weren't charged. Your twin will remember this.",
    failed: "PayPal declined the payment. Nothing was charged.",
    refunded: "This was refunded.",
  };
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-6 text-center ring-1 ring-stone-200">
      <OutcomeBadge outcome={decision.outcome} />
      <p className="text-sm text-stone-700">{message[decision.outcome] ?? "This has already been decided."}</p>
      {decision.paypal.debugId && (
        <p className="font-mono text-xs text-stone-400">debug_id {decision.paypal.debugId}</p>
      )}
    </div>
  );
}
