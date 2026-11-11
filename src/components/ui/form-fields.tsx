import type { InputHTMLAttributes, ReactNode } from "react";
import { classNames } from "@/lib/format";

// Fields sit on white cards, so they're filled with paper. On the paper background, pass "bg-white".
const fieldStyle =
  "w-full rounded-xl border border-transparent bg-paper px-4 text-base text-ink placeholder:text-ink-soft outline-none transition focus:border-leash-rim focus:ring-2 focus:ring-leash-wash";

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames(fieldStyle, "h-12", className)} />;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={classNames(
        "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-leash" : "bg-hairline",
      )}
    >
      <span
        className={classNames(
          "inline-block h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[23px]" : "translate-x-[3px]",
        )}
      />
    </button>
  );
}
