"use client";

// Suggestions under the ask box: restocks that are due, things to try, and "Try to break the leash",
// where a scam takes over the assistant and the rules still decide what money moves.

import { useEffect, useState } from "react";
import type { Restock } from "@/schemas";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { fetchRestocks } from "@/lib/api-client";
import { ATTACKS } from "@/lib/attacks";

const EXAMPLES = [
  "What can you do for me?",
  "Restock dog food and coffee filters, under $50",
  "Pay Sam $25 for dinner",
  "Restock dog food every 30 days",
];

export function APlaceToStart(props: {
  disabled: boolean;
  onAsk: (prompt: string) => void;
  onRunRestock: (restock: Restock) => void;
  onAttack: (attackId: string) => void;
}) {
  const [due, setDue] = useState<Restock[]>([]);

  useEffect(() => {
    fetchRestocks()
      .then((restocks) => setDue(restocks.filter((r) => r.active && Date.parse(r.nextRunAt) <= Date.now())))
      .catch(() => {});
  }, []);

  return (
    <Card>
      <h2 className="text-xl leading-[26px] font-semibold">A place to start</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {due.map((restock) => (
          <Chip key={restock.id} disabled={props.disabled} onClick={() => props.onRunRestock(restock)}>
            {restock.prompt} is due: run it
          </Chip>
        ))}
        {EXAMPLES.map((example) => (
          <Chip key={example} disabled={props.disabled} onClick={() => props.onAsk(example)}>
            {example}
          </Chip>
        ))}
      </div>

      <h3 className="mt-6 text-base font-medium">Try to break the leash</h3>
      <p className="mt-1 text-sm text-ink-soft">A scam takes over the assistant. Your rules still decide.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ATTACKS.map((attack) => (
          <Chip
            key={attack.id}
            disabled={props.disabled}
            onClick={() => props.onAttack(attack.id)}
            className="border border-ink bg-white hover:bg-paper"
          >
            {attack.title}
          </Chip>
        ))}
      </div>
    </Card>
  );
}
