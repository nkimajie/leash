"use client";

// Edit your spending rules: the leash every purchase and payment must pass.

import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { RuleSuggestion, SpendingRules } from "@/schemas";
import { fetchSpendingRules, saveSpendingRules, suggestRuleChanges } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextInput, Toggle } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";

type MoneyRule =
  "autoApproveLimit" | "defaultRequestBudget" | "maxItemPrice" | "maxPaymentPerPerson" | "dailyCap" | "weeklyCap";
type ListRule = "blockedCategories" | "allowedCategories" | "blockedMerchants" | "allowedMerchants";

const MONEY_RULES: { key: MoneyRule; label: string; hint: string }[] = [
  { key: "autoApproveLimit", label: "Pay without asking up to", hint: "Anything above this waits for your OK." },
  { key: "defaultRequestBudget", label: "Budget per request", hint: 'Used unless you say one, like "under $60".' },
  { key: "maxItemPrice", label: "Never buy one item over", hint: "Hard limit. Blocked, PayPal never called." },
  { key: "maxPaymentPerPerson", label: "Never send one person over", hint: "Hard limit for payments to people." },
  { key: "dailyCap", label: "Daily spending cap", hint: "Includes money reserved for approval." },
  { key: "weeklyCap", label: "Weekly spending cap", hint: "Rolling 7 days." },
];

const LIST_RULES: { key: ListRule; label: string; hint: string }[] = [
  { key: "blockedCategories", label: "Never buy these categories", hint: "Comma separated." },
  { key: "allowedCategories", label: "Only buy these categories", hint: "Leave empty to allow everything else." },
  { key: "blockedMerchants", label: "Never buy from these merchants", hint: "Comma separated." },
  { key: "allowedMerchants", label: "Only buy from these merchants", hint: "Leave empty to allow everyone else." },
];

export function RulesForm() {
  const [rules, setRules] = useState<SpendingRules | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpendingRules()
      .then(setRules)
      .catch(() => setError("Couldn't load your rules."));
  }, []);

  if (!rules) return <div className="p-8 text-sm text-stone-400">{error ?? "Loading…"}</div>;

  const change = (changes: Partial<SpendingRules>) => {
    setRules({ ...rules, ...changes });
    setStatus("idle");
  };

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      setRules(await saveSpendingRules(rules!));
      setStatus("saved");
    } catch (failure) {
      setError((failure as Error).message);
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Rules"
        description="The leash. Every purchase and payment is checked against these before PayPal is asked to move any money."
        action={
          <Button onClick={save} disabled={status === "saving"}>
            {status === "saved" ? <Check className="h-4 w-4" /> : null}
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save rules"}
          </Button>
        }
      />
      {error && <p className="whitespace-pre-line rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <RulesInYourWords
        onApply={async (proposed) => {
          setRules(await saveSpendingRules(proposed));
          setStatus("saved");
        }}
      />

      <Card>
        <CardHeader title="Money limits" description="In US dollars." />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {MONEY_RULES.map((rule) => (
            <Field key={rule.key} label={rule.label} hint={rule.hint}>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                  $
                </span>
                <TextInput
                  type="number"
                  min={1}
                  step="0.01"
                  value={rules[rule.key]}
                  onChange={(e) => change({ [rule.key]: Number(e.target.value) })}
                  className="pl-7 tabular-nums"
                />
              </div>
            </Field>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="People" />
        <div className="flex items-center justify-between gap-4 p-5">
          <div>
            <div className="text-sm font-medium text-stone-800">Always ask before paying someone new</div>
            <div className="text-xs text-stone-500">People not marked as trusted on the People page.</div>
          </div>
          <Toggle
            label="Always ask before paying someone new"
            checked={rules.newPeopleNeedApproval}
            onChange={(value) => change({ newPeopleNeedApproval: value })}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Categories and merchants" />
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          {LIST_RULES.map((rule) => (
            <Field key={rule.key} label={rule.label} hint={rule.hint}>
              <TextInput
                key={rules[rule.key].join(",")}
                defaultValue={rules[rule.key].join(", ")}
                onBlur={(e) => change({ [rule.key]: splitList(e.target.value) })}
                placeholder="e.g. alcohol, gift cards"
              />
            </Field>
          ))}
        </div>
      </Card>
    </div>
  );
}

const EXAMPLE_SENTENCE = "Ask me before anything over $30, never buy alcohol or snacks, and keep it under $100 a day";

/** Describe a rule in your own words; Claude suggests the change and you confirm it. */
function RulesInYourWords({ onApply }: { onApply: (proposed: SpendingRules) => Promise<void> }) {
  const [sentence, setSentence] = useState("");
  const [suggestion, setSuggestion] = useState<RuleSuggestion | null>(null);
  const [status, setStatus] = useState<"idle" | "thinking" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  async function suggest(text: string) {
    setStatus("thinking");
    setError(null);
    try {
      setSuggestion(await suggestRuleChanges(text));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setStatus("idle");
    }
  }

  async function apply() {
    if (!suggestion) return;
    setStatus("saving");
    try {
      await onApply(suggestion.proposed);
      setSuggestion(null);
      setSentence("");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <Card>
      <CardHeader
        title="Change the rules in your own words"
        description="Claude suggests the change. Nothing is saved until you confirm."
      />
      <form
        className="flex flex-col gap-3 p-5"
        onSubmit={(event) => {
          event.preventDefault();
          suggest(sentence);
        }}
      >
        <div className="flex gap-2">
          <TextInput
            value={sentence}
            onChange={(event) => setSentence(event.target.value)}
            placeholder={`e.g. “${EXAMPLE_SENTENCE}”`}
            className="flex-1"
          />
          <Button type="submit" variant="secondary" disabled={status !== "idle" || sentence.trim().length < 5}>
            <Sparkles className="h-4 w-4" />
            {status === "thinking" ? "Thinking…" : "Suggest"}
          </Button>
        </div>
        {!suggestion && (
          <button
            type="button"
            onClick={() => {
              setSentence(EXAMPLE_SENTENCE);
              suggest(EXAMPLE_SENTENCE);
            }}
            className="self-start text-xs text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-800"
          >
            Try an example
          </button>
        )}
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {suggestion && (
          <div className="rounded-xl bg-violet-50 p-4 text-sm text-violet-950">
            {suggestion.changes.length === 0 ? (
              <p>That wouldn&apos;t change any rule. Try saying it another way.</p>
            ) : (
              <>
                <p className="font-medium">These changes:</p>
                <ul className="mt-1 list-disc pl-5">
                  {suggestion.changes.map((change) => (
                    <li key={change}>{change}</li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button type="button" size="sm" onClick={apply} disabled={status !== "idle"}>
                    {status === "saving" ? "Saving…" : "Apply and save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </form>
    </Card>
  );
}

const splitList = (text: string) =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
