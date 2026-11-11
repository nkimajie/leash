"use client";

// Ask: the home screen. Ask for something, by typing or out loud, and watch Leash work step by
// step. When you speak, Leash talks back: a running commentary, then its reply.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AssistantEvent, EarlierTurn, Restock } from "@/schemas";
import { Page } from "@/components/ui/page";
import { askAssistant, runAttack, runRestockNow } from "@/lib/api-client";
import { loadConversation, rememberExchange } from "@/lib/conversation";
import { TOOL_LABEL } from "@/lib/labels";
import { speak, stopSpeaking } from "@/lib/speak";
import { APlaceToStart } from "./a-place-to-start";
import { AskHero } from "./ask-hero";
import { AssistantTimeline } from "./assistant-timeline";
import { Composer } from "./composer";
import { SignInReminder } from "./sign-in-reminder";
import { WaitingForYou } from "./waiting-for-you";

export function AssistantPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<AssistantEvent[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [wasSpoken, setWasSpoken] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  // The last few exchanges, sent with each request so Leash understands "yes, do that".
  const [conversation, setConversation] = useState<EarlierTurn[]>(loadConversation);
  const endOfTimeline = useRef<HTMLDivElement>(null);

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

  function send(text: string, spoken: boolean) {
    if (!text.trim() || isWorking) return; // Enter while Leash works keeps what you typed
    setWasSpoken(spoken);
    setPrompt("");
    show(async (onStep) => {
      let leashSaid = "";
      const remember = (step: AssistantEvent) => {
        if (step.type === "reply") leashSaid = step.text;
        onStep(step);
      };
      await askAssistant(text, remember, spoken, conversation);
      if (leashSaid) {
        setConversation((turns) => rememberExchange(turns, text, leashSaid));
      }
    }, spoken || readAloud);
  }

  /** A due restock runs now; anything it buys waits for your okay. */
  function runRestock(restock: Restock) {
    setWasSpoken(false);
    show(async (onStep) => {
      onStep({ type: "thinking", text: `Running your restock: “${restock.prompt}”.` });
      const run = await runRestockNow(restock.id);
      run.decisions.forEach((decision) => onStep({ type: "decision_made", decision }));
      onStep({ type: "reply", text: run.reply });
    }, readAloud);
  }

  return (
    <Page narrow>
      <AskHero />
      <SignInReminder />
      <Composer
        prompt={prompt}
        onPromptChange={setPrompt}
        onSend={send}
        isWorking={isWorking}
        readAloud={readAloud}
        onReadAloudChange={setReadAloud}
      />
      {(steps.length > 0 || isWorking) && (
        <div>
          <AssistantTimeline steps={steps} isWorking={isWorking} wasSpoken={wasSpoken} />
          <div ref={endOfTimeline} />
        </div>
      )}
      <WaitingForYou />
      <APlaceToStart
        disabled={isWorking}
        onAsk={(example) => {
          setPrompt(example);
          send(example, false);
        }}
        onRunRestock={runRestock}
        onAttack={(id) => {
          setWasSpoken(false);
          show((onStep) => runAttack(id, onStep), readAloud);
        }}
      />
    </Page>
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
