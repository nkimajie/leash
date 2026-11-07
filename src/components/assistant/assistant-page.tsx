"use client";

// The home screen: ask the assistant for something and watch it work, step by step.

import { ArrowUp, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AssistantEvent } from "@/schemas";
import { askAssistant, runAttack } from "@/lib/api-client";
import { ATTACKS } from "@/lib/attacks";
import { ConnectReminder } from "@/components/connect/connect-reminder";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AssistantTimeline } from "./assistant-timeline";
import { LeashSummary } from "./leash-summary";
import { WaitingForYou } from "./waiting-for-you";

const EXAMPLE_REQUESTS = [
  "Restock my coffee setup, under $60, fair-trade beans only",
  "Pay Sam $25 for dinner",
  "Send $30 to Jordan for concert tickets",
  "My dog needs food and a comfier bed, under $120",
];

export function AssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<AssistantEvent[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const endOfTimeline = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfTimeline.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [steps]);

  /** Runs the assistant (or an attack) and shows each step as it arrives. */
  async function show(work: (onStep: (step: AssistantEvent) => void) => Promise<void>) {
    if (isWorking) return;
    setIsWorking(true);
    setSteps([]);
    try {
      await work((step) => setSteps((previous) => [...previous, step]));
    } catch (error) {
      setSteps((previous) => [...previous, { type: "error", message: (error as Error).message }]);
    } finally {
      setIsWorking(false);
    }
  }

  const send = (text: string) => text.trim() && show((onStep) => askAssistant(text, onStep));

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-w-0 flex-col gap-6">
        <PageHeader
          title="What can I take care of?"
          description="I can buy things and pay people with your PayPal, the way you would. Anything outside your rules waits for your OK."
        />
        <ConnectReminder />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(prompt);
          }}
          className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition focus-within:border-stone-400"
        >
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(prompt);
              }
            }}
            rows={2}
            placeholder="e.g. Restock my coffee setup, under $60"
            className="w-full resize-none bg-transparent px-1 text-base outline-none placeholder:text-stone-400"
          />
          <div className="flex items-center justify-end">
            <Button type="submit" size="sm" disabled={isWorking || !prompt.trim()} aria-label="Send">
              {isWorking ? "Working…" : "Send"}
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2">
          {EXAMPLE_REQUESTS.map((example) => (
            <button
              key={example}
              type="button"
              disabled={isWorking}
              onClick={() => {
                setPrompt(example);
                send(example);
              }}
              className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600 transition hover:border-stone-300 hover:text-stone-900 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>

        <TryToBreakTheLeash disabled={isWorking} onAttack={(id) => show((onStep) => runAttack(id, onStep))} />

        <AssistantTimeline steps={steps} isWorking={isWorking} />
        <div ref={endOfTimeline} />
      </section>

      <aside className="flex flex-col gap-4">
        <WaitingForYou />
        <LeashSummary />
      </aside>
    </div>
  );
}

/** One-click attacks: a scam takes over the assistant, and the rules still decide what money moves. */
function TryToBreakTheLeash({ disabled, onAttack }: { disabled: boolean; onAttack: (attackId: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
        <ShieldAlert className="h-3.5 w-3.5" />
        Try to break the leash:
      </span>
      {ATTACKS.map((attack) => (
        <button
          key={attack.id}
          type="button"
          disabled={disabled}
          onClick={() => onAttack(attack.id)}
          className="rounded-full bg-white px-3 py-1 text-xs text-rose-700 ring-1 ring-rose-200 transition hover:ring-rose-400 disabled:opacity-50"
        >
          {attack.title}
        </button>
      ))}
    </div>
  );
}
