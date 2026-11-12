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
    utterance.rate = 0.98; // a touch calmer than the default
    voice.speak(utterance);
  }
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/**
 * Phones only let a page talk once it has spoken during a tap (iPhone Safari is the strictest), but
 * Leash's reply arrives seconds after you tap. So call this from a tap or key press: it says nothing,
 * silently, and the replies that follow are let through.
 */
export function unlockSpeech() {
  if (!canSpeak()) return;
  const silence = new SpeechSynthesisUtterance(" ");
  silence.volume = 0;
  window.speechSynthesis.speak(silence);
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

/**
 * The most human-sounding voice the browser has, best first:
 *   - neural voices: Edge's "Natural" ones (Ava, Andrew, Emma…), and macOS "Premium" or "Enhanced"
 *     voices (Ava, Zoe, Evan…) once downloaded in System Settings > Accessibility > Spoken Content
 *   - Chrome's online Google voice
 *   - Samantha, the standard iPhone and Mac voice (Apple also lists novelty voices like "Albert")
 *   - the older built-in voices last
 */
const MOST_NATURAL_FIRST = [
  /natural/i,
  /premium/i,
  /enhanced/i,
  /^Google US English/,
  /^Google UK English Female/,
  /^Samantha/,
];

function pickVoice(): SpeechSynthesisVoice | null {
  const english = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
  for (const pattern of MOST_NATURAL_FIRST) {
    const match = english.find((voice) => pattern.test(voice.name));
    if (match) return match;
  }
  return english.find((voice) => voice.default) ?? english[0] ?? null;
}
