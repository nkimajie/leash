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

import type { ReactNode } from "react";
import type { Decision } from "@/schemas";
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
        {decision.aiReasoning && <p className="mt-2 text-ink-soft">{decision.aiReasoning}</p>}
        <p className="mt-3 font-mono text-xs text-ink-soft">{paypalTrail(decision)}</p>
      </div>
      {children && <div className="mt-4 flex flex-wrap gap-2">{children}</div>}
    </article>
  );
}
