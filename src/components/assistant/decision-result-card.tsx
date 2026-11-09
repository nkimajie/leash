"use client";

import { Smartphone } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { Decision } from "@/schemas";
import { formatMoney } from "@/lib/format";
import { RULE_LABEL } from "@/lib/labels";
import { OutcomeBadge } from "@/components/ui/outcome-badge";
import { FoundWith, ProductPhoto, StoreLink } from "@/components/ui/product-photo";

/** What happened to one purchase or payment, shown inside the assistant timeline. */
export function DecisionResultCard({ decision }: { decision: Decision }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <ProductPhoto decision={decision} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-medium leading-snug text-stone-900">{decision.title}</div>
              <div className="flex flex-wrap items-center gap-x-2 text-sm text-stone-500">
                {decision.counterparty}
                <StoreLink decision={decision} />
                <FoundWith product={decision.product} />
              </div>
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

          {decision.outcome === "held" && <ApproveOnYourPhone decisionId={decision.id} />}

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

/** A QR code that opens the approval screen on your phone, plus a link for this screen. */
function ApproveOnYourPhone({ decisionId }: { decisionId: string }) {
  const path = `/approve/${decisionId}`;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

  return (
    <div className="mt-3 flex items-center gap-4 rounded-xl bg-amber-50 p-3">
      <QRCodeSVG value={origin + path} size={84} marginSize={1} className="shrink-0 rounded-md bg-white" />
      <div className="flex flex-col items-start gap-2 text-sm text-amber-900">
        <span>
          <span className="font-medium">Scan to decide on your phone.</span> The money stays reserved until you do.
          {isLocal && <span className="block text-xs text-amber-700">(Works once the app is online.)</span>}
        </span>
        <Link
          href={path}
          target="_blank"
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-medium text-white transition hover:bg-amber-600"
        >
          <Smartphone className="h-4 w-4" />
          Open approval screen
        </Link>
      </div>
    </div>
  );
}
