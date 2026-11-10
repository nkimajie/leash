"use client";

// The home screen: ask the assistant for something, by typing or out loud, and watch it work
// step by step. When you speak, Leash talks back: a running commentary, then its reply.

import { ArrowUp, ChevronRight, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AssistantEvent } from "@/schemas";
import { askAssistant, runAttack } from "@/lib/api-client";
import { ATTACKS } from "@/lib/attacks";
import { TOOL_LABEL } from "@/lib/labels";
import { speak, stopSpeaking } from "@/lib/speak";
import { useVoiceInput } from "@/lib/use-voice-input";
import { ConnectReminder } from "@/components/connect/connect-reminder";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { AssistantTimeline } from "./assistant-timeline";
import { LeashSummary } from "./leash-summary";
import { ReadAloudToggle, TalkButton } from "./voice-controls";
import { WaitingForYou } from "./waiting-for-you";

const EXAMPLE_REQUESTS = [
  "What can you do for me?",
  "Restock my coffee setup, under $60, fair-trade beans only",
  "Pay Sam $25 for dinner",
  "Send $30 to Jordan for concert tickets",
  "My dog needs food and a comfier bed, under $120",
];

export function AssistantPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<AssistantEvent[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [wasSpoken, setWasSpoken] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const endOfTimeline = useRef<HTMLDivElement>(null);
  const voice = useVoiceInput((heard) => {
    setPrompt(heard);
    send(heard, true);
  }, !isWorking);

  useEffect(() => {
    endOfTimeline.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [steps]);

  /** Runs the assistant (or an attack) and shows each step as it arrives, saying it aloud if asked. */
  async function show(work: (onStep: (step: AssistantEvent) => void) => Promise<void>, aloud: boolean) {
    if (isWorking) return;
    stopSpeaking();
    setIsWorking(true);
    setSteps([]);
    const pagesToOpen: string[] = [];
    try {
      await work((step) => {
        setSteps((previous) => [...previous, step]);
        if (aloud) sayAloud(step);
        if (step.type === "open_page") pagesToOpen.push(step.path);
      });
    } catch (error) {
      setSteps((previous) => [...previous, { type: "error", message: (error as Error).message }]);
    } finally {
      setIsWorking(false);
    }
    if (pagesToOpen[0]) router.push(pagesToOpen[0]);
  }

  function send(text: string, spoken = false) {
    if (!text.trim()) return;
    setWasSpoken(spoken);
    show((onStep) => askAssistant(text, onStep, spoken), spoken || readAloud);
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-w-0 flex-col gap-6">
        <PageHeader
          title="What can I take care of?"
          description="I buy things and pay people with your PayPal, the way you would. Type it or say it, or ask what I can do. Anything outside your rules waits for your OK."
        />
        <HowTheLeashWorks />
        <ConnectReminder />

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(prompt);
          }}
          className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm transition focus-within:border-stone-400"
        >
          <textarea
            value={voice.isListening ? voice.heardSoFar : prompt}
            readOnly={voice.isListening}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(prompt);
              }
            }}
            rows={2}
            placeholder={voice.isListening ? "Listening…" : "e.g. Restock my coffee setup, under $60"}
            className="w-full resize-none bg-transparent px-1 text-base outline-none placeholder:text-stone-400"
          />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {voice.isSupported && (
                <>
                  <TalkButton
                    isListening={voice.isListening}
                    disabled={isWorking}
                    onStart={voice.start}
                    onStop={voice.stop}
                  />
                  <span className="hidden text-xs text-stone-400 sm:inline">
                    {voice.isListening ? "Pause when you're done" : "or hold Space and say it"}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-1">
              <ReadAloudToggle
                isOn={readAloud}
                onChange={(isOn) => {
                  setReadAloud(isOn);
                  if (!isOn) stopSpeaking();
                }}
              />
              <Button type="submit" size="sm" disabled={isWorking || !prompt.trim()} aria-label="Send">
                {isWorking ? "Working…" : "Send"}
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </form>
        {voice.problem && <p className="-mt-4 text-sm text-rose-700">{voice.problem}</p>}

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

        <TryToBreakTheLeash
          disabled={isWorking}
          onAttack={(id) => {
            setWasSpoken(false);
            show((onStep) => runAttack(id, onStep), readAloud);
          }}
        />

        <AssistantTimeline steps={steps} isWorking={isWorking} wasSpoken={wasSpoken} />
        <div ref={endOfTimeline} />
      </section>

      <aside className="flex flex-col gap-4">
        <WaitingForYou />
        <LeashSummary />
      </aside>
    </div>
  );
}

/**
 * What Leash says out loud while it works: a running commentary (what it's thinking, or else
 * the step it's on, like "Searching products"), then its reply. Commentary is skipped while
 * Leash is still talking, so it never falls behind; the reply is always said.
 */
function sayAloud(step: AssistantEvent) {
  if (step.type === "thinking") speak(step.text, { ifQuiet: true });
  if (step.type === "tool_started" && TOOL_LABEL[step.tool]) speak(TOOL_LABEL[step.tool], { ifQuiet: true });
  if (step.type === "reply") speak(step.text);
  if (step.type === "error") speak(step.message);
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

/** The idea in one line: the AI chooses, code decides, PayPal moves the money. */
function HowTheLeashWorks() {
  const steps = [
    "The AI chooses what to buy or pay",
    "Your rules check it, in code",
    "PayPal pays, reserves, or never hears of it",
  ];
  return (
    <ol className="-mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-stone-500">
      {steps.map((step, index) => (
        <li key={step} className="flex items-center gap-1.5">
          {index > 0 && <ChevronRight className="h-3 w-3 text-stone-300" />}
          <span className="grid h-4 w-4 place-items-center rounded-full bg-stone-200 text-[10px] font-semibold text-stone-600">
            {index + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
