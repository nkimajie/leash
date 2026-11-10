"use client";

// The two voice buttons in the ask box: talk to Leash, and have Leash read its replies aloud.

import { Mic, Square, Volume2, VolumeX } from "lucide-react";
import { classNames } from "@/lib/format";

/** Tap to talk; Leash sends what you said when you pause. Tap again to stop early. */
export function TalkButton(props: {
  isListening: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.isListening ? props.onStop : props.onStart}
      disabled={props.disabled}
      aria-label={props.isListening ? "Stop listening" : "Talk to Leash"}
      className={classNames(
        "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition disabled:opacity-50",
        props.isListening
          ? "animate-pulse bg-rose-600 text-white"
          : "bg-stone-100 text-stone-700 hover:bg-stone-200 hover:text-stone-900",
      )}
    >
      {props.isListening ? <Square className="h-3 w-3 fill-current" /> : <Mic className="h-3.5 w-3.5" />}
      {props.isListening ? "Listening…" : "Talk"}
    </button>
  );
}

/** When on, Leash reads its replies aloud even when you type. Spoken requests always get a spoken reply. */
export function ReadAloudToggle({ isOn, onChange }: { isOn: boolean; onChange: (isOn: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isOn)}
      aria-pressed={isOn}
      title={isOn ? "Leash reads its replies aloud" : "Read replies aloud"}
      className={classNames(
        "grid h-8 w-8 place-items-center rounded-full transition",
        isOn ? "bg-violet-100 text-violet-700" : "text-stone-400 hover:bg-stone-100 hover:text-stone-700",
      )}
    >
      {isOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
    </button>
  );
}
