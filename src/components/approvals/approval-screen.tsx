"use client";

// The phone screen for one purchase or payment that waits for you (you get here from a QR code).
// Approve: PayPal takes the reserved money. Deny: PayPal releases it, you're never charged, and
// "Why not?" teaches your twin. Only your tap releases money.

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { DAYS_TO_ANSWER, type Decision, type Preference, type SpendingRules } from "@/schemas";
import { LeashLogo } from "@/components/layout/leash-logo";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { LeashMeter } from "@/components/ui/leash-meter";
import { FoundWith, ProductPhoto, StoreLink } from "@/components/ui/product-photo";
import { OutcomeStamp } from "@/components/ui/stamp";
import { approveDecision, fetchDecision, fetchDecisions, fetchPreferences, fetchSpendingRules } from "@/lib/api-client";
import { classNames, formatMoney, formatShortMoney, inSentence } from "@/lib/format";
import { WhyNotSheet } from "./why-not-sheet";

export function ApprovalScreen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [rules, setRules] = useState<SpendingRules | null>(null);
  const [stillWaiting, setStillWaiting] = useState<Decision[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    fetchDecision(id).then(setDecision, () => setNotFound(true));
    fetchSpendingRules().then(setRules, () => {});
  }, [id]);

  // After you decide, mention anything else that still waits for you.
  const decided = decision !== null && decision.outcome !== "held";
  useEffect(() => {
    if (decided)
      fetchDecisions().then(
        (all) => setStillWaiting(all.filter((d) => d.outcome === "held")),
        () => {},
      );
  }, [decided]);

  async function approve() {
    setIsApproving(true);
    setProblem(null);
    try {
      setDecision(await approveDecision(id));
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/" className="flex items-center gap-1 text-sm text-ink-soft">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          Back
        </Link>
        <LeashLogo size="compact" />
      </header>

      {notFound && <p className="mt-10 text-center text-ink-soft">This approval request doesn&apos;t exist.</p>}
      {!decision && !notFound && <p className="mt-10 animate-pulse text-center text-ink-soft">Loading…</p>}

      {decision && (
        <div className="flex flex-1 flex-col gap-5 px-5 pb-6">
          {decision.outcome === "held" ? (
            <Waiting decision={decision} rules={rules} />
          ) : (
            <Decided decision={decision} />
          )}
          {problem && <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">{problem}</p>}
        </div>
      )}

      {decision?.outcome === "held" && (
        <footer className="sticky bottom-0 rounded-t-[28px] border-t border-hairline bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" disabled={isApproving} onClick={() => setIsDenying(true)}>
              Deny
            </Button>
            <Button disabled={isApproving} onClick={approve}>
              {isApproving ? "Paying…" : "Approve"}
            </Button>
          </div>
          <p className="mt-3 text-center text-xs text-ink-soft">Only your tap releases money.</p>
        </footer>
      )}

      {decided && (
        <footer className="sticky bottom-0 rounded-t-[28px] border-t border-hairline bg-white px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link
            href={stillWaiting[0] ? `/approve/${stillWaiting[0].id}` : "/"}
            className={classNames(buttonClasses(), "w-full")}
          >
            {stillWaiting[0] ? "Next" : "Done"}
          </Link>
          <p className="mt-3 text-center text-xs text-ink-soft">
            {stillWaiting[0]
              ? `Your ${inSentence(stillWaiting[0].title)} is still waiting for you.`
              : "Nothing else needs your okay."}
          </p>
        </footer>
      )}

      <WhyNotSheet
        decision={isDenying ? decision : null}
        onClose={() => setIsDenying(false)}
        onDenied={(denied) => setDecision(denied)}
      />
    </main>
  );
}

/** "Leash wants to buy $72.00": the receipt, then why it needs you and why Leash chose it. */
function Waiting({ decision, rules }: { decision: Decision; rules: SpendingRules | null }) {
  const [openedAt] = useState(() => Date.now());
  const daysWaited = Math.floor((openedAt - Date.parse(decision.createdAt)) / 86_400_000);
  const daysLeft = Math.max(0, DAYS_TO_ANSWER - daysWaited);
  const hardLimit = rules && (decision.kind === "payment" ? rules.maxPaymentPerPerson : rules.maxItemPrice);

  return (
    <>
      <Card className="p-5">
        <h1 className="text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">
          {decision.kind === "payment" ? "Leash wants to pay" : "Leash wants to buy"}
        </h1>
        <p className="mt-3 font-mono text-[40px] leading-[44px] font-medium tabular-nums">
          {formatMoney(decision.amount)}
        </p>
        <div className="mt-4">
          <OutcomeStamp outcome="held" size="large" />
        </div>
        <p className="mt-3 text-sm text-ink-soft">Reserved by PayPal, not taken.</p>
        <WhatItIs decision={decision} />
      </Card>

      <Card className="p-5">
        <h2 className="text-xl leading-[26px] font-semibold">Why this needs your okay</h2>
        {rules && hardLimit && (
          <div className="mt-5">
            <LeashMeter withoutAsking={rules.autoApproveLimit} hardLimit={hardLimit} pin={decision.amount} tone="ink" />
          </div>
        )}
        <p className="mt-4 text-sm font-medium">{decision.ruleExplanation}</p>
        <h2 className="mt-6 text-xl leading-[26px] font-semibold">Why Leash chose it</h2>
        <p className="mt-3 text-sm text-ink-soft">{decision.aiReasoning}</p>
        <p className="mt-5 text-xs text-ink-soft">
          Released automatically {daysLeft === 0 ? "today" : `in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`} if you
          don&apos;t answer.
        </p>
      </Card>
    </>
  );
}

const DECIDED: Partial<Record<Decision["outcome"], { title: string; illustration: IllustrationName }>> = {
  approved: { title: "All paid.", illustration: "all-set" },
  auto_approved: { title: "All paid.", illustration: "all-set" },
  denied: { title: "You weren't charged.", illustration: "released" },
  refunded: { title: "Refunded.", illustration: "released" },
  blocked: { title: "The leash held.", illustration: "boundary-held" },
  failed: { title: "PayPal couldn't finish.", illustration: "waiting" },
};

/** After you decide: "All paid." or "You weren't charged.", your purchase, and what your twin learned. */
function Decided({ decision }: { decision: Decision }) {
  const { title, illustration } = DECIDED[decision.outcome] ?? { title: "Decided.", illustration: "all-set" };
  const amount = formatShortMoney(decision.amount);
  const whatPayPalDid =
    decision.outcome === "denied"
      ? `PayPal released the ${amount}. You were never charged.`
      : decision.outcome === "failed"
        ? "Nothing was charged."
        : `PayPal paid ${amount} to ${decision.counterparty}.`;

  return (
    <>
      <Card className="p-5">
        <div className="grid place-items-center rounded-2xl border border-leash-rim bg-leash-wash">
          <Illustration name={illustration} className="w-44" />
        </div>
        <h1 className="mt-5 text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">{title}</h1>
        <p
          className={classNames(
            "mt-3 font-mono text-[40px] leading-[44px] font-medium tabular-nums",
            decision.outcome === "denied" && "line-through",
          )}
        >
          {formatMoney(decision.amount)}
        </p>
        <div className="mt-4">
          <OutcomeStamp outcome={decision.outcome} size="large" />
        </div>
        <p className="mt-3 text-sm text-ink-soft">{whatPayPalDid}</p>
        {decision.paypal.debugId && (
          <p className="mt-2 font-mono text-xs text-ink-soft">debug_id {decision.paypal.debugId}</p>
        )}
      </Card>
      <Card className="p-5">
        <h2 className="text-base font-medium">Your {decision.kind === "payment" ? "payment" : "purchase"}</h2>
        <WhatItIs decision={decision} />
      </Card>
      <ALittleWiser decisionId={decision.id} />
    </>
  );
}

/** The product (photo, store) or the person being paid. */
function WhatItIs({ decision }: { decision: Decision }) {
  return (
    <div className="mt-5 flex items-center gap-4">
      <ProductPhoto decision={decision} size="lg" />
      <div className="min-w-0">
        <div className="text-base">{decision.title}</div>
        <div className="text-sm text-ink-soft">
          {decision.payee
            ? decision.payee.email
              ? `To ${decision.payee.email}, with PayPal Payouts`
              : "No PayPal email yet: add one in Your leash, under People"
            : [decision.counterparty, decision.category].filter(Boolean).join(" · ")}
        </div>
        {!decision.payee && (
          <div className="flex flex-wrap gap-x-2">
            <StoreLink decision={decision} />
            <FoundWith product={decision.product} />
          </div>
        )}
      </div>
    </div>
  );
}

/** The lesson your twin took from this decision, if it took one. */
function ALittleWiser({ decisionId }: { decisionId: string }) {
  const [lesson, setLesson] = useState<Preference | null>(null);
  useEffect(() => {
    fetchPreferences()
      .then((lessons) => setLesson(lessons.find((p) => p.learnedFromDecisionId === decisionId) ?? null))
      .catch(() => {});
  }, [decisionId]);

  if (!lesson) return null;
  return (
    <Card className="p-5">
      <h2 className="text-xl leading-[26px] font-semibold">A little wiser</h2>
      <p className="mt-3 text-base">→ {lesson.statement}</p>
    </Card>
  );
}
