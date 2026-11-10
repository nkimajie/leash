// Leash's voice. The browser's own text-to-speech reads replies aloud: no keys, no extra service.

const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

/**
 * Says something out loud, one sentence at a time (Chrome cuts off long utterances).
 * `ifQuiet` skips it while Leash is still talking, so the running commentary never lags
 * behind what's happening. Replies leave it off, so they're always heard.
 */
export function speak(text: string, { ifQuiet = false } = {}) {
  if (!canSpeak()) return;
  const voice = window.speechSynthesis;
  if (ifQuiet && (voice.speaking || voice.pending)) return;
  for (const sentence of forListening(text).split(/(?<=[.!?])\s+/)) {
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.voice = pickVoice();
    voice.speak(utterance);
  }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/** "$14.00" sounds better as "$14", and bullets and quote marks aren't read out. */
function forListening(text: string): string {
  return text
    .replace(/\$(\d+)\.00\b/g, "$$$1")
    .replace(/[•“”"]/g, "")
    .replace(/([^.!?:])\n+/g, "$1. ")
    .replace(/\s+/g, " ")
    .trim();
}

const PREFERRED_VOICES = ["Samantha", "Google US English", "Microsoft Aria", "Karen", "Daniel"];

function pickVoice(): SpeechSynthesisVoice | null {
  const english = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
  for (const name of PREFERRED_VOICES) {
    const match = english.find((voice) => voice.name.includes(name));
    if (match) return match;
  }
  return english[0] ?? null;
}
