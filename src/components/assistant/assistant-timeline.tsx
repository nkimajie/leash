"use client";

// Renders the assistant's live steps: its thinking, the tools it uses, and what happened to the money.

import { AlertCircle, Brain, CheckCircle2, Loader2, Skull, Wrench } from "lucide-react";
import type { AssistantEvent } from "@/schemas";
import { formatMoney } from "@/lib/format";
import { TOOL_LABEL } from "@/lib/labels";
import { DecisionResultCard } from "./decision-result-card";

export function AssistantTimeline({ steps, isWorking }: { steps: AssistantEvent[]; isWorking: boolean }) {
  if (steps.length === 0 && !isWorking) return null;

  return (
    <ol className="relative flex flex-col gap-3 border-l border-stone-200 pl-6">
      {steps.map((step, index) => (
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
      return <p className="text-xs text-stone-400">Started · budget {formatMoney(step.request.budget)}</p>;
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
      return step.tool === "buy_product" || step.tool === "pay_person" ? null : (
        <pre className="whitespace-pre-wrap rounded-lg bg-stone-100/70 px-3 py-2 font-mono text-[11px] leading-relaxed text-stone-500">
          {step.summary}
        </pre>
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
