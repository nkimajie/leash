"use client";

// "$50 ↗": a limit you can tap to change.

import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { formatShortMoney } from "@/lib/format";

export function EditableAmount({ value, label, onChange }: { value: number; label: string; onChange: (value: number) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="number"
        min={1}
        step="1"
        defaultValue={value}
        autoFocus
        aria-label={label}
        onBlur={(event) => {
          const next = Number(event.target.value);
          if (next > 0) onChange(next);
          setEditing(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
          if (event.key === "Escape") setEditing(false);
        }}
        className="h-9 w-28 rounded-lg border border-leash-rim bg-white px-2 font-mono text-xl font-medium outline-none"
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Change ${label.toLowerCase()}`}
      className="inline-flex h-9 items-center gap-2 rounded-lg font-mono text-xl font-medium hover:text-leash"
    >
      {formatShortMoney(value)}
      <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}
