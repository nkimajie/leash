// One purchase or payment as a receipt line: what, where and when on the left; the amount and its
// stamp on the right. Used on Money, in notifications and in "Waiting for you".

import type { Decision } from "@/schemas";
import { classNames, formatMoney, formatReceiptTime } from "@/lib/format";
import { OutcomeStamp } from "./stamp";

export function ReceiptRow({
  decision,
  onOpen,
  wide = false,
}: {
  decision: Decision;
  onOpen?: () => void;
  /** Wide rows (desktop Money) put the full stamp beside the amount. */
  wide?: boolean;
}) {
  const where = decision.kind === "purchase" ? `${decision.counterparty} · ` : "";
  const content = (
    <>
      <div className="min-w-0">
        <div className="truncate text-base text-ink">{decision.title}</div>
        <div className="mt-1 text-xs text-ink-soft">
          {where}
          {formatReceiptTime(decision.createdAt)}
        </div>
      </div>
      <div
        className={classNames(
          "flex shrink-0 items-end gap-2",
          wide ? "flex-col sm:flex-row sm:items-center sm:gap-8" : "flex-col",
        )}
      >
        <Amount decision={decision} />
        <span className={wide ? "hidden sm:inline-flex" : "hidden"}>
          <OutcomeStamp outcome={decision.outcome} />
        </span>
        <span className={wide ? "sm:hidden" : undefined}>
          <OutcomeStamp outcome={decision.outcome} size="compact" />
        </span>
      </div>
    </>
  );

  const rowStyle = "flex w-full items-start justify-between gap-4 py-4 text-left";
  return onOpen ? (
    <button onClick={onOpen} className={classNames(rowStyle, "rounded-xl transition-colors hover:bg-paper/60")}>
      {content}
    </button>
  ) : (
    <div className={rowStyle}>{content}</div>
  );
}

/** Amounts are mono with tabular figures. A released amount is struck through: it was never taken. */
export function Amount({
  decision,
  className,
}: {
  decision: Pick<Decision, "amount" | "outcome">;
  className?: string;
}) {
  return (
    <span
      className={classNames(
        "font-mono text-xl font-medium tabular-nums",
        decision.outcome === "denied" && "line-through",
        className,
      )}
    >
      {formatMoney(decision.amount)}
    </span>
  );
}
