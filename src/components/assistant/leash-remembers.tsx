"use client";

// Leash remembers: your last few exchanges, so "how long is the delivery?" knows which order you
// mean. They're saved with your requests, so they survive a reload or another device.
// "Start fresh" makes Leash forget them; your receipts in Money stay.

import { useState } from "react";
import type { EarlierTurn } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { formatWhen } from "@/lib/format";

/** Shown at first; the rest are a tap away. */
const SHOW_FIRST = 3;

export function LeashRemembers(props: {
  conversation: EarlierTurn[];
  /** The exchange on screen right now, which the timeline already shows. */
  onScreenRequestId?: string;
  onStartFresh: () => void;
  disabled: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const turns = props.conversation.filter((turn) => turn.requestId !== props.onScreenRequestId);
  if (turns.length === 0) return null;
  const shown = showAll ? turns : turns.slice(-SHOW_FIRST);

  return (
    <Card>
      <CardHeader
        title="Leash remembers"
        description="Your last few exchanges and what Leash did in them, so you can say “that one” or “yes, do it”."
        action={
          <Button
            variant="text"
            size="sm"
            className="shrink-0 whitespace-nowrap"
            onClick={props.onStartFresh}
            disabled={props.disabled}
          >
            Start fresh
          </Button>
        }
      />
      {turns.length > shown.length && (
        <Button variant="text" size="sm" className="-ml-3 mb-2" onClick={() => setShowAll(true)}>
          Show all {turns.length}
        </Button>
      )}
      <ol className="flex flex-col gap-4">
        {shown.map((turn) => (
          <li key={turn.requestId}>
            <p className="font-mono text-xs text-ink-soft">
              {formatWhen(turn.at)} · “{turn.you}”
            </p>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed">{turn.leash}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
