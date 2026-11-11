"use client";

// The first visit: what Leash is, signing in with PayPal, your first limits, and a first few lessons
// for your twin. PayPal sends you back here (?result=connected), straight to step 2.
//
//   Start → 1. How it works + Continue with PayPal → 2. Set your leash → 3. Meet your twin → Ask

import { Mic, Square } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { DEFAULT_SPENDING_RULES, type SpendingRules } from "@/schemas";
import { LeashLogo } from "@/components/layout/leash-logo";
import { Button } from "@/components/ui/button";
import { Card, WashCard } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Illustration } from "@/components/ui/illustration";
import { LeashMeter } from "@/components/ui/leash-meter";
import { Segmented } from "@/components/ui/segmented";
import { Stamp } from "@/components/ui/stamp";
import { addPreference, fetchSpendingRules, saveSpendingRules, startConnectingPayPal } from "@/lib/api-client";
import { formatShortMoney } from "@/lib/format";
import { addWords, useVoiceInput } from "@/lib/use-voice-input";
import { startLookingAround } from "@/lib/looking-around";

const STEPS = ["start", "how", "leash", "twin"] as const;
type Step = (typeof STEPS)[number];

export function WelcomeSteps() {
  const router = useRouter();
  const params = useSearchParams();
  const result = params.get("result");
  const asked = STEPS.find((s) => s === params.get("step")); // e.g. /welcome?step=twin
  const [step, setStep] = useState<Step>(asked ?? (result === "connected" ? "leash" : result ? "how" : "start"));

  const finish = () => router.push("/");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-paper">
      {step === "start" && <Start onNext={() => setStep("how")} />}
      {step === "how" && <HowItWorks cancelled={result === "cancelled" || result === "failed"} />}
      {step === "leash" && <SetYourLeash onNext={() => setStep("twin")} />}
      {step === "twin" && <MeetYourTwin onDone={finish} />}
    </main>
  );
}

function Start({ onNext }: { onNext: () => void }) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center px-5 pt-16">
        <LeashLogo size="large" />
        <WashCard className="mt-10 flex w-full flex-col items-center pb-10">
          <Illustration name="boundary-held" className="w-56" eager />
          <h1 className="text-center text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">
            Your errands.
            <br />
            Your rules.
          </h1>
        </WashCard>
        <p className="mt-12 text-center text-base text-ink-soft">
          Meet the assistant that can buy for you, without taking the final say away.
        </p>
      </div>
      <Footer>
        <Button className="w-full" onClick={onNext}>
          Get started
        </Button>
        <p className="mt-3 text-center text-sm text-ink-soft">Small errands. Clear boundaries.</p>
      </Footer>
    </>
  );
}

function HowItWorks({ cancelled }: { cancelled: boolean }) {
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function continueWithPayPal() {
    setIsOpening(true);
    setProblem(null);
    try {
      const { approvalUrl } = await startConnectingPayPal("welcome");
      window.location.href = approvalUrl; // PayPal's own page (in mock mode, straight back to step 2)
    } catch (error) {
      setProblem((error as Error).message);
      setIsOpening(false);
    }
  }

  return (
    <>
      <div className="flex-1 px-5 pt-6">
        <LeashLogo />
        <StepCount step={1} />
        <h1 className="mt-4 text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">
          Leash buys things and pays people with your PayPal. <span className="text-leash">You hold the leash.</span>
        </h1>
        <Card className="mt-6">
          <h2 className="text-xl font-semibold">Here&apos;s how it works</h2>
          <ul className="mt-5 flex flex-col gap-5">
            <Rule tone="paid" stamp="Paid" text="Small, expected purchases are paid straight away." />
            <Rule tone="reserved" stamp="Reserved" text="Bigger or unusual purchases wait for your okay." />
            <Rule tone="blocked" stamp="Blocked" text="Dangerous requests stop before PayPal is called." />
          </ul>
        </Card>
        <p className="mt-6 text-base">Leash can say no for you. Only you can say yes.</p>
        {cancelled && (
          <p className="mt-4 text-sm text-reserved">
            Connecting your PayPal didn&apos;t finish, so nothing was saved. Please try again.
          </p>
        )}
        {problem && <p className="mt-4 text-sm text-failed">{problem}</p>}
      </div>
      <Footer>
        <Button variant="paypal" className="w-full" disabled={isOpening} onClick={continueWithPayPal}>
          {isOpening ? "Opening PayPal…" : "Continue with PayPal"}
        </Button>
        <Button
          variant="text"
          className="mt-2 w-full"
          onClick={() => {
            startLookingAround();
            router.push("/");
          }}
        >
          Look around first
        </Button>
      </Footer>
    </>
  );
}

