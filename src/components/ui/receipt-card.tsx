// The receipt: the visual anchor of Leash. The money and its stamp come first; the AI's explanation
// stays quieter than the money.
//
//   Chewy · Today, 9:45
//   Orthopedic dog bed
//   $72.00
//   [Reserved · PayPal authorized]
//   $72 is over your $50 pay-without-asking limit.      <- the rule (code)
//   A washable cover, with support for older joints.    <- the AI's reasoning
//   PayPal · authorized → awaiting you                  <- what PayPal did

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { LEASH_PAGE, PAGE_FOR_RULE, type Decision, type LeashPage } from "@/schemas";
import { classNames, formatMoney, formatReceiptTime } from "@/lib/format";
import { paypalTrail } from "@/lib/labels";
import { OutcomeStamp } from "./stamp";

export function ReceiptCard({
  decision,
  className,
  children,
}: {
  decision: Decision;
  className?: string;
  /** Actions under the receipt, e.g. Deny and Approve. */
  children?: ReactNode;
}) {
  return (
    <article className={classNames("rounded-[20px] border border-hairline bg-white p-5 sm:p-6", className)}>
      <p className="text-xs text-ink-soft">
        {decision.counterparty} · {formatReceiptTime(decision.createdAt)}
      </p>
      <h3 className="mt-2 text-xl leading-[26px] font-semibold">{decision.title}</h3>
      <p
        className={classNames(
          "mt-2 font-mono text-[28px] leading-[34px] font-medium tabular-nums",
          decision.outcome === "denied" && "line-through",
        )}
      >
        {formatMoney(decision.amount)}
      </p>
      <div className="mt-3">
        <OutcomeStamp outcome={decision.outcome} />
      </div>
      <div className="mt-4 border-t border-hairline pt-4 text-sm">
        <p>{decision.ruleExplanation}</p>
        <ChangeTheRule decision={decision} />
        {decision.aiReasoning && <p className="mt-2 text-ink-soft">{decision.aiReasoning}</p>}
        <p className="mt-3 font-mono text-xs text-ink-soft">{paypalTrail(decision)}</p>
      </div>
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </article>
  );
}

const CHANGE_IT: Partial<Record<LeashPage, string>> = {
  limits: "Change your limits",
  people: "Go to the people you pay",
  paypal: "Connect your PayPal",
};

/** A rule held or blocked this: link to the page where you can change it. Only you can change it. */
function ChangeTheRule({ decision }: { decision: Decision }) {
  const page = PAGE_FOR_RULE[decision.ruleHit];
  if (!page || (decision.outcome !== "held" && decision.outcome !== "blocked")) return null;
  return (
    <Link href={LEASH_PAGE[page].path} className="mt-2 inline-flex items-center gap-1 text-sm text-leash">
      {CHANGE_IT[page]}
      <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
    </Link>
  );
}
