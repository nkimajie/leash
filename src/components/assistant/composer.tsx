"use client";

// "Ask Leash": type a request, or hold Space (or tap Talk) and say it. When you speak, Leash talks back;
// "Read aloud" makes it talk back when you type too.

import { ArrowUp, Mic, Square, Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Toggle } from "@/components/ui/form-fields";
import { classNames } from "@/lib/format";
import { stopSpeaking } from "@/lib/speak";
import { useVoiceInput } from "@/lib/use-voice-input";

export function Composer(props: {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onSend: (text: string, spoken: boolean) => void;
  isWorking: boolean;
  readAloud: boolean;
  onReadAloudChange: (on: boolean) => void;
}) {
  const { prompt, onPromptChange, onSend, isWorking } = props;
  const voice = useVoiceInput((heard) => {
    onPromptChange(heard);
    onSend(heard, true);
  }, !isWorking);

  return (
    <Card>
      <h2 className="mb-4 hidden text-base font-medium lg:block">Ask Leash</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSend(prompt, false);
        }}
      >
        <div className="rounded-xl bg-paper px-4 py-4">
          <textarea
            value={voice.isListening ? voice.heardSoFar : prompt}
            readOnly={voice.isListening}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend(prompt, false);
              }
            }}
            rows={voice.isListening || prompt.length > 60 ? 2 : 1}
            placeholder={voice.isListening ? "Listening…" : "Ask for something, or hold Space"}
            aria-label="Ask Leash"
            className="block w-full resize-none bg-transparent text-base outline-none placeholder:text-ink-soft"
          />
          {voice.isListening && (
            <p className="mt-2 font-mono text-xs text-ink-soft">I&apos;m listening · only you can approve</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          {voice.isSupported && (
            <button
              type="button"
              onClick={voice.isListening ? voice.stop : voice.start}
              disabled={isWorking}
              aria-label={voice.isListening ? "Stop listening" : "Talk to Leash"}
              className={classNames(
                "grid h-14 w-14 shrink-0 place-items-center rounded-full border-[3px] border-leash-rim bg-leash text-white transition-colors hover:bg-leash-pressed disabled:opacity-50",
                voice.isListening && "animate-pulse",
              )}
            >
              {voice.isListening ? (
                <Square className="h-5 w-5" strokeWidth={1.5} />
              ) : (
                <Mic className="h-6 w-6" strokeWidth={1.5} />
              )}
            </button>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            {voice.isSupported && (
              <span className="text-sm font-medium">{voice.isListening ? "Stop listening" : "Talk"}</span>
            )}
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Volume2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              Read aloud
              <Toggle
                checked={props.readAloud}
                label="Read replies aloud"
                onChange={(on) => {
                  props.onReadAloudChange(on);
                  if (!on) stopSpeaking();
                }}
              />
            </span>
          </div>
          <button
            type="submit"
            disabled={isWorking || !prompt.trim()}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-[1.5px] border-leash-rim bg-leash text-white transition-colors hover:bg-leash-pressed disabled:opacity-50"
          >
            <ArrowUp className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
      </form>
      {voice.problem && <p className="mt-3 text-sm text-failed">{voice.problem}</p>}
    </Card>
  );
}
