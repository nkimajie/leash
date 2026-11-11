"use client";

// Side panel listing everything the leash is holding for your decision.

import { Smartphone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { approveDecision, denyDecision } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import { RULE_LABEL } from "@/lib/labels";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";

export function WaitingForYou() {
  const { decisions, refresh } = useLiveDecisions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const held = decisions.filter((d) => d.outcome === "held");

  async function decide(id: string, choice: "approve" | "deny") {
    setBusyId(id);
    try {
      await (choice === "approve" ? approveDecision(id) : denyDecision(id));
    } finally {
      await refresh();
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Waiting for you"
        description={held.length ? "Money is reserved, not taken, until you decide." : "Nothing needs you right now."}
      />
      {held.length > 0 && (
        <ul className="divide-y divide-stone-100">
          {held.map((decision) => (
            <li key={decision.id} className="flex flex-col gap-2 px-5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{decision.title}</div>
                  <div className="text-xs text-amber-700">{RULE_LABEL[decision.ruleHit]}</div>
                </div>
                <div className="text-sm font-semibold tabular-nums">{formatMoney(decision.amount)}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={busyId === decision.id}
                  onClick={() => decide(decision.id, "approve")}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === decision.id}
                  onClick={() => decide(decision.id, "deny")}
                >
                  Deny
                </Button>
                <Link
                  href={`/approve/${decision.id}`}
                  target="_blank"
                  className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  Phone view
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
