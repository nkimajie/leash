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

/**
 * Listen: call `start`, speak, and `onHeard` gets what you said.
 *   Asking (the default): a pause means you're done, so Leash can answer.
 *   Dictating (`untilStopped`): pauses are fine; it keeps listening until you call `stop`.
 * Holding the space bar does the same, as long as you're not typing in a field or in a sheet.
 * (A sheet's own mic, like "Why not?", passes `holdSpace: false` and listens only when tapped.)
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
  /** True once you (or a problem) stop it, so a dictation isn't restarted. */
  const stopped = useRef(false);

  function start() {
    if (!findRecognition() || listener.current || !enabled) return;
    stopped.current = false;
    setProblem(null);
    setIsListening(true);
    listen("");
  }

  /**
   * One stretch of listening. The browser ends it at a pause (or, when dictating, after a longer
   * silence). When dictating, a new stretch carries on from what was already heard.
   */
  function listen(earlier: string) {
    const recognition = new (findRecognition()!)();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true; // show the words while you speak
    recognition.continuous = untilStopped;
    let heard = earlier;
    recognition.onresult = (event) => {
      heard = addWords(earlier, Array.from(event.results, (result) => result[0].transcript).join(""));
      setHeardSoFar(heard);
    };
    recognition.onerror = (event) => {
      if (untilStopped && event.error === "no-speech") return; // a long pause while dictating: carry on
      if (event.error !== "aborted") setProblem(PROBLEMS[event.error] ?? "Listening stopped. Please try again.");
      stopped.current = true;
    };
    recognition.onend = () => {
      if (untilStopped && !stopped.current) return listen(heard);
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
