// A row of choices where exactly one is selected: $20 / $50 / $100, or Trusted / Ask first.

import { classNames } from "@/lib/format";

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  mono = false,
  className,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  label: string;
  /** Amounts use mono type, like every other amount. */
  mono?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={classNames("flex gap-1 rounded-xl bg-hairline p-1", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={classNames(
              "h-10 flex-1 rounded-lg border px-3 text-sm whitespace-nowrap transition-colors",
              mono && "font-mono",
              selected
                ? "border-leash-rim bg-leash-wash font-medium text-leash"
                : "border-transparent text-ink hover:bg-white/50",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
