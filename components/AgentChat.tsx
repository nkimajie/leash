"use client";

// The main screen: give the agent a goal and watch it search, check your rules and pay.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/agent-events";
import type { Rules } from "@/lib/types";
import { RULE_LABEL, usd } from "@/lib/ui";
import { VerdictChip } from "./VerdictChip";

const EXAMPLES = [
  "Restock my coffee setup, under $60, fair-trade beans only",
  "My dog needs food and a comfier bed, under $120",
  "Restock the office: printer paper and pens, under $30",
];

export function AgentChat() {
  const [prompt, setPrompt] = useState("");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [rules, setRules] = useState<Rules | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setRules(s.rules))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [events]);

  async function run(text: string) {
    if (!text.trim() || running) return;
    setRunning(true);
    setEvents([]);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setEvents([{ type: "error", text: err.error ?? "Could not start the agent." }]);
        return;
      }
      // Read the NDJSON stream line by line as the agent works.
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        const parsed = lines.filter(Boolean).map((l) => JSON.parse(l) as AgentEvent);
        setEvents((prev) => [...prev, ...parsed]);
      }
    } catch {
      setEvents((prev) => [...prev, { type: "error", text: "Connection lost while the agent was working." }]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">What should the agent buy?</h1>
          <p className="text-sm text-stone-500">
            It can pay with your PayPal, but only inside your rules. Anything over the limit waits for you.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(prompt);
          }}
          className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-3 shadow-sm"
        >
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run(prompt);
              }
            }}
            rows={2}
            placeholder="e.g. Restock my coffee setup, under $60, fair-trade beans only"
            className="w-full resize-none bg-transparent text-base outline-none placeholder:text-stone-400"
          />
          <div className="flex flex-wrap items-center gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                disabled={running}
                onClick={() => {
                  setPrompt(ex);
                  run(ex);
                }}
                className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-600 hover:bg-stone-50 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
            <button
              type="submit"
              disabled={running || !prompt.trim()}
              className="ml-auto rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40"
            >
              {running ? "Working…" : "Send to agent"}
            </button>
          </div>
        </form>

        <ol className="flex flex-col gap-2">
          {events.map((e, i) => (
            <EventRow key={i} event={e} />
          ))}
          {running && <li className="animate-pulse text-sm text-stone-400">Agent is working…</li>}
        </ol>
        <div ref={bottom} />
      </section>

      <aside className="flex flex-col gap-3">
        <RulesCard rules={rules} />
        <Link
          href="/control-room"
          className="rounded-xl border border-stone-200 bg-white p-4 text-sm hover:bg-stone-50"
        >
          <div className="font-medium">Open the control room →</div>
          <div className="text-stone-500">Every decision, the rule that applied, and PayPal status.</div>
        </Link>
      </aside>
    </div>
  );
}

function EventRow({ event: e }: { event: AgentEvent }) {
  switch (e.type) {
    case "goal":
      return (
        <li className="text-xs text-stone-400">
          Goal started · budget {usd(e.goal.budget)}
        </li>
      );
    case "thought":
      return <li className="rounded-lg bg-white px-3 py-2 text-sm text-stone-700 ring-1 ring-stone-200">{e.text}</li>;
    case "tool_call":
      return (
        <li className="font-mono text-xs text-stone-500">
          → {e.tool}({Object.values(e.input).map((v) => JSON.stringify(v)).join(", ")})
        </li>
      );
    case "tool_result":
      return (
        <li className="whitespace-pre-line border-l-2 border-stone-200 pl-3 font-mono text-xs text-stone-500">
          {e.summary}
        </li>
      );
    case "decision":
      return <DecisionCard event={e} />;
    case "message":
      return <li className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white">{e.text}</li>;
    case "error":
      return <li className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{e.text}</li>;
    case "done":
      return null;
  }
}

function DecisionCard({ event }: { event: Extract<AgentEvent, { type: "decision" }> }) {
  const { decision: d, policy } = event;
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-medium">{d.product.title}</div>
          <div className="text-sm text-stone-500">
            {d.merchant} · <span className="tabular-nums">{usd(d.price)}</span>
          </div>
        </div>
        <VerdictChip verdict={d.verdict} />
      </div>
      <p className="text-sm text-stone-600">
        <span className="font-medium text-stone-800">{RULE_LABEL[d.rule_hit] ?? d.rule_hit}.</span>{" "}
        {d.verdict === "failed"
          ? `PayPal returned ${d.paypal_status} (debug_id ${d.paypal_debug_id}). Nothing was charged.`
          : policy.explanation}
      </p>
      {d.verdict === "held" && (
        <Link
          href={`/approve/${d.id}`}
          target="_blank"
          className="self-start rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
        >
          Review on phone →
        </Link>
      )}
      {d.paypal_order_id && (
        <div className="font-mono text-[11px] text-stone-400">
          PayPal order {d.paypal_order_id} · {d.paypal_status}
        </div>
      )}
    </li>
  );
}

function RulesCard({ rules }: { rules: Rules | null }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
      <div className="mb-2 font-medium">Your leash</div>
      {!rules ? (
        <div className="text-stone-400">Loading rules…</div>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-stone-600">
          <dt>Auto-approve up to</dt>
          <dd className="text-right font-medium tabular-nums text-stone-900">{usd(rules.autoApproveLimit)}</dd>
          <dt>Max per item</dt>
          <dd className="text-right tabular-nums">{usd(rules.maxItemPrice)}</dd>
          <dt>Default goal budget</dt>
          <dd className="text-right tabular-nums">{usd(rules.goalBudget)}</dd>
          <dt>Daily / weekly cap</dt>
          <dd className="text-right tabular-nums">
            {usd(rules.dailyCap)} / {usd(rules.weeklyCap)}
          </dd>
          <dt className="col-span-2 mt-1">Blocked categories</dt>
          <dd className="col-span-2 text-stone-900">{rules.blockedCategories.join(", ") || "none"}</dd>
        </dl>
      )}
    </div>
  );
}
