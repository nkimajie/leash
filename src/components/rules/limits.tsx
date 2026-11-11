"use client";

// Your leash, Limits: the rules every purchase and payment must pass before PayPal is asked to
// move any money. Change them by tapping, or in your own words (Claude suggests the change).

import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { RuleSuggestion, SpendingRules } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, WashCard } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Confirmation } from "@/components/ui/confirmation";
import { EditableAmount } from "@/components/ui/editable-amount";
import { Field, TextInput } from "@/components/ui/form-fields";
import { Illustration } from "@/components/ui/illustration";
import { LeashMeter } from "@/components/ui/leash-meter";
import { Segmented } from "@/components/ui/segmented";
import { fetchSpendingRules, saveSpendingRules, suggestRuleChanges } from "@/lib/api-client";
import { formatShortMoney } from "@/lib/format";

type CapRule = "defaultRequestBudget" | "maxPaymentPerPerson" | "dailyCap" | "weeklyCap";
type ListRule = "allowedCategories" | "blockedMerchants" | "allowedMerchants";

const WITHOUT_ASKING_CHOICES = [20, 50, 100].map((amount) => ({ value: amount, label: `$${amount}` }));

const CAPS: { key: CapRule; label: string; hint: string }[] = [
  { key: "defaultRequestBudget", label: "Budget per request", hint: 'Unless you say one, like "under $60".' },
  { key: "maxPaymentPerPerson", label: "Most to one person", hint: "Hard limit for paying people." },
  { key: "dailyCap", label: "Daily cap", hint: "Money reserved for your okay counts too." },
  { key: "weeklyCap", label: "Weekly cap", hint: "The last 7 days." },
];

const LISTS: { key: ListRule; label: string; hint: string }[] = [
  { key: "allowedCategories", label: "Only buy these categories", hint: "Empty allows every category." },
  { key: "blockedMerchants", label: "Never buy from", hint: "Stores, comma separated." },
  { key: "allowedMerchants", label: "Only buy from", hint: "Empty allows every store." },
];

/** Offered as chips on Never buy, alongside whatever you've added. */
const COMMON_NEVER_BUY = ["alcohol", "tobacco", "gift cards", "weapons"];

