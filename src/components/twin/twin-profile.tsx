"use client";

// Your digital twin: what the assistant knows about your taste. It learns on its own from
// every approve, deny and refund, and you can teach it or make it forget things here.

import { Heart, Plus, Sparkles, ThumbsDown, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Preference } from "@/schemas";
import { addPreference, fetchPreferences, removePreference } from "@/lib/api-client";
import { classNames, formatWhen } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, SelectInput, TextInput } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";

export function TwinProfile() {
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => setPreferences(await fetchPreferences()), []);
  useEffect(() => {
    const firstLoad = setTimeout(() => reload().catch(() => setError("Couldn't load your twin.")), 0);
    const timer = setInterval(() => reload().catch(() => {}), 3000); // picks up new lessons
    return () => {
      clearTimeout(firstLoad);
      clearInterval(timer);
    };
  }, [reload]);

  async function attempt(work: () => Promise<unknown>) {
    setError(null);
    try {
      await work();
      await reload();
    } catch (failure) {
      setError((failure as Error).message);
    }
  }

  const likes = preferences.filter((p) => p.sentiment === "likes");
  const avoids = preferences.filter((p) => p.sentiment === "avoids");
  const learnedCount = preferences.filter((p) => p.source === "learned").length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Your twin"
        description="What your assistant knows about your taste. It learns from every approve, deny and refund, so it shops more like you over time."
      />
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-violet-50 to-white px-5 py-4 ring-1 ring-violet-100">
        <Sparkles className="h-5 w-5 text-violet-600" />
        <p className="text-sm text-stone-700">
          <span className="font-semibold">
            {learnedCount} {learnedCount === 1 ? "thing" : "things"} learned
          </span>{" "}
          from your decisions, plus {preferences.length - learnedCount} you told it directly.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PreferenceList
          title="Likes"
          icon={<Heart className="h-4 w-4 text-emerald-600" />}
          preferences={likes}
          onForget={(id) => attempt(() => removePreference(id))}
        />
        <PreferenceList
          title="Avoids"
          icon={<ThumbsDown className="h-4 w-4 text-rose-600" />}
          preferences={avoids}
          onForget={(id) => attempt(() => removePreference(id))}
        />
      </div>

      <TeachTwinForm onTeach={(details) => attempt(() => addPreference(details))} />
    </div>
  );
}

function PreferenceList(props: {
  title: string;
  icon: React.ReactNode;
  preferences: Preference[];
  onForget: (id: string) => void;
}) {
  return (
    <Card>
      <CardHeader title={props.title} action={props.icon} />
      {props.preferences.length === 0 ? (
        <p className="px-5 py-6 text-sm text-stone-400">Nothing yet.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {props.preferences.map((preference) => (
            <li key={preference.id} className="group flex items-start gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-stone-800">{preference.statement}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={classNames(
                      "rounded-full px-2 py-0.5 font-medium",
                      preference.source === "learned" ? "bg-violet-100 text-violet-700" : "bg-stone-100 text-stone-600",
                    )}
                  >
                    {preference.source === "learned" ? "Learned" : "You said"}
                  </span>
                  {preference.category && <span className="text-stone-500">{preference.category}</span>}
                  <span className="text-stone-400">{formatWhen(preference.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => props.onForget(preference.id)}
                aria-label="Forget this"
                className="rounded-md p-1 text-stone-400 opacity-0 transition hover:bg-stone-100 hover:text-stone-700 group-hover:opacity-100 focus:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function TeachTwinForm({
  onTeach,
}: {
  onTeach: (details: { sentiment: "likes" | "avoids"; statement: string; category: string | null }) => Promise<void>;
}) {
  const [sentiment, setSentiment] = useState<"likes" | "avoids">("likes");
  const [statement, setStatement] = useState("");
  const [category, setCategory] = useState("");

  return (
    <Card>
      <CardHeader title="Teach your twin" description="Tell it something about your taste in plain English." />
      <form
        className="grid gap-4 p-5 sm:grid-cols-[140px_1fr_180px_auto] sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault();
          await onTeach({ sentiment, statement, category: category.trim() || null });
          setStatement("");
          setCategory("");
        }}
      >
        <Field label="You">
          <SelectInput value={sentiment} onChange={(e) => setSentiment(e.target.value as "likes" | "avoids")}>
            <option value="likes">Like</option>
            <option value="avoids">Avoid</option>
          </SelectInput>
        </Field>
        <Field label="What">
          <TextInput
            required
            minLength={3}
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            placeholder="Oat milk, not dairy"
          />
        </Field>
        <Field label="Category (optional)">
          <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="coffee" />
        </Field>
        <Button type="submit" disabled={statement.trim().length < 3}>
          <Plus className="h-4 w-4" />
          Teach
        </Button>
      </form>
    </Card>
  );
}
