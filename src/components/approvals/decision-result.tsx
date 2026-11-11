"use client";

// After you approve or deny: "All paid." or "You weren't charged.", the stamp, and what your twin
// learned. You can decide from several places (Ask, Money, notifications, restocks), and the row
// you decided on disappears once it's no longer waiting, so the result lives at the top of the app.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Decision, Preference } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { Sheet } from "@/components/ui/sheet";
import { OutcomeStamp } from "@/components/ui/stamp";
import { fetchPreferences } from "@/lib/api-client";
import { classNames, formatMoney, formatShortMoney, inSentence } from "@/lib/format";
import { useLiveDecisions } from "@/lib/use-live-decisions";

const ShowResultContext = createContext<(decided: Decision) => void>(() => {});

/** Lets any Approve or Deny button show its result. */
export const useShowDecisionResult = () => useContext(ShowResultContext);

export function DecisionResultProvider({ children }: { children: ReactNode }) {
  const [decided, setDecided] = useState<Decision | null>(null);
  return (
    <ShowResultContext value={setDecided}>
      {children}
      <DecisionResultSheet decided={decided} onClose={() => setDecided(null)} />
    </ShowResultContext>
  );
}

const RESULT: Partial<Record<Decision["outcome"], { title: string; illustration: IllustrationName }>> = {
  approved: { title: "All paid.", illustration: "all-set" },
  denied: { title: "You weren't charged.", illustration: "released" },
  failed: { title: "PayPal couldn't finish.", illustration: "waiting" },
};

function DecisionResultSheet({ decided, onClose }: { decided: Decision | null; onClose: () => void }) {
  return (
    <Sheet open={decided !== null} onClose={onClose} close="none" white>
      {decided && <Result decided={decided} onClose={onClose} />}
    </Sheet>
  );
}

function Result({ decided, onClose }: { decided: Decision; onClose: () => void }) {
  const { decisions } = useLiveDecisions();
  const stillWaiting = decisions.find((d) => d.outcome === "held" && d.id !== decided.id);
  const { title, illustration } = RESULT[decided.outcome] ?? { title: "Done.", illustration: "all-set" };
  const amount = formatShortMoney(decided.amount);
  const whatPayPalDid =
    decided.outcome === "denied"
      ? `PayPal released the ${amount}. You were never charged.`
      : decided.outcome === "failed"
        ? "Nothing was charged."
        : `PayPal paid ${amount} to ${decided.counterparty}.`;

  return (
    <>
      <div className="grid place-items-center rounded-2xl border border-leash-rim bg-leash-wash">
        <Illustration name={illustration} className="w-40" />
      </div>
      <h2 className="mt-5 text-[28px] leading-[34px] font-semibold tracking-[-0.03em]">{title}</h2>
      <p
        className={classNames(
          "mt-3 font-mono text-[40px] leading-[44px] font-medium tabular-nums",
          decided.outcome === "denied" && "line-through",
        )}
      >
        {formatMoney(decided.amount)}
      </p>
      <div className="mt-4">
        <OutcomeStamp outcome={decided.outcome} size="large" />
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        {decided.title} · {whatPayPalDid}
      </p>
      <WhatYourTwinLearned decisionId={decided.id} />
      <Button className="mt-6 w-full" onClick={onClose}>
        Done
      </Button>
      <p className="mt-3 text-center text-xs text-ink-soft">
        {stillWaiting
          ? `Your ${inSentence(stillWaiting.title)} is still waiting for you.`
          : "Nothing else needs your okay."}
      </p>
    </>
  );
}

/** "A little wiser": the lesson your twin took from this decision, if it took one. */
function WhatYourTwinLearned({ decisionId }: { decisionId: string }) {
  const [lesson, setLesson] = useState<Preference | null>(null);
  useEffect(() => {
    fetchPreferences().then(
      (lessons) => setLesson(lessons.find((p) => p.learnedFromDecisionId === decisionId) ?? null),
      () => {},
    );
  }, [decisionId]);

  if (!lesson) return null;
  return (
    <div className="mt-5 rounded-2xl bg-paper px-4 py-3">
      <div className="text-base font-semibold">A little wiser</div>
      <p className="mt-1 text-sm">→ {lesson.statement}</p>
    </div>
  );
}
