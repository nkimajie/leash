"use client";

// Renders the assistant's live steps: its thinking, the tools it uses, and what happened to the money.

import { AlertCircle, ArrowRight, Brain, CheckCircle2, Loader2, Skull, Wrench } from "lucide-react";
import Link from "next/link";
import type { AssistantEvent, SearchResult } from "@/schemas";
import { classNames, formatMoney } from "@/lib/format";
import { TOOL_LABEL } from "@/lib/labels";
import { ProductThumbnail } from "@/components/ui/product-photo";
import { DecisionResultCard } from "./decision-result-card";

/** Tools that spend from the request's budget. Questions and commands have no use for one. */
const MONEY_TOOLS = ["search_products", "buy_product", "pay_person"];

export function AssistantTimeline(props: { steps: AssistantEvent[]; isWorking: boolean; wasSpoken: boolean }) {
  const { steps, isWorking } = props;
  if (steps.length === 0 && !isWorking) return null;
  const firstHeld = steps.find((step) => step.type === "decision_made" && step.decision.outcome === "held");
  const usedTool = (tools: string[]) => steps.some((step) => step.type === "tool_started" && tools.includes(step.tool));
  const request = steps.find((step) => step.type === "request_started")?.request;
  const context: StepContext = {
    youSaid: props.wasSpoken ? "You said" : "You asked",
    showBudget: usedTool(MONEY_TOOLS),
    // A spending answer links to the control room, where AG Grid shows the same question as a table.
    controlRoomLink:
      request && usedTool(["look_up_spending"]) ? `/control-room?ask=${encodeURIComponent(request.prompt)}` : null,
  };

  return (
    <ol className="relative flex flex-col gap-3 border-l border-stone-200 pl-6">
      {steps.filter(hasSomethingToShow).map((step, index) => (
        <li key={index} className="animate-step relative">
          <StepIcon step={step} />
          <StepBody step={step} showQrCode={step === firstHeld} context={context} />
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

/** Steps the timeline skips because something else already shows them. */
const SHOWN_ELSEWHERE = [
  "buy_product", // its decision card follows
  "pay_person",
  "deny_held_item",
  "look_up_spending", // the reply gives the answer
  "open_page",
];

function hasSomethingToShow(step: AssistantEvent): boolean {
  if (step.type === "finished" || step.type === "open_page") return false;
  return !(step.type === "tool_finished" && SHOWN_ELSEWHERE.includes(step.tool));
}

type StepContext = { youSaid: string; showBudget: boolean; controlRoomLink: string | null };

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

function StepBody({ step, showQrCode, context }: { step: AssistantEvent; showQrCode: boolean; context: StepContext }) {
  switch (step.type) {
    case "request_started":
      return (
        <p className="text-xs text-stone-400">
          {context.youSaid}: “{step.request.prompt}”
          {context.showBudget && ` · budget ${formatMoney(step.request.budget)}`}
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
      return <DecisionResultCard decision={step.decision} showQrCode={showQrCode} />;
    case "reply":
      return (
        <div className="flex flex-col gap-2 rounded-xl bg-stone-900 px-4 py-3 text-sm text-white">
          <p className="whitespace-pre-line leading-relaxed">{step.text}</p>
          {context.controlRoomLink && (
            <Link
              href={context.controlRoomLink}
              className="inline-flex items-center gap-1 self-start text-xs font-medium text-violet-200 hover:text-white"
            >
              See it in the control room <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      );
    case "error":
      return <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{step.message}</p>;
    case "open_page":
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
