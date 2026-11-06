import { ShoppingBag, Smartphone, UserRound } from "lucide-react";
import Link from "next/link";
import type { Decision } from "@/schemas";
import { formatMoney } from "@/lib/format";
import { RULE_LABEL } from "@/lib/labels";
import { OutcomeBadge } from "@/components/ui/outcome-badge";

/** What happened to one purchase or payment, shown inside the assistant timeline. */
export function DecisionResultCard({ decision }: { decision: Decision }) {
  const Icon = decision.kind === "payment" ? UserRound : ShoppingBag;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium leading-snug text-stone-900">{decision.title}</div>
              <div className="text-sm text-stone-500">{decision.counterparty}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold tabular-nums">{formatMoney(decision.amount)}</div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <OutcomeBadge outcome={decision.outcome} />
            <span className="text-xs text-stone-500">{RULE_LABEL[decision.ruleHit]}</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">{decision.ruleExplanation}</p>

          {decision.outcome === "held" && (
            <Link
              href={`/approve/${decision.id}`}
              target="_blank"
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600"
            >
              <Smartphone className="h-4 w-4" />
              Review on your phone
            </Link>
          )}

          {decision.paypal.orderId && (
            <div className="mt-3 font-mono text-[11px] text-stone-400">
              PayPal order {decision.paypal.orderId} · {decision.paypal.status}
              {decision.paypal.debugId && ` · debug_id ${decision.paypal.debugId}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