function Rule({ tone, stamp, text }: { tone: "paid" | "reserved" | "blocked"; stamp: string; text: string }) {
  return (
    <li className="grid grid-cols-[96px_1fr] items-start gap-3">
      <span>
        <Stamp tone={tone} size="compact">
          {stamp}
        </Stamp>
      </span>
      <span className="text-sm">{text}</span>
    </li>
  );
}

const WITHOUT_ASKING_CHOICES = [20, 50, 100].map((amount) => ({ value: amount, label: `$${amount}` }));

function SetYourLeash({ onNext }: { onNext: () => void }) {
  const [rules, setRules] = useState<SpendingRules>(DEFAULT_SPENDING_RULES);
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    fetchSpendingRules().then(setRules, () => {});
  }, []);

  async function save() {
    setIsSaving(true);
    try {
      await saveSpendingRules(rules);
      onNext();
    } catch (error) {
      setProblem((error as Error).message);
      setIsSaving(false);
    }
  }

  const toggle = (category: string) =>
    setRules({
      ...rules,
      blockedCategories: rules.blockedCategories.includes(category)
        ? rules.blockedCategories.filter((c) => c !== category)
        : [...rules.blockedCategories, category],
    });
  const categories = [...new Set([...DEFAULT_SPENDING_RULES.blockedCategories, ...rules.blockedCategories])];

  return (
    <>
      <div className="flex-1 px-5 pt-6">
        <StepCount step={2} />
        <h1 className="mt-4 text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">
          How much can I spend without asking?
        </h1>
        <Card className="mt-6 p-4">
          <Segmented
            label="Pay without asking up to"
            options={WITHOUT_ASKING_CHOICES}
            value={rules.autoApproveLimit}
            onChange={(autoApproveLimit) => setRules({ ...rules, autoApproveLimit })}
            mono
          />
          <div className="mt-6">
            <LeashMeter withoutAsking={rules.autoApproveLimit} hardLimit={rules.maxItemPrice} />
          </div>
          <p className="mt-3 font-mono text-sm">
            {formatShortMoney(rules.autoApproveLimit)} without asking · {formatShortMoney(rules.maxItemPrice)} hard
            limit
          </p>
          <p className="mt-5 text-sm text-ink-soft">
            Small, expected purchases go through. Anything else waits for your okay.
          </p>
        </Card>
        <Card className="mt-5 p-4">
          <h2 className="text-xl font-semibold">Never buy</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Chip key={category} on={rules.blockedCategories.includes(category)} onClick={() => toggle(category)}>
                {category[0].toUpperCase() + category.slice(1)}
              </Chip>
            ))}
          </div>
        </Card>
        {problem && <p className="mt-4 text-sm text-failed">{problem}</p>}
      </div>
      <Footer>
        <Button className="w-full" disabled={isSaving} onClick={save}>
          {isSaving ? "Saving…" : "Continue"}
        </Button>
        <Button variant="text" className="mt-2 w-full" onClick={onNext}>
          Use the defaults
        </Button>
      </Footer>
    </>
  );
}

const QUESTIONS = [
  { question: "What do you buy often?", sentiment: "likes", lesson: (answer: string) => `Buys often: ${answer}` },
  { question: "What matters to you?", sentiment: "likes", lesson: (answer: string) => `Cares about: ${answer}` },
  { question: "What should I never buy?", sentiment: "avoids", lesson: (answer: string) => `Never buy: ${answer}` },
] as const;

