"use client";

// Recurring restocks: things the assistant buys again on a schedule. A daily job runs the
// ones that are due. Because you aren't there to watch, everything they buy waits for your OK.

import { CalendarClock, Play, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { Restock } from "@/schemas";
import {
  addRestock,
  fetchRestocks,
  removeRestock,
  runRestockNow,
  updateRestock,
  type RestockRun,
} from "@/lib/api-client";
import { formatDaysAway, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextInput, Toggle } from "@/components/ui/form-fields";
import { OutcomeStamp } from "@/components/ui/stamp";
import { PageHeader } from "@/components/ui/page-header";

// The timeline uses Bryntum Scheduler, which needs the browser, so it's only loaded there.
const RestocksTimeline = dynamic(() => import("./restocks-timeline").then((file) => file.RestocksTimeline), {
  ssr: false,
  loading: () => <p className="px-5 py-6 text-sm text-stone-500">Loading the timeline…</p>,
});

/** What the colours on the timeline mean. */
const TIMELINE_KEY = [
  { label: "Next run (drag to move)", color: "bg-sky-500" },
  { label: "Due now", color: "bg-amber-500" },
  { label: "Runs after that", color: "bg-sky-300" },
  { label: "Last run", color: "bg-stone-400" },
];

export function RestockManager() {
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RestockRun | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => setRestocks(await fetchRestocks()), []);
  useEffect(() => {
    const firstLoad = setTimeout(() => reload().catch(() => setError("Couldn't load your restocks.")), 0);
    return () => clearTimeout(firstLoad);
  }, [reload]);

  async function attempt(work: () => Promise<unknown>) {
    setError(null);
    try {
      await work();
      await reload();
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  async function runNow(restock: Restock) {
    setRunningId(restock.id);
    setLastRun(null);
    await attempt(async () => setLastRun(await runRestockNow(restock.id)));
    setRunningId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Restocks"
        description="Things your assistant buys again on a schedule. A daily job runs the ones that are due. You aren't there to watch, so everything a restock buys waits for your OK."
      />
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}
      {lastRun && <RunResult run={lastRun} />}

      {restocks.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader
            title="Coming up"
            description="Each mark is a day a restock runs. Drag the next one to move it."
          />
          <RestocksTimeline
            restocks={restocks}
            onMoveNextRun={(id, nextRunAt) => attempt(() => updateRestock(id, { nextRunAt }))}
          />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 border-t border-stone-100 px-5 py-3 text-xs text-stone-500">
            {TIMELINE_KEY.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-sm ${item.color}`} />
                {item.label}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Your restocks" description={`${restocks.length} scheduled`} />
          {restocks.length === 0 && <p className="px-5 py-6 text-sm text-stone-500">Nothing scheduled yet.</p>}
          <ul className="divide-y divide-stone-100">
            {restocks.map((restock) => {
              const isDue = restock.active && new Date(restock.nextRunAt) <= new Date();
              return (
                <li key={restock.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-sky-700">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{restock.prompt}</div>
                    <div className="text-sm text-stone-500">
                      Every {restock.everyDays} {restock.everyDays === 1 ? "day" : "days"} ·{" "}
                      {!restock.active ? (
                        "paused"
                      ) : isDue ? (
                        <span className="font-medium text-amber-700">due now</span>
                      ) : (
                        `next ${formatDaysAway(restock.nextRunAt)}`
                      )}
                      {restock.lastRunAt && ` · last ran ${formatDaysAway(restock.lastRunAt)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    {restock.active ? "On" : "Paused"}
                    <Toggle
                      label={`Turn ${restock.prompt} on or off`}
                      checked={restock.active}
                      onChange={(active) => attempt(() => updateRestock(restock.id, { active }))}
                    />
                  </div>
                  <Button variant="secondary" size="sm" disabled={runningId !== null} onClick={() => runNow(restock)}>
                    <Play className="h-3.5 w-3.5" />
                    {runningId === restock.id ? "Running…" : "Run now"}
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`Remove ${restock.prompt}`}
                    onClick={() => attempt(() => removeRestock(restock.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>

        <AddRestockForm onAdd={(prompt, everyDays) => attempt(() => addRestock({ prompt, everyDays }))} />
      </div>
    </div>
  );
}

function RunResult({ run }: { run: RestockRun }) {
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-stone-900">Ran “{run.restock.prompt}”</div>
      <p className="mt-1 text-sm text-stone-600">{run.reply}</p>
      {run.decisions.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {run.decisions.map((decision) => (
            <li key={decision.id} className="flex flex-wrap items-center gap-3 text-sm">
              <OutcomeStamp outcome={decision.outcome} />
              <span className="min-w-0 flex-1">{decision.title}</span>
              <span className="tabular-nums">{formatMoney(decision.amount)}</span>
              {decision.outcome === "held" && (
                <Link href={`/approve/${decision.id}`} className="font-medium text-emerald-700 hover:underline">
                  Review
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function AddRestockForm({ onAdd }: { onAdd: (prompt: string, everyDays: number) => Promise<void> }) {
  const [prompt, setPrompt] = useState("");
  const [everyDays, setEveryDays] = useState("30");

  return (
    <Card>
      <CardHeader title="Add a restock" />
      <form
        className="flex flex-col gap-4 p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          await onAdd(prompt, Number(everyDays));
          setPrompt("");
        }}
      >
        <Field label="What to buy" hint="Write it like a request to the assistant.">
          <TextInput
            required
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Restock printer paper, under $20"
          />
        </Field>
        <Field label="Every how many days">
          <TextInput
            type="number"
            min={1}
            max={365}
            required
            value={everyDays}
            onChange={(e) => setEveryDays(e.target.value)}
          />
        </Field>
        <Button type="submit" disabled={prompt.trim().length < 3}>
          <Plus className="h-4 w-4" />
          Add restock
        </Button>
      </form>
    </Card>
  );
}
