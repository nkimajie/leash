"use client";

// The top of Ask: a greeting by your PayPal name. Right after you approve or deny something it
// says so ("All paid, Favor." / "You're in control."), and mentions anything still waiting.

import { Smartphone } from "lucide-react";
import type { Decision } from "@/schemas";
import { Button } from "@/components/ui/button";
import { WashCard } from "@/components/ui/card";
import { Illustration, type IllustrationName } from "@/components/ui/illustration";
import { PageHeader } from "@/components/ui/page-header";
import { useAccount } from "@/lib/use-account";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { inSentence } from "@/lib/format";

/** How long "All paid" stays after you approve something. */
const JUST_NOW_MS = 10 * 60_000;

export function AskHero({ onOpenOnPhone }: { onOpenOnPhone: () => void }) {
  const { firstName } = useAccount();
  const { decisions } = useLiveDecisions();
  const { title, subtitle, illustration } = greeting(decisions, firstName ? `, ${firstName}` : "");

  return (
    <>
      {/* Phone: the greeting sits in the blue card */}
      <WashCard className="flex items-center justify-between gap-4 py-4 lg:hidden">
        <div>
          <h1 className="text-xl leading-[26px] font-semibold">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
        </div>
        <Illustration name={illustration} className="-my-4 w-24 shrink-0" />
      </WashCard>

      {/* Desktop: the greeting, then the promise */}
      <div className="hidden lg:block">
        <PageHeader
          title={title}
          description={subtitle}
          action={
            <Button onClick={onOpenOnPhone} className="px-6">
              <Smartphone className="h-[22px] w-[22px]" strokeWidth={1.375} />
              Open on phone
            </Button>
          }
        />
      </div>
      <WashCard className="hidden items-center justify-between gap-6 lg:flex">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">An assistant, not an autopilot.</h2>
          <p className="mt-3 max-w-xl text-base text-ink-soft">
            Shop within your rules. Keep the last word on anything that needs a yes.
          </p>
        </div>
        <Illustration name="boundary-held" className="-my-6 w-44 shrink-0" />
      </WashCard>
    </>
  );
}

function greeting(
  decisions: Decision[],
  name: string,
): { title: string; subtitle: string; illustration: IllustrationName } {
  const stillWaiting = decisions.find((d) => d.outcome === "held");
  const youJustDecided = decisions
    .filter(
      (d) => (d.outcome === "approved" || d.outcome === "denied") && Date.now() - Date.parse(d.updatedAt) < JUST_NOW_MS,
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];

  if (!youJustDecided)
    return { title: `Welcome${name}`, subtitle: "What can I take off your list?", illustration: "boundary-held" };

  const subtitle = stillWaiting
    ? `Your ${inSentence(stillWaiting.title)} is still waiting for your okay.`
    : "Nothing else needs your okay.";
  return youJustDecided.outcome === "approved"
    ? { title: `All paid${name}.`, subtitle, illustration: "all-set" }
    : { title: "You're in control.", subtitle, illustration: "released" };
}
