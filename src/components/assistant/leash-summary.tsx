"use client";

// A short summary of your spending rules, with a link to change them.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SpendingRules } from "@/schemas";
import { fetchSpendingRules } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import { Card, CardHeader } from "@/components/ui/card";

export function LeashSummary() {
  const [rules, setRules] = useState<SpendingRules | null>(null);

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
