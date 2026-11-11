"use client";

// "Filter by asking": a question in plain English becomes a filter on the grid (Claude reads it,
// or the built-in reader when Claude is off). The quick choices need no question at all.

import { useState } from "react";
import type { GridView, Outcome } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { TextInput } from "@/components/ui/form-fields";
import { Sheet } from "@/components/ui/sheet";

const QUICK_VIEWS: { label: string; outcomes: Outcome[] }[] = [
  { label: "Waiting for you", outcomes: ["held"] },
  { label: "Paid", outcomes: ["auto_approved", "approved"] },
  { label: "Stopped", outcomes: ["blocked", "denied"] },
  { label: "Failed & refunded", outcomes: ["failed", "refunded"] },
];

const EXAMPLE_QUESTIONS = ["What did I spend on coffee this week?", "Held payments to people", "Biggest purchases"];

export function FilterSheet({
  open,
  onClose,
  onAsk,
  onView,
  isAsking,
}: {
  open: boolean;
  onClose: () => void;
  onAsk: (question: string) => void;
  onView: (view: GridView) => void;
  isAsking: boolean;
}) {
  const [question, setQuestion] = useState("");
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Filter by asking"
      description="Ask about your money in your own words. Your rules don't change."
      close="text"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) onAsk(question);
        }}
        className="flex flex-col gap-3"
      >
        <TextInput
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="e.g. held payments over $20, biggest first"
          className="bg-white"
          autoFocus
        />
        <Button type="submit" disabled={isAsking || !question.trim()}>
          {isAsking ? "Reading your question…" : "Filter"}
        </Button>
      </form>
      <div className="mt-5 flex flex-wrap gap-2">
        {EXAMPLE_QUESTIONS.map((example) => (
          <Chip key={example} disabled={isAsking} onClick={() => onAsk(example)}>
            {example}
          </Chip>
        ))}
      </div>
      <h3 className="mt-6 text-base font-medium">Or just show</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {QUICK_VIEWS.map(({ label, outcomes }) => (
          <Chip
            key={label}
            onClick={() =>
              onView({
                outcomes,
                kind: null,
                minAmount: null,
                maxAmount: null,
                searchText: null,
                sinceDays: null,
                sortBy: null,
                sortDirection: null,
                summary: label,
              })
            }
            className="border border-ink bg-white hover:bg-paper"
          >
            {label}
          </Chip>
        ))}
      </div>
    </Sheet>
  );
}
