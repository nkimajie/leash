"use client";

// Money: know where every payment stands, in two views.
//   Receipts: this week's totals, every receipt (an AG Grid list you can filter by asking), each
//     one's PayPal trail, and a Bryntum timeline of money reserved at PayPal.
//   Dashboard: AG Studio's totals, charts and table, which filter each other when you click.
// Ask links here with a question (/money?ask=...), which is asked straight away.
// /money?view=dashboard opens the dashboard.

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { DAYS_TO_ANSWER, isSampleHistory, type Decision, type GridView } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Stamp } from "@/components/ui/stamp";
import { PoweredBy } from "@/components/ui/powered-by";
import { askControlRoom } from "@/lib/api-client";
import { classNames, formatShortMoney } from "@/lib/format";
import { OUTCOME_STYLE, type StampTone } from "@/lib/labels";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { FilterSheet } from "./filter-sheet";
import { ReceiptSheet } from "./receipt-sheet";

// AG Grid, AG Studio and Bryntum Scheduler all need the browser, so they're only loaded there.
const DecisionsGrid = dynamic(() => import("./decisions-grid").then((file) => file.DecisionsGrid), {
  ssr: false,
  loading: () => <p className="py-6 text-sm text-ink-soft">Loading your receipts…</p>,
});
const ReservationsTimeline = dynamic(
  () => import("./reservations-timeline").then((file) => file.ReservationsTimeline),
  { ssr: false, loading: () => <p className="py-6 text-sm text-ink-soft">Loading the timeline…</p> },
);
const MoneyDashboard = dynamic(() => import("./money-dashboard").then((file) => file.MoneyDashboard), {
  ssr: false,
  loading: () => <p className="py-6 text-sm text-ink-soft">Loading your dashboard…</p>,
});

type MoneyView = "receipts" | "dashboard";

export function MoneyPage() {
  const { decisions, isLoading, connectionProblem, refresh } = useLiveDecisions();
  const searchParams = useSearchParams();
  const [moneyView, setMoneyView] = useState<MoneyView>(() =>
    searchParams.get("view") === "dashboard" ? "dashboard" : "receipts",
  );
  const [view, setView] = useState<GridView | null>(null);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isAsking, setIsAsking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = decisions.find((d) => d.id === selectedId) ?? null;
  const week = useMemo(() => totalsThisWeek(decisions), [decisions]);

  const questionFromLink = searchParams.get("ask");
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
      setMoneyView("receipts");
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
          moneyView === "receipts" && (
            <div className="hidden lg:block">
              <Button variant="secondary" className="w-[368px]" onClick={() => setIsFiltering(true)}>
                Filter by asking
              </Button>
            </div>
          )
        }
      />
      <Segmented
        label="Show"
        className="-mt-2 sm:max-w-xs"
        options={[
          { value: "receipts", label: "Receipts" },
          { value: "dashboard", label: "Dashboard" },
        ]}
        value={moneyView}
        onChange={setMoneyView}
      />

      {(problem || connectionProblem) && (
        <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">
          {problem ?? "Lost connection to the server. Retrying…"}
        </p>
      )}

      {moneyView === "dashboard" ? (
        <Dashboard decisions={decisions} />
      ) : (
        <>
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
                <p className="text-sm">{isLoading ? "Loading…" : "Nothing yet this week."}</p>
              ) : (
                week.map(({ tone, total, label }) => (
                  <Stamp key={tone} tone={tone}>
                    {formatShortMoney(total)} {label}
                  </Stamp>
                ))
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title={view ? view.summary : "Recent activity"}
              action={
                view ? (
                  <button onClick={() => setView(null)} className="text-base text-leash">
                    Close filter
                  </button>
                ) : (
                  <PoweredBy sponsor="AG Grid" />
                )
              }
            />
            <DecisionsGrid
              decisions={decisions}
              isLoading={isLoading}
              view={view}
              selectedId={selectedId}
              onSelect={(decision) => setSelectedId(decision.id)}
            />
          </Card>
          <p className="-mt-2 text-base text-ink-soft">Every payment has a trail. Click a receipt to see it.</p>

          <Card>
            <CardHeader
              title="Money reserved at PayPal"
              action={<PoweredBy sponsor="Bryntum" />}
              description={`When a payment needs your okay, PayPal reserves the money without taking it. Each bar runs until it was decided. One still waiting shows the ${DAYS_TO_ANSWER} days Leash gives you, then PayPal's own limit. Click a bar to see its receipt.`}
            />
            <div className="-mx-4 sm:-mx-6">
              <ReservationsTimeline decisions={decisions} onSelect={setSelectedId} />
            </div>
          </Card>
        </>
      )}

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

type History = "all" | "yours" | "sample";

/** The AG Studio dashboard, with a choice of history and a switch into its editor on wide screens. */
function Dashboard({ decisions }: { decisions: Decision[] }) {
  const [history, setHistory] = useState<History>("all");
  const [isCustomising, setIsCustomising] = useState(false);
  const shown = history === "all" ? decisions : decisions.filter((d) => isSampleHistory(d) === (history === "sample"));
  return (
    <section className="-mt-2 flex flex-col gap-4">
      <p className="max-w-2xl text-sm text-ink-soft">
        Live as your assistant spends. Click a bar or a row and the rest filters to match. Every account starts with
        some sample history, which was never sent to PayPal.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="History"
          className="w-full sm:w-auto sm:min-w-80"
          options={[
            { value: "all", label: "All" },
            { value: "yours", label: "Yours" },
            { value: "sample", label: "Sample" },
          ]}
          value={history}
          onChange={setHistory}
        />
        <div className="flex items-center gap-4">
          <button onClick={() => setIsCustomising(!isCustomising)} className="hidden text-base text-leash lg:block">
            {isCustomising ? "Done" : "Customise"}
          </button>
          <PoweredBy sponsor="AG Studio" />
        </div>
      </div>
      {/* Studio fills the box it's given: tall enough to show the whole dashboard without its own
          scrollbar. Its widgets sit 16 px inside their cells, so the box reaches past the page margin. */}
      <div className={classNames("-mx-4", isCustomising ? "h-[calc(100dvh-64px)]" : "h-[2000px] sm:h-[1200px]")}>
        <MoneyDashboard decisions={shown} mode={isCustomising ? "edit" : "view"} />
      </div>
    </section>
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
