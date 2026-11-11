"use client";

// Your twin: what Leash knows about your taste. It learns from every approve, deny and refund (and
// your reasons), and you can teach it or make it forget things here.

import { ArrowDown, ArrowRight, Mic, Square } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Decision, Preference } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, WashCard } from "@/components/ui/card";
import { Confirmation } from "@/components/ui/confirmation";
import { Illustration } from "@/components/ui/illustration";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { addPreference, fetchPreferences, removePreference } from "@/lib/api-client";
import { useLiveDecisions } from "@/lib/use-live-decisions";
import { addWords, useVoiceInput } from "@/lib/use-voice-input";
import { inSentence } from "@/lib/format";

type Sentiment = Preference["sentiment"];

export function TwinProfile() {
  const { decisions } = useLiveDecisions();
  const [lessons, setLessons] = useState<Preference[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [justLearned, setJustLearned] = useState<string | null>(null);

  const reload = useCallback(async () => setLessons(await fetchPreferences()), []);
  useEffect(() => {
    const firstLoad = setTimeout(() => reload().catch(() => setProblem("Couldn't load your twin.")), 0);
    const timer = setInterval(() => reload().catch(() => {}), 3000); // picks up new lessons
    return () => {
      clearTimeout(firstLoad);
      clearInterval(timer);
    };
  }, [reload]);

  async function attempt(work: () => Promise<unknown>) {
    setProblem(null);
    try {
      await work();
      await reload();
    } catch (error) {
      setProblem((error as Error).message);
    }
  }

  const learned = lessons.filter((p) => p.source === "learned").length;
  const newestFirst = [...lessons].reverse();

  return (
    <Page>
      <PageHeader
        title="Your twin"
        description={`${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}: ${learned} from your decisions, ${lessons.length - learned} you told it.`}
      />
      <WashCard className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl leading-[26px] font-semibold sm:text-2xl">Your taste, remembered.</h2>
          <p className="mt-2 text-sm text-ink-soft sm:mt-4 sm:text-base">
            <span className="sm:hidden">Teach me once. I&apos;ll keep it in mind.</span>
            <span className="hidden sm:inline">
              A little feedback goes a long way. Every yes, no, and reason helps me shop more like you.
            </span>
          </p>
        </div>
        <Illustration name="lesson-saved" className="-my-6 w-24 shrink-0 sm:w-40" />
      </WashCard>

      {problem && <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">{problem}</p>}

      <TeachYourTwin
        onTeach={(sentiment, statement) =>
          attempt(() => addPreference({ sentiment, statement, category: null })).then(() => setJustLearned(statement))
        }
      />
      {lessons.length > 0 && (
        <a href="#lessons" className="-mt-2 inline-flex items-center gap-1 text-base text-leash">
          View all {lessons.length} lessons <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
        </a>
      )}

      <div id="lessons" className="grid scroll-mt-24 gap-6 lg:grid-cols-2 lg:gap-8">
        {(["avoids", "likes"] as const).map((sentiment) => (
          <Card key={sentiment}>
            <CardHeader title={sentiment === "avoids" ? "Avoids" : "Likes"} />
            <ul className="flex flex-col gap-6">
              {newestFirst
                .filter((lesson) => lesson.sentiment === sentiment)
                .map((lesson) => (
                  <li key={lesson.id}>
                    <p className="text-sm text-ink-soft">{whereItCameFrom(lesson, decisions)}</p>
                    <p className="mt-3 flex gap-2 text-base">
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                      {lesson.statement}
                    </p>
                    <button
                      onClick={() => attempt(() => removePreference(lesson.id))}
                      className="mt-3 text-sm text-ink-soft hover:text-ink"
                    >
                      Forget
                    </button>
                  </li>
                ))}
            </ul>
            {!lessons.some((lesson) => lesson.sentiment === sentiment) && (
              <p className="text-sm text-ink-soft">Nothing yet.</p>
            )}
          </Card>
        ))}
      </div>

      <Confirmation
        open={justLearned !== null}
        onClose={() => setJustLearned(null)}
        illustration="lesson-saved"
        title="Got it. I'll remember."
        text={`“${justLearned}” I'll keep that in mind next time.`}
      />
    </Page>
  );
}

/** "You denied the orthopedic dog bed." or "You said this." */
function whereItCameFrom(lesson: Preference, decisions: Decision[]): string {
  if (lesson.source === "you") return "You said this.";
  const decision = decisions.find((d) => d.id === lesson.learnedFromDecisionId);
  if (!decision) return "Learned from one of your decisions.";
  const what = inSentence(decision.title);
  if (decision.outcome === "denied") return `You denied the ${what}.`;
  if (decision.outcome === "refunded") return `You refunded the ${what}.`;
  return `You approved the ${what}.`;
}

const SENTIMENTS: { value: Sentiment; label: string }[] = [
  { value: "likes", label: "I like this" },
  { value: "avoids", label: "Avoid this" },
];

function TeachYourTwin({ onTeach }: { onTeach: (sentiment: Sentiment, statement: string) => Promise<void> }) {
  const [statement, setStatement] = useState("");
  const [sentiment, setSentiment] = useState<Sentiment>("likes");
  // Keeps listening through pauses until you tap stop, and adds to what's already in the box.
  const voice = useVoiceInput((heard) => setStatement((before) => addWords(before, heard)), true, {
    holdSpace: false,
    untilStopped: true,
  });

  async function save() {
    await onTeach(sentiment, statement.trim());
    setStatement("");
  }

  return (
    <Card>
      <CardHeader title="Teach your twin" />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (statement.trim().length >= 3) save();
        }}
        className="flex flex-col gap-3 lg:flex-row"
      >
        <input
          value={voice.isListening ? addWords(statement, voice.heardSoFar) : statement}
          onChange={(event) => setStatement(event.target.value)}
          readOnly={voice.isListening}
          placeholder={voice.isListening ? "Listening…" : "“I prefer things I can repair.”"}
          aria-label="Teach your twin"
          maxLength={200}
          className="h-14 min-w-0 flex-1 rounded-xl bg-paper px-5 text-base outline-none placeholder:text-ink-soft focus:ring-2 focus:ring-leash-wash"
        />
        {voice.isSupported && (
          <Button
            type="button"
            variant="secondary"
            className="lg:hidden"
            onClick={voice.isListening ? voice.stop : voice.start}
          >
            {voice.isListening ? <Square className="h-4 w-4" /> : <Mic className="h-5 w-5" strokeWidth={1.5} />}
            {voice.isListening ? "Stop listening" : "Say it instead"}
          </Button>
        )}
        <Button type="submit" className="h-14 lg:w-[244px]" disabled={statement.trim().length < 3}>
          Save lesson
        </Button>
      </form>
      <Segmented
        label="Is this something you like, or something to avoid?"
        options={SENTIMENTS}
        value={sentiment}
        onChange={setSentiment}
        className="mt-3 max-w-sm"
      />
    </Card>
  );
}
