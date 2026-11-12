"use client";

// How much Leash may spend without asking: three quick choices, or type your own, plus the hard limit,
// drawn on the LeashMeter. Used on the welcome steps and on Your leash, Limits.

import { EditableAmount } from "@/components/ui/editable-amount";
import { LeashMeter } from "@/components/ui/leash-meter";
import { Segmented } from "@/components/ui/segmented";
import { formatShortMoney } from "@/lib/format";

const QUICK_CHOICES = [20, 50, 100].map((amount) => ({ value: amount, label: `$${amount}` }));

type Limits = { autoApproveLimit: number; maxItemPrice: number };

export function WithoutAsking({
  autoApproveLimit,
  maxItemPrice,
  onChange,
}: Limits & { onChange: (changes: Partial<Limits>) => void }) {
  const isQuickChoice = QUICK_CHOICES.some((choice) => choice.value === autoApproveLimit);
  return (
    <div>
      <Segmented
        label="Pay without asking up to"
        options={QUICK_CHOICES}
        value={isQuickChoice ? autoApproveLimit : null}
        onChange={(amount) => onChange({ autoApproveLimit: amount })}
        mono
      />
      <div className="mt-6">
        <LeashMeter withoutAsking={autoApproveLimit} hardLimit={maxItemPrice} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-ink-soft">Without asking</div>
          <EditableAmount
            label="Without asking"
            value={autoApproveLimit}
            onChange={(amount) => onChange({ autoApproveLimit: amount })}
          />
        </div>
        <div>
          <div className="text-xs text-ink-soft">Hard limit</div>
          <EditableAmount
            label="Hard limit"
            value={maxItemPrice}
            onChange={(amount) => onChange({ maxItemPrice: amount })}
          />
        </div>
      </div>
      {autoApproveLimit > maxItemPrice && (
        <p className="mt-3 text-sm text-reserved">
          That&apos;s above your hard limit, so anything over {formatShortMoney(maxItemPrice)} is still blocked.
        </p>
      )}
      <p className="mt-4 text-sm text-ink-soft">
        Tap an amount to type your own. Small, expected purchases go through; anything else waits for your okay.
      </p>
    </div>
  );
}
