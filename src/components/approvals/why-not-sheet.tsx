"use client";

// "Why not?": after you deny something, a reason (a chip, your own words, or both) teaches your
// twin the right lesson. You can always skip it: denying never depends on giving a reason.

import { Mic, Square } from "lucide-react";
import { useState } from "react";
import type { Decision, QuickReason } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { denyDecision } from "@/lib/api-client";
import { QUICK_REASON_LABEL } from "@/lib/labels";
import { addWords, useVoiceInput } from "@/lib/use-voice-input";

const REASONS: QuickReason[] = ["too_expensive", "not_my_taste", "not_needed", "not_now"];

export function WhyNotSheet({
  decision,
  onClose,
  onDenied,
}: {
  /** The purchase or payment being denied; the sheet is open while this is set. */
  decision: Decision | null;
  onClose: () => void;
  onDenied: (denied: Decision, taught: boolean) => void;
}) {
  const [reason, setReason] = useState<QuickReason | null>(null);
  const [note, setNote] = useState("");
  const [isDenying, setIsDenying] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Keeps listening through pauses until you tap stop, and adds to what you've already said or typed.
  const voice = useVoiceInput((heard) => setNote((before) => addWords(before, heard)), decision !== null, {
    holdSpace: false,
    untilStopped: true,
  });

  const close = () => {
    setReason(null);
    setNote("");
    setProblem(null);
    onClose();
  };

  async function deny(withReason: boolean) {
    if (!decision) return;
    setIsDenying(true);
    setProblem(null);
    try {
      const why = withReason ? { reason: reason ?? undefined, note: note.trim() || undefined } : {};
      const denied = await denyDecision(decision.id, why);
      onDenied(denied, withReason && Boolean(reason || note.trim()));
      close();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't deny it. Please try again.");
    } finally {
      setIsDenying(false);
    }
  }

  return (
    <Sheet
      open={decision !== null}
      onClose={close}
      close="text"
      title="Why not?"
      description="A little context helps your twin get to know you. You can skip this."
    >
      <div className="flex flex-wrap gap-2">
        {REASONS.map((option) => (
          <Chip key={option} on={reason === option} onClick={() => setReason(reason === option ? null : option)}>
            {QUICK_REASON_LABEL[option]}
          </Chip>
        ))}
      </div>
      <div className="mt-6 flex h-16 items-center gap-2 rounded-2xl border border-hairline bg-white pr-2 pl-4">
        <input
          value={voice.isListening ? addWords(note, voice.heardSoFar) : note}
          onChange={(event) => setNote(event.target.value)}
          readOnly={voice.isListening}
          placeholder={voice.isListening ? "Listening…" : "Tell me a bit more (optional)"}
          maxLength={240}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
        {voice.isSupported && (
          <button
            type="button"
            onClick={voice.isListening ? voice.stop : voice.start}
            aria-label={voice.isListening ? "Stop listening" : "Say it instead"}
            className="grid h-11 w-11 place-items-center rounded-xl hover:bg-paper"
          >
            {voice.isListening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {(problem || voice.problem) && <p className="mt-3 text-sm text-failed">{problem ?? voice.problem}</p>}
      <Button className="mt-6 w-full" disabled={isDenying} onClick={() => deny(true)}>
        {isDenying ? "Releasing the money…" : "Deny & teach my twin"}
      </Button>
      <Button variant="text" className="mt-3 w-full" disabled={isDenying} onClick={() => deny(false)}>
        Skip the reason
      </Button>
    </Sheet>
  );
}
