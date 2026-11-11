"use client";

// The assistant's live steps: what it's thinking, the tools it uses, and a receipt for every
// purchase or payment, stamped with what happened to the money.

import { ArrowRight, Loader2, Smartphone } from "lucide-react";
import Link from "next/link";
import type { AssistantEvent, Decision, SearchResult } from "@/schemas";
import { LeashMark } from "@/components/layout/leash-logo";
import { Button } from "@/components/ui/button";
import { ProductThumbnail } from "@/components/ui/product-photo";
import { ReceiptCard } from "@/components/ui/receipt-card";
import { formatMoney } from "@/lib/format";
import { TOOL_LABEL } from "@/lib/labels";

/** Tools that spend from the request's budget. Questions and commands have no use for one. */
const MONEY_TOOLS = ["search_products", "buy_product", "pay_person"];

export function AssistantTimeline(props: {
  steps: AssistantEvent[];
  isWorking: boolean;
  wasSpoken: boolean;
  onReviewOnPhone: (decision: Decision) => void;
}) {
  const { steps, isWorking } = props;
  if (steps.length === 0 && !isWorking) return null;
  const usedTool = (tools: string[]) => steps.some((step) => step.type === "tool_started" && tools.includes(step.tool));
  const request = steps.find((step) => step.type === "request_started")?.request;
  const context: StepContext = {
    youSaid: props.wasSpoken ? "You said" : "You asked",
    showBudget: usedTool(MONEY_TOOLS),
    // A spending answer links to Money, where AG Grid shows the same question as a table.
    moneyLink: request && usedTool(["look_up_spending"]) ? `/money?ask=${encodeURIComponent(request.prompt)}` : null,
    onReviewOnPhone: props.onReviewOnPhone,
  };

  return (
    <ol className="flex flex-col gap-4" aria-live="polite">
      {steps.filter(hasSomethingToShow).map((step, index) => (
        <li key={index} className="animate-step">
          <StepBody step={step} context={context} />
        </li>
      ))}
      {isWorking && (
        <li className="flex items-center gap-2 font-mono text-xs text-ink-soft">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Working…
        </li>
      )}
    </ol>
  );
}

/** Steps the timeline skips because something else already shows them. */
const SHOWN_ELSEWHERE = [
  "buy_product", // its receipt follows
  "pay_person",
  "deny_held_item",
  "look_up_spending", // the reply gives the answer
  "open_page",
];

function hasSomethingToShow(step: AssistantEvent): boolean {
  if (step.type === "finished" || step.type === "open_page") return false;
  return !(step.type === "tool_finished" && SHOWN_ELSEWHERE.includes(step.tool));
}

type StepContext = {
  youSaid: string;
  showBudget: boolean;
  moneyLink: string | null;
  onReviewOnPhone: (decision: Decision) => void;
};

function StepBody({ step, context }: { step: AssistantEvent; context: StepContext }) {
  switch (step.type) {
    case "request_started":
      return (
        <p className="font-mono text-xs text-ink-soft">
          {context.youSaid} · “{step.request.prompt}”
          {context.showBudget && ` · budget ${formatMoney(step.request.budget)}`}
        </p>
      );
    case "thinking":
      return <p className="text-base leading-relaxed text-ink-soft">{step.text}</p>;
    case "attack":
      return (
        <div className="rounded-[20px] border border-dashed border-ink-soft bg-white px-5 py-4">
          <div className="mb-1.5 font-mono text-xs text-ink-soft">The scam</div>
          <p className="text-sm">{step.text}</p>
        </div>
      );
    case "tool_started":
      return (
        <p className="flex items-center gap-2 font-mono text-xs text-ink-soft">
          <span className="h-1.5 w-1.5 rounded-full bg-leash" aria-hidden />
          {TOOL_LABEL[step.tool] ?? step.tool}…
        </p>
      );
    case "tool_finished":
      if (step.products?.length) return <SearchResults products={step.products} />;
      return <p className="rounded-xl bg-white/60 px-4 py-3 text-sm whitespace-pre-line text-ink-soft">{step.summary}</p>;
    case "decision_made":
      return (
        <ReceiptCard decision={step.decision}>
          {step.decision.outcome === "held" && (
            <Button variant="secondary" size="sm" onClick={() => context.onReviewOnPhone(step.decision)}>
              <Smartphone className="h-4 w-4" strokeWidth={1.5} />
              Review on your phone
            </Button>
          )}
        </ReceiptCard>
      );
    case "reply":
      return (
        <div className="rounded-[20px] border border-leash-rim bg-leash-wash px-5 py-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium">
            <LeashMark className="h-5 w-5" />
            Leash
          </div>
          <p className="text-base leading-relaxed whitespace-pre-line">{step.text}</p>
          {context.moneyLink && (
            <Link href={context.moneyLink} className="mt-3 inline-flex items-center gap-1 text-sm text-leash">
              See it in Money <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          )}
        </div>
      );
    case "error":
      return <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">{step.message}</p>;
    case "open_page":
    case "finished":
      return null;
  }
}

/** What a product search found, with your digital twin's opinion of each result. */
function SearchResults({ products }: { products: SearchResult[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-xs text-ink-soft">
        {products[0].source === "channel3" ? "Found with Channel3" : "From the sample catalog"}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {products.map((product) => (
          <li key={product.id} className="flex items-center gap-3 rounded-2xl border border-hairline bg-white p-3">
            <ProductThumbnail imageUrl={product.imageUrl} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{product.title}</div>
              <div className="truncate font-mono text-xs text-ink-soft">
                {formatMoney(product.price)} · {product.merchant}
              </div>
              {product.twinAvoids ? (
                <div className="truncate text-xs text-ink-soft">Your twin avoids this</div>
              ) : product.twinLikes ? (
                <div className="truncate text-xs text-leash">Your twin likes this</div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
