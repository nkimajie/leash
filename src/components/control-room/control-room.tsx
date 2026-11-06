"use client";

// The control room: every purchase and payment, the rule that applied, the AI's reasoning
// and the PayPal status, updating live. You can approve, deny or refund from here.

import { useMemo, useState } from "react";
import type { Decision, Outcome } from "@/schemas";
import { approveDecision, denyDecision, refundDecision } from "@/lib/api-client";
import { classNames, formatMoney } from "@/lib/format";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { TextInput } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";
import { DecisionsGrid, type DecisionAction } from "./decisions-grid";

const FILTERS: { key: string; label: string; outcomes: Outcome[] | null }[] = [
  { key: "all", label: "All", outcomes: null },
  { key: "waiting", label: "Waiting for you", outcomes: ["held"] },
  { key: "paid", label: "Paid", outcomes: ["auto_approved", "approved"] },
  { key: "stopped", label: "Stopped", outcomes: ["blocked", "denied"] },
  { key: "problems", label: "Failed & refunded", outcomes: ["failed", "refunded"] },
];

const PAID: Outcome[] = ["auto_approved", "approved"];

export function ControlRoom() {
  const { decisions, connectionProblem, refresh } = useLiveDecisions();
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [actionError, setActionError] = useState<string | null>(null);

  const totals = useMemo(() => summarise(decisions), [decisions]);
  const visibleOutcomes = FILTERS.find((f) => f.key === filterKey)?.outcomes ?? null;

  async function takeAction(action: DecisionAction, decision: Decision) {
    setActionError(null);
    const run = { approve: approveDecision, deny: denyDecision, refund: refundDecision }[action];
    try {
      await run(decision.id);
    } catch (error) {
      setActionError((error as Error).message);
    }
    await refresh();
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Control room"
        description="Every purchase and payment your assistant made, the rule that applied, and why it chose it. Updates live."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Paid through PayPal"
          value={formatMoney(totals.paid)}
          detail={`${totals.paidCount} payments`}
          accent="text-emerald-700"
        />
        <SummaryTile
          label="Waiting for you"
          value={formatMoney(totals.waiting)}
          detail={`${totals.waitingCount} reserved, not taken`}
          accent="text-amber-700"
          onClick={() => setFilterKey("waiting")}
        />
        <SummaryTile
          label="Stopped by the leash"
          value={formatMoney(totals.stopped)}
          detail="never charged"
          accent="text-stone-800"
        />
        <SummaryTile
          label="Failed payments"
          value={String(totals.failedCount)}
          detail="nothing charged"
          accent="text-rose-700"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterKey(filter.key)}
              className={classNames(
                "rounded-lg px-3 py-1.5 text-sm transition",
                filterKey === filter.key
                  ? "bg-white font-medium text-stone-900 shadow-sm"
                  : "text-stone-600 hover:text-stone-900",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <TextInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items, people, reasoning…"
          className="sm:ml-auto sm:w-80"
        />
      </div>

      {(actionError || connectionProblem) && (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {actionError ?? "Lost connection to the server. Retrying…"}
        </p>
      )}

      <DecisionsGrid
        decisions={decisions}
        searchText={search}
        visibleOutcomes={visibleOutcomes}
        totalPaid={totals.paid}
        onAction={takeAction}
      />
    </div>
  );
}

function summarise(decisions: Decision[]) {
  const sum = (list: Decision[]) => list.reduce((total, d) => total + d.amount, 0);
  const paid = decisions.filter((d) => PAID.includes(d.outcome));
  const waiting = decisions.filter((d) => d.outcome === "held");
  return {
    paid: sum(paid),
    paidCount: paid.length,
    waiting: sum(waiting),
    waitingCount: waiting.length,
    stopped: sum(decisions.filter((d) => d.outcome === "blocked" || d.outcome === "denied")),
    failedCount: decisions.filter((d) => d.outcome === "failed").length,
  };
}

function SummaryTile(props: { label: string; value: string; detail: string; accent: string; onClick?: () => void }) {
  const Element = props.onClick ? "button" : "div";
  return (
    <Element
      onClick={props.onClick}
      className="rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-xs transition hover:border-stone-300"
    >
      <div className="text-xs font-medium text-stone-500">{props.label}</div>
      <div className={classNames("mt-1 text-2xl font-semibold tabular-nums tracking-tight", props.accent)}>
        {props.value}
      </div>
      <div className="mt-0.5 text-xs text-stone-400">{props.detail}</div>
    </Element>
  );
}
