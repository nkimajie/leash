"use client";

// A receipt and its PayPal trail: every step the money went through, with PayPal's own ids,
// so you can trace exactly where it went (or didn't). Held ones can be decided right here.

import { useState } from "react";
import { isSampleHistory, type Decision } from "@/schemas";
import { DecideButtons } from "@/components/approvals/decide-buttons";
import { Button } from "@/components/ui/button";
import { ReceiptCard } from "@/components/ui/receipt-card";
import { Sheet } from "@/components/ui/sheet";
import { PoweredBy } from "@/components/ui/powered-by";
import { refundDecision } from "@/lib/api-client";
import { classNames, formatReceiptTime, formatShortMoney } from "@/lib/format";
import { paypalStatusInWords } from "@/lib/labels";

type Step = { label: string; detail?: string | null; id?: string | null; stopped?: boolean };

export function ReceiptSheet({
  decision,
  onClose,
  onChanged,
}: {
  decision: Decision | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function act(work: () => Promise<unknown>) {
    setIsBusy(true);
    setProblem(null);
    try {
      await work();
      await onChanged();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That didn't work. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  const canRefund =
    decision?.kind === "purchase" && (decision.outcome === "auto_approved" || decision.outcome === "approved");

  return (
    <Sheet open={decision !== null} onClose={onClose} title="Receipt" close="text">
      {decision && (
        <>
          <ReceiptCard decision={decision} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xl font-semibold">PayPal trail</h3>
            <div className="flex flex-wrap gap-1.5">
              <PoweredBy sponsor="PayPal" />
              <PoweredBy sponsor="APIMatic" />
            </div>
          </div>
          <ol className="mt-3 flex flex-col gap-4">
            {paypalSteps(decision).map((step) => (
              <li key={step.label}>
                <div className={classNames("text-sm", step.stopped && "text-failed")}>{step.label}</div>
                {step.detail && <div className="mt-0.5 text-xs text-ink-soft">{step.detail}</div>}
                {step.id && <div className="mt-0.5 font-mono text-xs break-all text-ink-soft">{step.id}</div>}
              </li>
            ))}
          </ol>
          {problem && <p className="mt-4 text-sm text-failed">{problem}</p>}
          {decision.outcome === "held" && !isSampleHistory(decision) && (
            <DecideButtons decision={decision} onDecided={onClose} className="mt-6" />
          )}
          {canRefund && !isSampleHistory(decision) && (
            <Button
              variant="secondary"
              className="mt-6 w-full"
              disabled={isBusy}
              onClick={() =>
                window.confirm("Refund this purchase with PayPal?") && act(() => refundDecision(decision.id))
              }
            >
              {isBusy ? "Refunding…" : "Refund"}
            </Button>
          )}
        </>
      )}
    </Sheet>
  );
}

/** Statuses PayPal reports for money sent on to a person. */
const PAYOUT_RESULTS = ["SUCCESS", "UNCLAIMED", "FAILED", "RETURNED", "BLOCKED"];

/** Each step the money went through at PayPal, after the rules (on the receipt above) let it through. */
function paypalSteps(decision: Decision): Step[] {
  const { paypal, outcome } = decision;
  const when = formatReceiptTime(decision.createdAt);
  if (outcome === "blocked") return [{ label: "PayPal never called", detail: "Nothing was reserved or taken." }];
  if (isSampleHistory(decision)) {
    return [{ label: "Sample history", detail: "It shows how Leash works, but was never sent to PayPal." }];
  }

  const steps: Step[] = [];
  if (paypal.authorizationId) {
    steps.push({
      label: "Authorized",
      detail: `${when} · ${formatShortMoney(decision.amount)} reserved`,
      id: paypal.authorizationId,
    });
  } else if (paypal.orderId) {
    steps.push({ label: "PayPal order created", id: paypal.orderId });
  }

  if (outcome === "failed" && paypal.captureId) {
    // The money was taken, but PayPal refused to send it on to the person.
    const refunded = paypal.status === "REFUNDED";
    return [
      ...steps,
      { label: "Captured", id: paypal.captureId },
      {
        label: refunded ? "Payout refused, so PayPal refunded you" : "Payout refused, and the refund failed",
        detail: refunded ? null : `Refund capture ${paypal.captureId} in PayPal.`,
        id: paypal.debugId && `debug_id ${paypal.debugId}`,
        stopped: true,
      },
    ];
  }

  const last: Record<Exclude<Decision["outcome"], "blocked">, Step[]> = {
    held: [
      { label: "Waiting for your approval", detail: "Nothing has been taken." },
      { label: "Capture", detail: "Only after your tap." },
    ],
    auto_approved: [
      { label: "Captured", detail: "Within your rules, so it was paid straight away.", id: paypal.captureId },
    ],
    approved: [{ label: "Captured", detail: "You approved it.", id: paypal.captureId }],
    denied: [{ label: "Released", detail: "You denied it. PayPal voided the reservation: you weren't charged." }],
    refunded: [
      { label: "Captured", id: paypal.captureId },
      { label: "Refunded", detail: "The money is back in your PayPal." },
    ],
    failed: [
      {
        label: `PayPal couldn't finish: ${paypal.status ?? "unknown"}`,
        detail: "Nothing was charged.",
        id: paypal.debugId && `debug_id ${paypal.debugId}`,
        stopped: true,
      },
    ],
  };
  steps.push(...last[outcome]);

  if (paypal.payoutId) {
    // Once PayPal reports back (webhook), say what happened at the person's end, e.g. "not claimed yet".
    const reported = PAYOUT_RESULTS.includes(paypal.status ?? "") ? paypalStatusInWords(decision) : "Sent";
    steps.push({
      label: `Paid out to ${decision.counterparty} (PayPal Payouts)`,
      detail: reported,
      id: paypal.payoutId,
      stopped: ["FAILED", "RETURNED", "BLOCKED"].includes(paypal.status ?? ""),
    });
  }
  return steps;
}
