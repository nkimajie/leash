"use client";

// Ask: the home screen. Ask for something, by typing or out loud, and watch Leash work step by
// step. When you speak, Leash talks back: a running commentary, then its reply.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AssistantEvent, EarlierTurn, Restock } from "@/schemas";
import { Page } from "@/components/ui/page";
import { askAssistant, fetchConversation, forgetConversation, runAttack, runRestockNow } from "@/lib/api-client";
import { TOOL_LABEL } from "@/lib/labels";
import { speak, stopSpeaking, unlockSpeech } from "@/lib/speak";
import { APlaceToStart } from "./a-place-to-start";
import { AskHero } from "./ask-hero";
import { AssistantTimeline } from "./assistant-timeline";
import { Composer } from "./composer";
import { LeashRemembers } from "./leash-remembers";
import { SignInReminder } from "./sign-in-reminder";
import { WaitingForYou } from "./waiting-for-you";

export function AssistantPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [steps, setSteps] = useState<AssistantEvent[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [wasSpoken, setWasSpoken] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  // What Leash remembers from earlier: shown here, and recalled by the server with each request.
  const [conversation, setConversation] = useState<EarlierTurn[]>([]);
  const endOfTimeline = useRef<HTMLDivElement>(null);
  const onScreenRequest = steps.find((step) => step.type === "request_started")?.request;

  useEffect(() => {
    endOfTimeline.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [steps]);

  useEffect(() => {
    fetchConversation().then(setConversation, () => {}); // without it, Ask still works
  }, []);

  /** Runs the assistant (or an attack) and shows each step as it arrives, saying it aloud if asked. */
  async function show(work: (onStep: (step: AssistantEvent) => void) => Promise<void>, aloud: boolean) {
    if (isWorking) return;
    stopSpeaking();
    if (aloud) unlockSpeech(); // when you typed or tapped an example, so phones read the reply aloud
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
      await askAssistant(text, onStep, spoken);
      setConversation(await fetchConversation()); // now including this exchange
    }, spoken || readAloud);
  }

  async function startFresh() {
    await forgetConversation();
    setConversation([]);
    setSteps([]);
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
      <LeashRemembers
        conversation={conversation}
        onScreenRequestId={onScreenRequest?.id}
        onStartFresh={startFresh}
        disabled={isWorking}
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