export function Limits() {
  const [saved, setSaved] = useState<SpendingRules | null>(null);
  const [rules, setRules] = useState<SpendingRules | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    fetchSpendingRules().then(
      (loaded) => {
        setSaved(loaded);
        setRules(loaded);
      },
      () => setProblem("Couldn't load your rules."),
    );
  }, []);

  if (!rules || !saved) return <p className="text-sm text-ink-soft">{problem ?? "Loading your leash…"}</p>;

  const change = (changes: Partial<SpendingRules>) => setRules({ ...rules, ...changes });
  const hasChanges = JSON.stringify(rules) !== JSON.stringify(saved);

  async function save(next: SpendingRules) {
    setIsSaving(true);
    setProblem(null);
    try {
      const stored = await saveSpendingRules(next);
      setSaved(stored);
      setRules(stored);
      setShowSaved(true);
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const neverBuy = [...new Set([...rules.blockedCategories, ...COMMON_NEVER_BUY, ...saved.blockedCategories])];
  const toggleNeverBuy = (category: string) =>
    change({
      blockedCategories: rules.blockedCategories.includes(category)
        ? rules.blockedCategories.filter((c) => c !== category)
        : [...rules.blockedCategories, category],
    });

  return (
    <>
      <RulesInYourWords onSuggested={(proposed) => change(proposed)} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8">
        <div className="flex flex-col gap-6 lg:gap-8">
          <Card>
            <CardHeader title="Spending rules" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <div>
                <Segmented
                  label="Pay without asking up to"
                  options={WITHOUT_ASKING_CHOICES}
                  value={
                    WITHOUT_ASKING_CHOICES.some((c) => c.value === rules.autoApproveLimit)
                      ? rules.autoApproveLimit
                      : null
                  }
                  onChange={(autoApproveLimit) => change({ autoApproveLimit })}
                  mono
                />
                <div className="mt-6">
                  <LeashMeter withoutAsking={rules.autoApproveLimit} hardLimit={rules.maxItemPrice} />
                </div>
                <p className="mt-3 font-mono text-sm">
                  {formatShortMoney(rules.autoApproveLimit)} without asking · {formatShortMoney(rules.maxItemPrice)}{" "}
                  hard limit
                </p>
                <p className="mt-5 text-sm text-ink-soft">
                  Small, expected purchases go through. Anything else waits for your okay.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-ink-soft">Without asking</div>
                    <EditableAmount
                      label="Without asking"
                      value={rules.autoApproveLimit}
                      onChange={(autoApproveLimit) => change({ autoApproveLimit })}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-ink-soft">Hard limit</div>
                    <EditableAmount
                      label="Hard limit"
                      value={rules.maxItemPrice}
                      onChange={(maxItemPrice) => change({ maxItemPrice })}
                    />
                  </div>
                </div>
              </div>
              <div className="hidden place-items-center rounded-[20px] border border-leash-rim bg-leash-wash lg:grid">
                <Illustration name="boundary-held" className="w-56" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Spending caps" description="The most Leash may spend, however it's asked." />
            <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              {CAPS.map(({ key, label, hint }) => (
                <div key={key}>
                  <dt className="text-sm">{label}</dt>
                  <dd>
                    <EditableAmount label={label} value={rules[key]} onChange={(amount) => change({ [key]: amount })} />
                    <div className="text-xs text-ink-soft">{hint}</div>
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:gap-8">
          <Card>
            <CardHeader title="Never buy" />
            <div className="flex flex-wrap gap-2">
              {neverBuy.map((category) => (
                <Chip
                  key={category}
                  on={rules.blockedCategories.includes(category)}
                  onClick={() => toggleNeverBuy(category)}
                >
                  {category[0].toUpperCase() + category.slice(1)}
                </Chip>
              ))}
              <AddCategoryChip
                onAdd={(category) => change({ blockedCategories: [...rules.blockedCategories, category] })}
              />
            </div>
          </Card>
          <WashCard>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">A boundary that stays put.</h2>
            <p className="mt-4 text-base text-ink-soft">
              Paying someone new always waits for you. Your hard limit still applies.
            </p>
          </WashCard>
          <Card>
            <CardHeader title="Stores and categories" />
            <div className="flex flex-col gap-4">
              {LISTS.map(({ key, label, hint }) => (
                <Field key={key} label={label} hint={hint}>
                  <TextInput
                    key={rules[key].join(",")}
                    defaultValue={rules[key].join(", ")}
                    onBlur={(event) => change({ [key]: splitList(event.target.value) })}
                    placeholder="e.g. groceries, pets"
                  />
                </Field>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {problem && (
        <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm whitespace-pre-line text-failed">{problem}</p>
      )}

      {hasChanges && (
        <div className="sticky bottom-28 z-10 flex items-center justify-between gap-3 rounded-[20px] border border-hairline bg-white p-3 pl-5 shadow-[0_8px_24px_rgba(20,19,15,0.08)] lg:bottom-6">
          <span className="text-sm">You have changes to your leash.</span>
          <div className="flex gap-2">
            <Button variant="text" size="sm" onClick={() => setRules(saved)}>
              Undo
            </Button>
            <Button size="sm" disabled={isSaving} onClick={() => save(rules)}>
              {isSaving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}

      <Confirmation
        open={showSaved}
        onClose={() => setShowSaved(false)}
        illustration="boundary-held"
        title="Your leash is updated."
        text="Your new limits are set. You can change them whenever you like."
      />
    </>
  );
}

function AddCategoryChip({ onAdd }: { onAdd: (category: string) => void }) {
  const [adding, setAdding] = useState(false);
  if (!adding) {
    return (
      <Chip adds onClick={() => setAdding(true)}>
        Add
      </Chip>
    );
  }
  return (
    <input
      autoFocus
      placeholder="e.g. energy drinks"
      aria-label="Never buy"
      onBlur={(event) => {
        const category = event.target.value.trim().toLowerCase();
        if (category) onAdd(category);
        setAdding(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setAdding(false);
      }}
      className="h-11 w-44 rounded-full border border-leash-rim bg-white px-4 text-sm outline-none"
    />
  );
}

const EXAMPLE_SENTENCE = "Ask me before anything over $30, never buy alcohol or snacks, and keep it under $100 a day";

/** Describe a change in your own words; Claude suggests it, and nothing is saved until you do. */
function RulesInYourWords({ onSuggested }: { onSuggested: (proposed: SpendingRules) => void }) {
  const [sentence, setSentence] = useState("");
  const [suggestion, setSuggestion] = useState<RuleSuggestion | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function suggest(text: string) {
    setIsThinking(true);
    setProblem(null);
    try {
      setSuggestion(await suggestRuleChanges(text));
    } catch (error) {
      setProblem((error as Error).message);
    } finally {
      setIsThinking(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          suggest(sentence);
        }}
        className="flex h-14 items-center gap-2 rounded-2xl border border-hairline bg-white pr-2 pl-4"
      >
        <input
          value={sentence}
          onChange={(event) => setSentence(event.target.value)}
          placeholder="Change it in your own words"
          aria-label="Change your rules in your own words"
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-soft"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={isThinking || sentence.trim().length < 5}>
          <Sparkles className="h-4 w-4" strokeWidth={1.5} />
          {isThinking ? "Reading…" : "Suggest"}
        </Button>
      </form>
      {!suggestion && (
        <button
          type="button"
          onClick={() => {
            setSentence(EXAMPLE_SENTENCE);
            suggest(EXAMPLE_SENTENCE);
          }}
          className="mt-2 ml-1 text-sm text-leash"
        >
          Try an example
        </button>
      )}
      {problem && <p className="mt-2 text-sm text-failed">{problem}</p>}
      {suggestion && (
        <WashCard className="mt-3">
          {suggestion.changes.length === 0 ? (
            <p className="text-sm">That wouldn&apos;t change any rule. Try saying it another way.</p>
          ) : (
            <>
              <p className="text-sm font-medium">Leash suggests:</p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {suggestion.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    onSuggested(suggestion.proposed);
                    setSuggestion(null);
                    setSentence("");
                  }}
                >
                  Use these
                </Button>
                <Button size="sm" variant="text" onClick={() => setSuggestion(null)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </WashCard>
      )}
    </div>
  );
}

const splitList = (text: string) =>
  text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
