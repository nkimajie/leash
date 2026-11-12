"use client";

// "Copy": puts a value on the clipboard, then says "Copied" for a moment.

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() =>
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          },
          () => {},
        )
      }
      aria-label={`Copy the ${label.toLowerCase()}`}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 text-xs hover:bg-paper"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-paid" /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
