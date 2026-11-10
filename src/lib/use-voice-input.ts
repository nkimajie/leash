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
 * Listen once: call `start`, speak, and when you pause, `onHeard` gets what you said.
 * Holding the space bar does the same, as long as you're not typing in a field.
 */
export function useVoiceInput(onHeard: (text: string) => void, enabled: boolean) {
  const isSupported = useSyncExternalStore(
    subscribeToNothing,
    () => findRecognition() !== null,
    () => false, // the server can't know, so the mic button appears once the page is in the browser
  );
  const [isListening, setIsListening] = useState(false);
  const [heardSoFar, setHeardSoFar] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const listener = useRef<Recognition | null>(null);

  function start() {
    const Recognition = findRecognition();
    if (!Recognition || listener.current || !enabled) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true; // show the words while you speak
    recognition.continuous = false; // stop by itself when you pause
    let heard = "";
    recognition.onresult = (event) => {
      heard = Array.from(event.results, (result) => result[0].transcript).join("");
      setHeardSoFar(heard);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setProblem(PROBLEMS[event.error] ?? "Listening stopped. Please try again.");
    };
    recognition.onend = () => {
      listener.current = null;
      setIsListening(false);
      setHeardSoFar("");
      if (heard.trim()) onHeard(heard.trim());
    };
    listener.current = recognition;
    setProblem(null);
    setIsListening(true);
    recognition.start();
  }

  function stop() {
    listener.current?.stop();
  }

  // Hold the space bar to talk, unless you're typing or on a button.
  const onSpaceBar = useEffectEvent((event: KeyboardEvent) => {
    if (event.code !== "Space" || isTypingOrOnAButton(event.target)) return;
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
  useEffect(() => () => listener.current?.abort(), []);

  return { isSupported, isListening, heardSoFar, problem, start, stop };
}

function isTypingOrOnAButton(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName);
}

const subscribeToNothing = () => () => {};
