"use client";

// Your leash, Restocks: things Leash buys again on a schedule. A daily job runs the ones that
// are due. Because you aren't there to watch, everything they buy waits for your okay.

import { Play, Plus, Trash2 } from "lucide-react";
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
import { formatDaysAway } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextInput, Toggle } from "@/components/ui/form-fields";
import { ReceiptRow } from "@/components/ui/receipt-row";

// The timeline uses Bryntum Scheduler, which needs the browser, so it's only loaded there.
const RestocksTimeline = dynamic(() => import("./restocks-timeline").then((file) => file.RestocksTimeline), {
  ssr: false,
  loading: () => <p className="px-4 py-6 text-sm text-ink-soft sm:px-6">Loading the timeline…</p>,
});

/** What the colours on the timeline mean. */
const TIMELINE_KEY = [
  { label: "Next run (drag to move)", color: "#1552f0" },
  { label: "Due now", color: "#b7791f" },
  { label: "Runs after that", color: "#afc8ff" },
  { label: "Last run", color: "#7a776f" },
];

export function RestockManager() {
  const [restocks, setRestocks] = useState<Restock[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [lastRun, setLastRun] = useState<RestockRun | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(async () => setRestocks(await fetchRestocks()), []);
  useEffect(() => {
    const firstLoad = setTimeout(() => reload().catch(() => setProblem("Couldn't load your restocks.")), 0);
    return () => clearTimeout(firstLoad);
  }, [reload]);

  async function attempt(work: () => Promise<unknown>) {
    setProblem(null);
    try {
      await work();
      await reload();
    } catch (error) {
      setProblem((error as Error).message);
    }
  }

  async function runNow(restock: Restock) {
    setRunningId(restock.id);
    setLastRun(null);
    await attempt(async () => setLastRun(await runRestockNow(restock.id)));
    setRunningId(null);
  }

  return (
    <>
      <p className="-mt-2 max-w-2xl text-base text-ink-soft">
        Things Leash buys again on a schedule. You aren&apos;t there to watch, so everything a restock buys waits for
        your okay. Say &ldquo;restock dog food every 30 days&rdquo; on Ask, or add one here.
      </p>
      {problem && <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">{problem}</p>}
      {lastRun && <RunResult run={lastRun} />}

      {restocks.length > 0 && (
        <Card>
          <CardHeader
            title="Coming up"
            description="Each mark is a day a restock runs. Drag the next one to move it."
          />
          <div className="-mx-4 sm:-mx-6">
            <RestocksTimeline
              restocks={restocks}
              onMoveNextRun={(id, nextRunAt) => attempt(() => updateRestock(id, { nextRunAt }))}
            />
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-soft">
            {TIMELINE_KEY.map((item) => (
              <li key={item.label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
                {item.label}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8">
        <Card>
          <CardHeader title="Your restocks" description={`${restocks.length} scheduled`} />
          {restocks.length === 0 && <p className="text-sm text-ink-soft">Nothing scheduled yet.</p>}
          <ul className="flex flex-col divide-y divide-hairline">
            {restocks.map((restock) => {
              const isDue = restock.active && new Date(restock.nextRunAt) <= new Date();
              return (
                <li key={restock.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="text-base">{restock.prompt}</div>
                    <div className="mt-1 font-mono text-xs text-ink-soft">
                      every {restock.everyDays} {restock.everyDays === 1 ? "day" : "days"} ·{" "}
                      {!restock.active ? (
                        "paused"
                      ) : isDue ? (
                        <span className="text-reserved">due now</span>
                      ) : (
                        `next ${formatDaysAway(restock.nextRunAt)}`
                      )}
                      {restock.lastRunAt && ` · last ran ${formatDaysAway(restock.lastRunAt)}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle
                      label={`Turn ${restock.prompt} on or off`}
                      checked={restock.active}
                      onChange={(active) => attempt(() => updateRestock(restock.id, { active }))}
                    />
                    <Button variant="secondary" size="sm" disabled={runningId !== null} onClick={() => runNow(restock)}>
                      <Play className="h-3.5 w-3.5" strokeWidth={1.75} />
                      {runningId === restock.id ? "Running…" : "Run now"}
                    </Button>
                    <button
                      aria-label={`Remove ${restock.prompt}`}
                      onClick={() =>
                        window.confirm(`Remove "${restock.prompt}"?`) && attempt(() => removeRestock(restock.id))
                      }
                      className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-paper hover:text-ink"
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>

        <AddRestockForm onAdd={(prompt, everyDays) => attempt(() => addRestock({ prompt, everyDays }))} />
      </div>
    </>
  );
}

function RunResult({ run }: { run: RestockRun }) {
  return (
    <Card>
      <CardHeader title={`Ran “${run.restock.prompt}”`} description={run.reply} />
      <div className="flex flex-col divide-y divide-hairline">
        {run.decisions.map((decision) => (
          <Link key={decision.id} href={`/approve/${decision.id}`} className="block">
            <ReceiptRow decision={decision} />
          </Link>
        ))}
      </div>
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
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await onAdd(prompt, Number(everyDays));
          setPrompt("");
        }}
      >
        <Field label="What to buy" hint="Write it like a request to Leash.">
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
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Add restock
        </Button>
      </form>
    </Card>
  );
}
