"use client";

// Phone-sized screen for one held purchase or payment.
// Approve: PayPal takes the reserved money. Deny: PayPal releases it, nothing is charged,
// and you can tell your twin why, so it learns the right lesson.

import { ShieldAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { QUICK_REASONS, type Decision, type Preference, type QuickReason } from "@/schemas";
import { approveDecision, denyDecision, fetchDecision, fetchPreferences } from "@/lib/api-client";
import { classNames, formatMoney } from "@/lib/format";
import { QUICK_REASON_LABEL, RULE_LABEL } from "@/lib/labels";
import { LeashLogo } from "@/components/layout/leash-logo";
import { Button } from "@/components/ui/button";
import { OutcomeBadge } from "@/components/ui/outcome-badge";
import { ProductPhoto, StoreLink } from "@/components/ui/product-photo";

export function ApprovalScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [askingWhy, setAskingWhy] = useState(false);
  const [busyWith, setBusyWith] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDecision(id)
      .then(setDecision)
      .catch(() => setNotFound(true));
  }, [id]);

  async function decide(choice: "approve" | "deny", why?: { reason?: QuickReason; note?: string }) {
    setBusyWith(choice);
    setError(null);
    try {
      setDecision(await (choice === "approve" ? approveDecision(id) : denyDecision(id, why)));
      setAskingWhy(false);
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
              <ProductPhoto decision={decision} size="lg" />
              <div className="min-w-0">
                <div className="font-semibold leading-snug">{decision.title}</div>
                <div className="text-sm text-stone-500">{decision.counterparty}</div>
                <StoreLink decision={decision} />
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
              <span className="font-medium text-stone-900">Why it chose this: </span>
              {decision.aiReasoning}
            </p>
          </div>

          {decision.outcome !== "held" ? (
            <FinalOutcome decision={decision} />
          ) : askingWhy ? (
            <WhyNot
              isPurchase={decision.kind === "purchase"}
              isBusy={busyWith !== null}
              onDeny={(why) => decide("deny", why)}
              onBack={() => setAskingWhy(false)}
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={busyWith !== null}
                  onClick={() => setAskingWhy(true)}
                  className="rounded-2xl"
                >
                  Deny
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

/** "Why not?" Quick reasons and your own words both teach the twin; both are optional. */
function WhyNot(props: {
  isPurchase: boolean;
  isBusy: boolean;
  onDeny: (why: { reason?: QuickReason; note?: string }) => void;
  onBack: () => void;
}) {
  const [reason, setReason] = useState<QuickReason | undefined>();
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-5 ring-1 ring-stone-200">
      <div>
        <div className="font-semibold">Why not?</div>
        <div className="text-sm text-stone-500">
          Optional. Your twin learns from it, so it chooses better next time.
        </div>
      </div>
      {props.isPurchase && (
        <div className="flex flex-wrap gap-2">
          {QUICK_REASONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReason(reason === option ? undefined : option)}
              className={classNames(
                "rounded-full px-3 py-1.5 text-sm ring-1 transition",
                reason === option
                  ? "bg-stone-900 text-white ring-stone-900"
                  : "bg-white text-stone-700 ring-stone-300 hover:ring-stone-400",
              )}
            >
              {QUICK_REASON_LABEL[option]}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        rows={2}
        maxLength={240}
        placeholder="Or in your own words, e.g. “I only want hand grinders”"
        className="w-full resize-none rounded-xl bg-stone-50 px-3 py-2 text-sm outline-none ring-1 ring-stone-200 focus:ring-stone-400"
      />
      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" variant="ghost" disabled={props.isBusy} onClick={props.onBack} className="rounded-2xl">
          Back
        </Button>
        <Button
          size="lg"
          disabled={props.isBusy}
          onClick={() => props.onDeny({ reason, note: note.trim() || undefined })}
          className="rounded-2xl"
        >
          {props.isBusy ? "Releasing…" : "Deny"}
        </Button>
      </div>
    </div>
  );
}

function FinalOutcome({ decision }: { decision: Decision }) {
  const message: Partial<Record<Decision["outcome"], string>> = {
    approved: `Done. PayPal took ${formatMoney(decision.amount)}.`,
    denied: "Denied. PayPal released the reserved money, so you weren't charged.",
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
      <WhatYourTwinLearned decisionId={decision.id} />
    </div>
  );
}

/** Shows the lesson your twin took from this decision, if it took one. */
function WhatYourTwinLearned({ decisionId }: { decisionId: string }) {
  const [lesson, setLesson] = useState<Preference | null>(null);
  useEffect(() => {
    fetchPreferences()
      .then((preferences) => setLesson(preferences.find((p) => p.learnedFromDecisionId === decisionId) ?? null))
      .catch(() => {});
  }, [decisionId]);

  if (!lesson) return null;
  return (
    <div className="flex w-full gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-left text-sm text-violet-900">
      <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <span className="font-medium">Your twin learned: </span>
        {lesson.statement}
      </span>
    </div>
  );
}
