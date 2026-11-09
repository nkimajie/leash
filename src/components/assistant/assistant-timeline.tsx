"use client";

// Renders the assistant's live steps: its thinking, the tools it uses, and what happened to the money.

import { AlertCircle, Brain, CheckCircle2, Loader2, Skull, Wrench } from "lucide-react";
import type { AssistantEvent, SearchResult } from "@/schemas";
import { classNames, formatMoney } from "@/lib/format";
import { TOOL_LABEL } from "@/lib/labels";
import { ProductThumbnail } from "@/components/ui/product-photo";
import { DecisionResultCard } from "./decision-result-card";

export function AssistantTimeline({ steps, isWorking }: { steps: AssistantEvent[]; isWorking: boolean }) {
  if (steps.length === 0 && !isWorking) return null;

  return (
    <ol className="relative flex flex-col gap-3 border-l border-stone-200 pl-6">
      {steps.filter(hasSomethingToShow).map((step, index) => (
        <li key={index} className="animate-step relative">
          <StepIcon step={step} />
          <StepBody step={step} />
        </li>
      ))}
      {isWorking && (
        <li className="relative flex items-center gap-2 text-sm text-stone-400">
          <span className="absolute -left-[31px] grid h-4 w-4 place-items-center rounded-full bg-white">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          </span>
          Working…
        </li>
      )}
    </ol>
  );
}

/** "finished", and the end of a payment tool (its decision card follows), add nothing to the timeline. */
function hasSomethingToShow(step: AssistantEvent): boolean {
  if (step.type === "finished") return false;
  return !(step.type === "tool_finished" && (step.tool === "buy_product" || step.tool === "pay_person"));
}

function StepIcon({ step }: { step: AssistantEvent }) {
  const icon = {
    thinking: <Brain className="h-3.5 w-3.5 text-violet-500" />,
    attack: <Skull className="h-3.5 w-3.5 text-rose-600" />,
    tool_started: <Wrench className="h-3.5 w-3.5 text-stone-400" />,
    reply: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />,
    error: <AlertCircle className="h-3.5 w-3.5 text-rose-600" />,
  }[step.type as string];
  const dot = <span className="h-2 w-2 rounded-full bg-stone-300" />;
  return (
    <span className="absolute -left-[31px] top-1 grid h-4 w-4 place-items-center rounded-full bg-stone-50">
      {icon ?? dot}
    </span>
  );
}

function StepBody({ step }: { step: AssistantEvent }) {
  switch (step.type) {
    case "request_started":
      return (
        <p className="text-xs text-stone-400">
          You asked: “{step.request.prompt}” · budget {formatMoney(step.request.budget)}
        </p>
      );
    case "thinking":
      return <p className="text-sm leading-relaxed text-stone-700">{step.text}</p>;
    case "attack":
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-rose-700">The scam</div>
          {step.text}
        </div>
      );
    case "tool_started":
      return <p className="text-xs font-medium text-stone-500">{TOOL_LABEL[step.tool] ?? step.tool}…</p>;
    case "tool_finished":
      if (step.products?.length) return <SearchResults products={step.products} />;
      return (
        <p className="whitespace-pre-line rounded-lg bg-stone-100/70 px-3 py-2 text-xs leading-relaxed text-stone-500">
          {step.summary}
        </p>
      );
    case "decision_made":
      return <DecisionResultCard decision={step.decision} />;
    case "reply":
      return <p className="rounded-xl bg-stone-900 px-4 py-3 text-sm text-white">{step.text}</p>;
    case "error":
      return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{step.message}</p>;
    case "finished":
      return null;
  }
}

/** What a product search found, with your digital twin's opinion of each result. */
function SearchResults({ products }: { products: SearchResult[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-stone-500">
        {products[0].source === "channel3" ? "Found with Channel3" : "From the sample catalog"}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {products.map((product) => (
          <li
            key={product.id}
            className={classNames(
              "flex items-center gap-2.5 rounded-xl border bg-white p-2",
              product.twinAvoids ? "border-rose-200 bg-rose-50/40" : "border-stone-200",
            )}
          >
            <ProductThumbnail imageUrl={product.imageUrl} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-stone-800">{product.title}</div>
              <div className="truncate text-xs tabular-nums text-stone-500">
                {formatMoney(product.price)} · {product.merchant}
              </div>
              {product.twinAvoids ? (
                <div className="truncate text-[11px] text-rose-700">Your twin avoids this</div>
              ) : product.twinLikes ? (
                <div className="truncate text-[11px] text-emerald-700">Your twin likes this</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
