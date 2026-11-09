"use client";

// A short summary of your spending rules, how much of today's and this week's caps is used,
// and a link to change the rules.

import Link from "next/link";
import { useEffect, useState } from "react";
import { COMMITTED_OUTCOMES, type Decision, type SpendingRules } from "@/schemas";
import { fetchSpendingRules } from "@/lib/api-client";
import { classNames, formatMoney } from "@/lib/format";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { Card, CardHeader } from "@/components/ui/card";

export function LeashSummary() {
  const [rules, setRules] = useState<SpendingRules | null>(null);
  const { decisions } = useLiveDecisions();

  useEffect(() => {
    fetchSpendingRules()
      .then(setRules)
      .catch(() => {});
  }, []);

  return (
    <Card>
      <CardHeader
        title="Your leash"
        action={
          <Link href="/rules" className="text-xs font-medium text-stone-500 hover:text-stone-900">
            Edit
          </Link>
        }
      />
      {rules && (
        <div className="flex flex-col gap-3 border-b border-stone-100 px-5 py-4">
          <CapUsed label="Today" spent={spentSince(decisions, startOfToday())} cap={rules.dailyCap} />
          <CapUsed label="This week" spent={spentSince(decisions, daysAgo(7))} cap={rules.weeklyCap} />
        </div>
      )}
      {!rules ? (
        <p className="px-5 py-4 text-sm text-stone-400">Loading…</p>
      ) : (
        <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-2 px-5 py-4 text-sm">
          <dt className="text-stone-500">Pays without asking up to</dt>
          <dd className="text-right font-semibold tabular-nums">{formatMoney(rules.autoApproveLimit)}</dd>
          <dt className="text-stone-500">Most for one item</dt>
          <dd className="text-right tabular-nums">{formatMoney(rules.maxItemPrice)}</dd>
          <dt className="text-stone-500">Most to one person</dt>
          <dd className="text-right tabular-nums">{formatMoney(rules.maxPaymentPerPerson)}</dd>
          <dt className="text-stone-500">Daily / weekly cap</dt>
          <dd className="text-right tabular-nums">
            {formatMoney(rules.dailyCap)} / {formatMoney(rules.weeklyCap)}
          </dd>
          <dt className="text-stone-500">New people</dt>
          <dd className="text-right">{rules.newPeopleNeedApproval ? "Always ask" : "Allowed"}</dd>
          <dt className="col-span-2 text-stone-500">Never buys</dt>
          <dd className="col-span-2 flex flex-wrap gap-1">
            {rules.blockedCategories.map((category) => (
              <span key={category} className="rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                {category}
              </span>
            ))}
          </dd>
        </dl>
      )}
    </Card>
  );
}

/** "Today: $48 of $250", with a bar that turns amber, then red, as the cap fills up. */
function CapUsed({ label, spent, cap }: { label: string; spent: number; cap: number }) {
  const share = Math.min(spent / cap, 1);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-stone-500">{label}</span>
        <span className="tabular-nums">
          <span className="font-semibold">{formatMoney(spent)}</span>
          <span className="text-stone-400"> of {formatMoney(cap)}</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-stone-100">
        <div
          className={classNames(
            "h-full rounded-full transition-all",
            share >= 1 ? "bg-rose-500" : share >= 0.8 ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${share * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Money paid or reserved since a moment: the same sums the rules check against the caps. */
function spentSince(decisions: Decision[], since: Date): number {
  return decisions
    .filter((d) => COMMITTED_OUTCOMES.includes(d.outcome) && new Date(d.createdAt) >= since)
    .reduce((sum, d) => sum + d.amount, 0);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
