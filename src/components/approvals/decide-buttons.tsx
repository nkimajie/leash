"use client";

// Deny and Approve, right where a purchase or payment waits for you. Approve: PayPal takes the
// reserved money. Deny: "Why not?" first (so your twin learns), then PayPal releases it.
// Only your tap does this: the assistant and outside agents have no way to approve.

import Link from "next/link";
import { useState } from "react";
import type { Decision } from "@/schemas";
import { Button } from "@/components/ui/button";
import { approveDecision } from "@/lib/api-client";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { useShowDecisionResult } from "./decision-result";
import { WhyNotSheet } from "./why-not-sheet";

export function DecideButtons({
  decision,
  onDecided,
  className,
}: {
  decision: Decision;
  /** e.g. close the receipt this sits in. */
  onDecided?: (decided: Decision) => void;
  className?: string;
}) {
  const { refresh } = useLiveDecisions();
  const showResult = useShowDecisionResult();
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  function decided(result: Decision) {
    onDecided?.(result);
    showResult(result);
    refresh();
  }

  async function approve() {
    setIsApproving(true);
    setProblem(null);
    try {
      decided(await approveDecision(decision.id));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't approve it. Please try again.");
    } finally {
      setIsApproving(false);
    }
  }

  return (
    <div className={className}>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1 sm:w-[104px] sm:flex-none"
          disabled={isApproving}
          onClick={() => setIsDenying(true)}
        >
          Deny
        </Button>
        <Button className="flex-1 sm:w-[112px] sm:flex-none" disabled={isApproving} onClick={approve}>
          {isApproving ? "Paying…" : "Approve"}
        </Button>
      </div>
      {problem && (
        <p className="mt-2 text-sm text-failed">
          {problem}{" "}
          {decision.kind === "payment" && (
            <Link href="/leash/people" className="text-leash">
              Go to the people you pay
            </Link>
          )}
        </p>
      )}
      <WhyNotSheet
        decision={isDenying ? decision : null}
        onClose={() => setIsDenying(false)}
        onDenied={(denied) => decided(denied)}
      />
    </div>
  );
}
