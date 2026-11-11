"use client";

// Money: know where every payment stands. This week's totals, every receipt (an AG Grid list you
// can filter by asking), each one's PayPal trail, and a Bryntum timeline of money reserved at PayPal.
// Ask links here with a question (/money?ask=...), which is asked straight away.

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { DAYS_TO_ANSWER, isSampleHistory, type Decision, type GridView } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Stamp } from "@/components/ui/stamp";
import { askControlRoom } from "@/lib/api-client";
import { formatShortMoney } from "@/lib/format";
import { OUTCOME_STYLE, type StampTone } from "@/lib/labels";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { FilterSheet } from "./filter-sheet";
import { ReceiptSheet } from "./receipt-sheet";

// AG Grid and Bryntum Scheduler both need the browser, so they're only loaded there.
const DecisionsGrid = dynamic(() => import("./decisions-grid").then((file) => file.DecisionsGrid), {
  ssr: false,
  loading: () => <p className="py-6 text-sm text-ink-soft">Loading your receipts…</p>,
});
const ReservationsTimeline = dynamic(
  () => import("./reservations-timeline").then((file) => file.ReservationsTimeline),
  { ssr: false, loading: () => <p className="py-6 text-sm text-ink-soft">Loading the timeline…</p> },
);

export function MoneyPage() {
  const { decisions, connectionProblem, refresh } = useLiveDecisions();
  const [view, setView] = useState<GridView | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = decisions.find((d) => d.id === selectedId) ?? null;
  const week = useMemo(() => totalsThisWeek(decisions), [decisions]);

  const questionFromLink = useSearchParams().get("ask");
  const askFromLink = useEffectEvent((text: string) => ask(text));
  useEffect(() => {
    if (questionFromLink) askFromLink(questionFromLink);
  }, [questionFromLink]);

  async function ask(question: string) {
    setIsAsking(true);
    setProblem(null);
    try {
      setView(await askControlRoom(question));
      setIsFiltering(false);
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setIsAsking(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Your money"
        description="Know where every payment stands."
        action={
          <div className="hidden lg:block">
            <Button variant="secondary" className="w-[368px]" onClick={() => setIsFiltering(true)}>
              Filter by asking
            </Button>
          </div>
        }
      />
      <button
        onClick={() => setIsFiltering(true)}
        className="-mt-2 flex h-14 items-center rounded-2xl border border-hairline bg-white px-4 text-left text-sm text-ink-soft lg:hidden"
      >
        Filter by asking
      </button>

      <Card>
        <h2 className="text-sm text-ink-soft sm:text-base">This week</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {week.length === 0 ? (
            <p className="text-sm">Nothing yet this week.</p>
          ) : (
            week.map(({ tone, total, label }) => (
              <Stamp key={tone} tone={tone}>
                {formatShortMoney(total)} {label}
              </Stamp>
            ))
          )}
        </div>
      </Card>

      {(problem || connectionProblem) && (
        <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">
          {problem ?? "Lost connection to the server. Retrying…"}
        </p>
      )}

      <Card>
        <CardHeader
          title={view ? view.summary : "Recent activity"}
          action={
            view && (
              <button onClick={() => setView(null)} className="text-base text-leash">
                Close filter
              </button>
            )
          }
        />
        <DecisionsGrid
          decisions={decisions}
          view={view}
          selectedId={selectedId}
          onSelect={(decision) => setSelectedId(decision.id)}
        />
      </Card>
      <p className="-mt-2 text-base text-ink-soft">Every payment has a trail. Click a receipt to see it.</p>

      <Card>
        <CardHeader
          title="Money reserved at PayPal"
          description={`When a payment needs your okay, PayPal reserves the money without taking it. Each bar runs until it was decided. One still waiting shows the ${DAYS_TO_ANSWER} days Leash gives you, then PayPal's own limit. Click a bar to see its receipt.`}
        />
        <div className="-mx-4 sm:-mx-6">
          <ReservationsTimeline decisions={decisions} onSelect={setSelectedId} />
        </div>
      </Card>

      <ReceiptSheet decision={selected} onClose={() => setSelectedId(null)} onChanged={refresh} />
      <FilterSheet
        open={isFiltering}
        onClose={() => setIsFiltering(false)}
        onAsk={ask}
        onView={(next) => {
          setView(next);
          setIsFiltering(false);
        }}
        isAsking={isAsking}
      />
    </Page>
  );
}

/** "$54 paid · $157 reserved · $900 blocked" for the last 7 days. Sample history was never sent to PayPal. */
function totalsThisWeek(decisions: Decision[]): { tone: StampTone; total: number; label: string }[] {
  const weekAgo = Date.now() - 7 * 86_400_000;
  const totals = new Map<StampTone, number>();
  for (const decision of decisions) {
    if (isSampleHistory(decision) || Date.parse(decision.createdAt) < weekAgo) continue;
    const tone = OUTCOME_STYLE[decision.outcome].tone;
    totals.set(tone, (totals.get(tone) ?? 0) + decision.amount);
  }
  const order: StampTone[] = ["paid", "reserved", "blocked", "released", "refunded", "failed"];
  return order
    .filter((tone) => totals.has(tone))
    .map((tone) => ({ tone, total: Math.round((totals.get(tone) ?? 0) * 100) / 100, label: tone }));
}