function MeetYourTwin({ onDone }: { onDone: () => void }) {
  const [answers, setAnswers] = useState<string[]>(["", "", ""]);
  const [open, setOpen] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const answer = (index: number, text: string) => setAnswers((all) => all.map((a, i) => (i === index ? text : a)));

  // "Or just say it" answers the open question (or the first one without an answer). It keeps
  // listening through pauses until you tap stop, and adds to what's already there.
  const listeningFor = useRef(0);
  const voice = useVoiceInput(
    (heard) => setAnswers((all) => all.map((a, i) => (i === listeningFor.current ? addWords(a, heard) : a))),
    true,
    { holdSpace: false, untilStopped: true },
  );
  function startListening() {
    const unanswered = answers.findIndex((a) => !a.trim());
    listeningFor.current = open ?? (unanswered === -1 ? 0 : unanswered);
    setOpen(listeningFor.current);
    voice.start();
  }

  async function done() {
    setIsSaving(true);
    await Promise.all(
      QUESTIONS.map(({ sentiment, lesson }, index) =>
        answers[index].trim()
          ? addPreference({ sentiment, statement: lesson(answers[index].trim()), category: null })
          : null,
      ),
    ).catch(() => {});
    onDone();
  }

  return (
    <>
      <div className="flex-1 px-5 pt-6">
        <div className="flex items-center justify-between">
          <StepCount step={3} />
          <button onClick={onDone} className="text-sm text-leash">
            Skip
          </button>
        </div>
        <h1 className="mt-4 text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">Meet your twin</h1>
        <p className="mt-3 text-base">I learn to shop like you from every approve, deny and reason.</p>
        <Card className="mt-6 p-4">
          <h2 className="text-xl font-semibold">A few things about you</h2>
          <div className="mt-4 flex flex-col gap-3">
            {QUESTIONS.map(({ question }, index) =>
              open === index ? (
                <input
                  key={question}
                  autoFocus
                  value={voice.isListening ? addWords(answers[index], voice.heardSoFar) : answers[index]}
                  readOnly={voice.isListening}
                  onChange={(event) => answer(index, event.target.value)}
                  onBlur={() => !voice.isListening && setOpen(null)}
                  placeholder={question}
                  maxLength={120}
                  className="h-11 rounded-full border border-leash-rim bg-white px-4 text-sm outline-none"
                />
              ) : (
                <Chip
                  key={question}
                  onClick={() => !voice.isListening && setOpen(index)}
                  className="w-full justify-start"
                >
                  {answers[index] ? `${question} ${answers[index]}` : question}
                </Chip>
              ),
            )}
          </div>
          {voice.isSupported && (
            <button
              onMouseDown={(event) => event.preventDefault()} // keep the open question open
              onClick={voice.isListening ? voice.stop : startListening}
              className="mt-4 flex items-center gap-3 text-base"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-leash-rim bg-leash text-white">
                {voice.isListening ? <Square className="h-5 w-5" /> : <Mic className="h-6 w-6" strokeWidth={1.5} />}
              </span>
              {voice.isListening ? "Listening… tap to stop" : "Or just say it"}
            </button>
          )}
          {voice.problem && <p className="mt-3 text-sm text-failed">{voice.problem}</p>}
        </Card>
        <WashCard className="mt-5 flex items-center gap-4 p-4">
          <Illustration name="lesson-saved" className="-my-4 w-24 shrink-0" />
          <p className="text-sm">Your twin will remember what you tell it, and you can change it any time.</p>
        </WashCard>
      </div>
      <Footer>
        <Button className="w-full" disabled={isSaving || voice.isListening} onClick={done}>
          {isSaving ? "Saving…" : voice.isListening ? "Tap stop when you're done" : "Done"}
        </Button>
      </Footer>
    </>
  );
}

function StepCount({ step }: { step: number }) {
  return <p className="mt-6 font-mono text-xs text-ink-soft">Step {step} of 3</p>;
}

function Footer({ children }: { children: ReactNode }) {
  return (
    <footer className="sticky bottom-0 rounded-t-[28px] bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      {children}
    </footer>
  );
}
