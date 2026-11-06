"use client";

// Phone-sized approve / deny screen for a purchase the leash held.
// Approve = PayPal captures the authorization. Deny = PayPal voids it; no money is taken.

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Decision } from "@/lib/types";
import { RULE_LABEL, usd } from "@/lib/ui";
import { VerdictChip } from "./VerdictChip";

export function ApproveCard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/decisions/${id}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setDecision)
      .catch(() => setMissing(true));
  }, [id]);

  async function decide(action: "approve" | "deny") {
    setBusy(action);
    setError(null);
    const res = await fetch("/api/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setDecision(body);
    else setError(body.error ?? "Something went wrong.");
    setBusy(null);
  }

  if (missing) return <Shell><p className="text-center text-stone-500">This approval request doesn&apos;t exist.</p></Shell>;
  if (!decision) return <Shell><p className="animate-pulse text-center text-stone-400">Loading…</p></Shell>;

  const d = decision;
  return (
    <Shell>
      <div className="text-center text-xs font-medium uppercase tracking-wide text-stone-500">
        Your agent wants to buy
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="text-lg font-semibold leading-snug">{d.product.title}</div>
        <div className="mt-1 text-sm text-stone-500">{d.merchant}</div>
        <div className="mt-4 text-4xl font-semibold tabular-nums tracking-tight">{usd(d.price)}</div>
        <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Held: {RULE_LABEL[d.rule_hit]?.toLowerCase() ?? d.rule_hit}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-stone-600">
          <span className="font-medium text-stone-800">Why the agent picked it: </span>
          {d.ai_reasoning}
        </p>
      </div>

      {d.verdict === "held" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => decide("deny")}
              disabled={busy !== null}
              className="rounded-2xl bg-stone-200 py-4 text-lg font-semibold text-stone-800 active:scale-[0.98] disabled:opacity-50"
            >
              {busy === "deny" ? "Voiding…" : "Deny"}
            </button>
            <button
              onClick={() => decide("approve")}
              disabled={busy !== null}
              className="rounded-2xl bg-emerald-600 py-4 text-lg font-semibold text-white active:scale-[0.98] disabled:opacity-50"
            >
              {busy === "approve" ? "Paying…" : "Approve"}
            </button>
          </div>
          <p className="text-center text-xs text-stone-500">
            PayPal has reserved {usd(d.price)} but not taken it. Deny and the hold is released.
          </p>
        </>
      ) : (
        <Outcome decision={d} />
      )}

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-center text-sm text-rose-700">{error}</p>}

      <Link href="/control-room" className="text-center text-sm text-stone-500 underline">
        Open control room
      </Link>
    </Shell>
  );
}

function Outcome({ decision: d }: { decision: Decision }) {
  const text: Partial<Record<Decision["verdict"], string>> = {
    approved: `Approved. PayPal captured ${usd(d.price)}.`,
    voided: "Denied. The PayPal authorization was voided, so no money was taken.",
    failed: `PayPal declined the payment (${d.paypal_status}). Nothing was charged.`,
    refunded: "This purchase was refunded.",
  };
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-5 text-center ring-1 ring-stone-200">
      <VerdictChip verdict={d.verdict} />
      <p className="text-sm text-stone-700">{text[d.verdict] ?? "This purchase was already decided."}</p>
      {d.paypal_debug_id && <p className="font-mono text-xs text-stone-400">debug_id {d.paypal_debug_id}</p>}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-4 px-4 py-8">
      <div className="text-center text-sm font-semibold tracking-tight">Leash</div>
      {children}
    </main>
  );
}
