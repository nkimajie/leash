"use client";

// Small badges that tell a judge which services are live and which are mocked.

import { useEffect, useState } from "react";
import type { Modes } from "@/lib/modes";

export function ModeBadges() {
  const [modes, setModes] = useState<Modes | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setModes(s.modes))
      .catch(() => {});
  }, []);

  if (!modes) return null;
  const items: [string, string, boolean][] = [
    ["PayPal", modes.paypal, modes.paypal !== "mock"],
    ["Agent", modes.agent, modes.agent !== "mock"],
    ["Search", modes.search, modes.search !== "mock"],
    ["DB", modes.database, modes.database !== "memory"],
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
      {items.map(([name, mode, live]) => (
        <span
          key={name}
          title={live ? `${name} is live` : `${name} is running in mock mode (no keys set)`}
          className={`rounded-md px-1.5 py-0.5 font-medium ${live ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}
        >
          {name}: {mode}
        </span>
      ))}
      {modes.forceDecline && (
        <span className="rounded-md bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">decline test ON</span>
      )}
    </div>
  );
}
