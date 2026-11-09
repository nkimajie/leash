"use client";

// The story of one purchase or payment, step by step: the rules, then each PayPal call
// with its id, so you can trace exactly where the money went (or didn't).

import { Check, Circle, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { isSampleHistory, type Decision } from "@/schemas";
import { classNames, formatMoney, formatWhen } from "@/lib/format";
import { RULE_LABEL, paypalStatusInWords } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { OutcomeBadge } from "@/components/ui/outcome-badge";
import { FoundWith, ProductPhoto, StoreLink } from "@/components/ui/product-photo";

type Step = { label: string; detail?: string | null; state: "done" | "stopped" | "waiting" | "note" };

export function DecisionDetails({ decision, onClose }: { decision: Decision; onClose: () => void }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <ProductPhoto decision={decision} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold leading-snug">{decision.title}</div>
            <div className="text-sm text-stone-500">
              {decision.counterparty} · {formatWhen(decision.createdAt)}
            </div>
            <div className="flex flex-wrap gap-x-2">
              <StoreLink decision={decision} />
              <FoundWith product={decision.product} />
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-stone-400 hover:text-stone-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-3xl font-semibold tabular-nums tracking-tight">{formatMoney(decision.amount)}</span>
          <OutcomeBadge outcome={decision.outcome} />
        </div>

        <p className="text-sm leading-relaxed text-stone-600">
          <span className="font-medium text-stone-900">Why the AI chose it: </span>
          {decision.aiReasoning}
        </p>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
            What happened to the money
          </div>
          <ol className="flex flex-col gap-2.5">
            {stepsFor(decision).map((step) => (
              <li key={step.label} className="flex gap-2.5 text-sm">
                <StepMark state={step.state} />
                <div className="min-w-0">
                  <div className={classNames(step.state === "stopped" ? "text-rose-700" : "text-stone-800")}>
                    {step.label}
                  </div>
                  {step.detail && <div className="break-all font-mono text-[11px] text-stone-400">{step.detail}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {decision.outcome === "held" && (
          <Link
            href={`/approve/${decision.id}`}
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            <Smartphone className="h-4 w-4" />
            Open approval screen
          </Link>
        )}
      </div>
    </Card>
  );
}

/** Statuses PayPal reports for money sent on to a person. */
const PAYOUT_RESULTS = ["SUCCESS", "UNCLAIMED", "FAILED", "RETURNED", "BLOCKED"];

/** Each step the money went through, from the rule check to PayPal's last word. */
function stepsFor(decision: Decision): Step[] {
  const { paypal, outcome } = decision;
  const rules: Step = {
    label: `Rules checked: ${RULE_LABEL[decision.ruleHit]}`,
    detail: decision.ruleExplanation,
    state: outcome === "blocked" ? "stopped" : "done",
  };
  if (outcome === "blocked") return [rules, { label: "PayPal was never called", state: "stopped" }];
  if (isSampleHistory(decision)) {
    return [rules, { label: "Sample history: shows how Leash works, but was never sent to PayPal", state: "note" }];
  }

  const steps: Step[] = [rules];
  if (paypal.orderId) steps.push({ label: "PayPal order created", detail: paypal.orderId, state: "done" });
  if (paypal.authorizationId) {
    steps.push({ label: "Money reserved (authorized)", detail: paypal.authorizationId, state: "done" });
  }

  const last: Partial<Record<Decision["outcome"], Step>> = {
    held: { label: "Waiting for you: approve to take it, deny to release it", state: "waiting" },
    auto_approved: { label: "Money taken (captured)", detail: paypal.captureId, state: "done" },
    approved: { label: "You approved: money taken (captured)", detail: paypal.captureId, state: "done" },
    denied: { label: "You denied: reservation released (voided)", detail: paypal.status, state: "stopped" },
    refunded: { label: "Taken, then refunded to you", detail: paypal.captureId, state: "done" },
    failed: {
      label: `PayPal error: ${paypal.status ?? "unknown"}. Nothing charged.`,
      detail: paypal.debugId && `debug_id ${paypal.debugId}`,
      state: "stopped",
    },
  };
  const finalStep = last[outcome];
  if (finalStep) steps.push(finalStep);
  if (paypal.payoutId) {
    // Once PayPal reports back (webhook), say what happened at the person's end, e.g. "not claimed yet".
    const reported = PAYOUT_RESULTS.includes(paypal.status ?? "")
      ? `: ${paypalStatusInWords(decision).toLowerCase()}`
      : "";
    steps.push({
      label: `Sent on to ${decision.counterparty}'s PayPal (Payouts)${reported}`,
      detail: paypal.payoutId,
      state: ["FAILED", "RETURNED", "BLOCKED"].includes(paypal.status ?? "") ? "stopped" : "done",
    });
  }
  return steps;
}

function StepMark({ state }: { state: Step["state"] }) {
  const style = {
    done: "bg-emerald-100 text-emerald-700",
    stopped: "bg-rose-100 text-rose-700",
    waiting: "bg-amber-100 text-amber-700",
    note: "bg-stone-100 text-stone-500",
  }[state];
  const Icon = state === "done" ? Check : state === "stopped" ? X : Circle;
  return (
    <span className={classNames("mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full", style)}>
      <Icon className="h-3 w-3" />
    </span>
  );
}
