"use client";

// Voice commands. The browser's own speech recognition turns what you say into text, so there's
// nothing to set up: no keys, no extra service. It works in Chrome, Edge and Safari (Chrome sends
// the audio to Google to recognise it). Firefox has none, so `isSupported` is false and you type.

import { useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from "react";

/** The parts of the browser's SpeechRecognition we use. TypeScript doesn't ship a type for it yet. */
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function findRecognition(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const browser = window as unknown as Record<string, (new () => Recognition) | undefined>;
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition ?? null;
}

const MIC_BLOCKED = "The microphone is blocked. Allow it from the icon in the address bar, then try again.";
const PROBLEMS: Record<string, string> = {
  "not-allowed": MIC_BLOCKED,
  "service-not-allowed": MIC_BLOCKED,
  "audio-capture": "No microphone was found.",
  "no-speech": "I didn't hear anything. Try again, a little closer to the mic.",
  network: "Speech recognition needs an internet connection.",
};

/** When asking, this much quiet after you speak means you're done. A breath is shorter. */
const DONE_AFTER_QUIET_MS = 2500;
/** When asking, stop if you say nothing at all for this long. */
const GIVE_UP_AFTER_MS = 10_000;

/**
 * Listen: call `start`, speak, and `onHeard` gets what you said. It listens through short pauses.
 *   Asking (the default): 2.5 seconds of quiet means you're done, so Leash can answer.
 *   Dictating (`untilStopped`): any pause is fine; it listens until you call `stop`.
 * Holding the space bar does the same, as long as you're not typing in a field or in a sheet;
 * letting go sends it straight away. (A sheet's own mic, like "Why not?", passes `holdSpace: false`.)
 */
export function useVoiceInput(
  onHeard: (text: string) => void,
  enabled: boolean,
  { holdSpace = true, untilStopped = false } = {},
) {
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    () => findRecognition() !== null,
    () => false, // the server can't know, so the mic button appears once the page is in the browser
  );
  const [isListening, setIsListening] = useState(false);
  const [heardSoFar, setHeardSoFar] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const listener = useRef<Recognition | null>(null);
  /** True once you (or a problem, or the quiet timer) stop it, so it isn't restarted. */
  const stopped = useRef(false);
  const quietTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /** When asking: stop after this much quiet. Every word you say starts the wait again. */
  function stopAfterQuiet(ms: number) {
    if (untilStopped) return;
    clearTimeout(quietTimer.current);
    quietTimer.current = setTimeout(stop, ms);
  }

  function start() {
    if (!findRecognition() || listener.current || !enabled) return;
    stopped.current = false;
    setProblem(null);
    setIsListening(true);
    stopAfterQuiet(GIVE_UP_AFTER_MS);
    listen("");
  }

  /**
   * One stretch of listening. The browser may end it on its own after a silence; unless you (or
   * the quiet timer) stopped it, a new stretch carries on from what was already heard.
   */
  function listen(earlier: string) {
    const recognition = new (findRecognition()!)();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true; // show the words while you speak
    recognition.continuous = true; // don't stop at the first breath
    let heard = earlier;
    recognition.onresult = (event) => {
      heard = addWords(earlier, Array.from(event.results, (result) => result[0].transcript).join(""));
      setHeardSoFar(heard);
      stopAfterQuiet(DONE_AFTER_QUIET_MS);
    };
    recognition.onerror = (event) => {
      if (event.error === "no-speech") return; // a long pause: carry on (asking has its own timer)
      if (event.error !== "aborted") setProblem(PROBLEMS[event.error] ?? "Listening stopped. Please try again.");
      stopped.current = true;
    };
    recognition.onend = () => {
      if (!stopped.current) return listen(heard);
      clearTimeout(quietTimer.current);
      listener.current = null;
      setIsListening(false);
      setHeardSoFar("");
      if (heard.trim()) onHeard(heard.trim());
    };
    listener.current = recognition;
    recognition.start();
  }

  function stop() {
    stopped.current = true;
    clearTimeout(quietTimer.current);
    listener.current?.stop();
  }

  // Hold the space bar to talk, unless you're typing or on a button.
  const onSpaceBar = useEffectEvent((event: KeyboardEvent) => {
    if (!holdSpace || event.code !== "Space" || isTypingOrOnAButton(event.target)) return;
    if (document.querySelector("dialog[open]")) return; // a sheet is open
    event.preventDefault();
    if (event.type === "keydown" && !event.repeat) start();
    if (event.type === "keyup") stop();
  });
  useEffect(() => {
    const handle = (event: KeyboardEvent) => onSpaceBar(event);
    window.addEventListener("keydown", handle);
    window.addEventListener("keyup", handle);
    return () => {
      window.removeEventListener("keydown", handle);
      window.removeEventListener("keyup", handle);
    };
  }, []);

  // Leaving the page stops listening.
  useEffect(
    () => () => {
      stopped.current = true;
      clearTimeout(quietTimer.current);
      listener.current?.abort();
    },
    [],
  );

  return { isSupported, isListening, heardSoFar, problem, start, stop };
}

function isTypingOrOnAButton(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

const subscribeToNothing = () => () => {};

/** Adds newly heard words to what's already there: "I like coffee" + "and tea" = "I like coffee and tea". */
export function addWords(before: string, after: string): string {
  return [before.trim(), after.trim()].filter(Boolean).join(" ");
}
