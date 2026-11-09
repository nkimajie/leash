"use client";

// The control room: every purchase and payment, the rule that applied, the AI's reasoning
// and the PayPal status, updating live. You can approve, deny or refund from here, ask it
// questions in plain English, and click a row to see each PayPal step.

import { Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { isSampleHistory, type Decision, type GridView, type Outcome } from "@/schemas";
import { approveDecision, askControlRoom, denyDecision, refundDecision } from "@/lib/api-client";
import { classNames, formatMoney } from "@/lib/format";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";
import { DecisionDetails } from "./decision-details";
import { DecisionsGrid, type DecisionAction } from "./decisions-grid";

const FILTERS: { key: string; label: string; outcomes: Outcome[] | null }[] = [
  { key: "all", label: "All", outcomes: null },
  { key: "waiting", label: "Waiting for you", outcomes: ["held"] },
  { key: "paid", label: "Paid", outcomes: ["auto_approved", "approved"] },
  { key: "stopped", label: "Stopped", outcomes: ["blocked", "denied"] },
  { key: "problems", label: "Failed & refunded", outcomes: ["failed", "refunded"] },
];

const EXAMPLE_QUESTIONS = ["What did I spend on coffee this week?", "Held payments to people", "Biggest purchases"];

/** A filter button as a grid view. */
function viewForFilter(key: string): GridView | null {
  const filter = FILTERS.find((f) => f.key === key);
  if (!filter?.outcomes) return null;
  return {
    outcomes: filter.outcomes,
    kind: null,
    minAmount: null,
    maxAmount: null,
    searchText: null,
    sinceDays: null,
    sortBy: null,
    sortDirection: null,
    summary: filter.label,
  };
}

const PAID: Outcome[] = ["auto_approved", "approved"];

export function ControlRoom() {
  const { decisions, connectionProblem, refresh } = useLiveDecisions();
  const [filterKey, setFilterKey] = useState<string | null>("all");
  const [view, setView] = useState<GridView | null>(null);
  const [question, setQuestion] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const totals = useMemo(() => summarise(decisions), [decisions]);
  const selected = decisions.find((d) => d.id === selectedId) ?? null;

  function showFilter(key: string) {
    setFilterKey(key);
    setView(viewForFilter(key));
  }

  async function ask(text: string) {
    if (!text.trim()) return;
    setQuestion(text);
    setIsAsking(true);
    setActionError(null);
    try {
      setView(await askControlRoom(text));
      setFilterKey(null);
    } catch (error) {
      setActionError((error as Error).message);
    } finally {
      setIsAsking(false);
    }
  }

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
          detail={`${totals.paidCount} ${totals.paidCount === 1 ? "payment" : "payments"}`}
          accent="text-emerald-700"
        />
        <SummaryTile
          label="Waiting for you"
          value={formatMoney(totals.waiting)}
          detail={`${totals.waitingCount} reserved, not taken`}
          accent="text-amber-700"
          onClick={() => showFilter("waiting")}
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
          detail={totals.refundsFailed > 0 ? `${totals.refundsFailed} refund failed: check PayPal` : "nothing charged"}
          accent="text-rose-700"
        />
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50/50 p-3"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
          <TextInput
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask the control room, e.g. “held payments over $20, biggest first”"
            className="flex-1 bg-white"
          />
          <Button type="submit" size="sm" disabled={isAsking || !question.trim()}>
            {isAsking ? "Thinking…" : "Ask"}
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-6">
          {EXAMPLE_QUESTIONS.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isAsking}
              onClick={() => ask(example)}
              className="rounded-full bg-white px-2.5 py-1 text-xs text-violet-700 ring-1 ring-violet-200 hover:ring-violet-400"
            >
              {example}
            </button>
          ))}
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-stone-100 p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => showFilter(filter.key)}
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
        {view && filterKey === null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-sm text-violet-800">
            Showing: {view.summary}
            <button onClick={() => showFilter("all")} aria-label="Clear the view" className="hover:text-violet-950">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        )}
      </div>

      {(actionError || connectionProblem) && (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {actionError ?? "Lost connection to the server. Retrying…"}
        </p>
      )}

      <div className={classNames("grid gap-4", selected && "xl:grid-cols-[minmax(0,1fr)_360px]")}>
        <DecisionsGrid
          decisions={decisions}
          view={view}
          selectedId={selectedId}
          onSelect={(decision) => setSelectedId(decision.id)}
          onAction={takeAction}
        />
        {selected && <DecisionDetails decision={selected} onClose={() => setSelectedId(null)} />}
      </div>
    </div>
  );
}

/** Totals for the tiles. Sample history was never sent to PayPal, so it isn't counted. */
function summarise(allDecisions: Decision[]) {
  const decisions = allDecisions.filter((d) => !isSampleHistory(d));
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
    refundsFailed: decisions.filter((d) => d.paypal.status === "REFUND_FAILED").length,
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
