// The Leash mark: a loop you can hold, with an L-shaped tether.

import Link from "next/link";
import { classNames } from "@/lib/format";

export function LeashMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" className={classNames("shrink-0", className)} aria-hidden>
      <rect width="36" height="36" rx="10.8" fill="#1552F0" />
      <path
        d="M13.5 18.45c-7.2 0-7.2-10.8 0-10.8s7.2 10.8 0 10.8Zm0 0v5.4a3.6 3.6 0 0 0 3.6 3.6h9"
        fill="none"
        stroke="white"
        strokeWidth="2.97"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LeashLogo({ size = "default" }: { size?: "default" | "compact" | "large" }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Leash home">
      <LeashMark className={{ default: "h-9 w-9", compact: "h-8 w-8", large: "h-12 w-12" }[size]} />
      <span
        className={classNames(
          "font-semibold tracking-[-0.03em] text-ink",
          { default: "text-[28px]", compact: "text-xl", large: "text-[37px]" }[size],
        )}
      >
        Leash
      </span>
    </Link>
  );
}
