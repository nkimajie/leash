"use client";

// Your leash, People: who Leash can pay. Trusted people can be paid without asking (within your
// limits); everyone else always waits for your okay. Real money needs their PayPal email.

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Payee } from "@/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextInput } from "@/components/ui/form-fields";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { addPayee, fetchPayees, removePayee, updatePayee } from "@/lib/api-client";

const TRUST_CHOICES = [
  { value: "trusted", label: "Trusted" },
  { value: "ask", label: "Ask first" },
];

export function PeopleManager() {
  const [people, setPeople] = useState<Payee[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const reload = useCallback(async () => setPeople(await fetchPayees()), []);
  useEffect(() => {
    const firstLoad = setTimeout(() => reload().catch(() => setProblem("Couldn't load your people.")), 0);
    return () => clearTimeout(firstLoad);
  }, [reload]);

  /** Runs a change and reloads. False when it failed (the problem is shown). */
  async function attempt(work: () => Promise<unknown>): Promise<boolean> {
    setProblem(null);
    try {
      await work();
      await reload();
      return true;
    } catch (error) {
      setProblem((error as Error).message);
      return false;
    }
  }

  return (
    <>
      <p className="-mt-2 max-w-xl text-base text-ink-soft">
        Choose who can be paid without asking. Your hard limit still applies.
      </p>
      {problem && <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">{problem}</p>}
      <Card className="max-w-[720px]">
        <CardHeader title="People you pay" />
        <ul className="flex flex-col">
          {people.map((person) => (
            <li key={person.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-base">{person.name}</div>
                <div className="text-xs text-ink-soft">
                  {person.note ?? (person.trusted ? "A familiar face" : "New person")}
                  {" · "}
                  <EmailEditor
                    email={person.email}
                    onSave={async (email) => {
                      await attempt(() => updatePayee(person.id, { email }));
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Segmented
                  label={`Pay ${person.name} without asking?`}
                  options={TRUST_CHOICES}
                  value={person.trusted ? "trusted" : "ask"}
                  onChange={(choice) => attempt(() => updatePayee(person.id, { trusted: choice === "trusted" }))}
                  className="w-[224px] sm:w-[256px]"
                />
                <button
                  aria-label={`Remove ${person.name}`}
                  onClick={() => window.confirm(`Remove ${person.name}?`) && attempt(() => removePayee(person.id))}
                  className="grid h-11 w-11 place-items-center rounded-xl text-ink-soft hover:bg-paper hover:text-ink"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Button variant="secondary" className="max-w-[720px]" onClick={() => setIsAdding(true)}>
        + Add someone
      </Button>
      <AddSomeoneSheet
        open={isAdding}
        onClose={() => setIsAdding(false)}
        onAdd={async (details) => {
          if (await attempt(() => addPayee(details))) setIsAdding(false); // stays open if it failed
        }}
      />
    </>
  );
}

function AddSomeoneSheet({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (details: { name: string; email: string | null; note: string | null; trusted: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [trusted, setTrusted] = useState(false);

  return (
    <Sheet open={open} onClose={onClose} title="Add someone" close="text">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          await onAdd({ name, email: email || null, note: note || null, trusted });
          setName("");
          setEmail("");
          setNote("");
          setTrusted(false);
        }}
      >
        <Field label="Name">
          <TextInput
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sam Rivera"
            className="bg-white"
          />
        </Field>
        <Field label="PayPal email" hint="Needed before real money can be sent.">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sam@example.com"
            className="bg-white"
          />
        </Field>
        <Field label="Who they are">
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Roommate"
            className="bg-white"
          />
        </Field>
        <Segmented
          label="Pay without asking?"
          options={TRUST_CHOICES}
          value={trusted ? "trusted" : "ask"}
          onChange={(choice) => setTrusted(choice === "trusted")}
        />
        <Button type="submit" disabled={!name.trim()}>
          Add {name.trim() || "them"}
        </Button>
      </form>
    </Sheet>
  );
}

/** Shows a person's PayPal email; tap it to change it. */
function EmailEditor({ email, onSave }: { email: string | null; onSave: (email: string | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-leash">
        {email ?? "Add PayPal email"}
      </button>
    );
  }
  return (
    <input
      type="email"
      autoFocus
      defaultValue={email ?? ""}
      aria-label="PayPal email"
      onBlur={async (event) => {
        await onSave(event.target.value.trim() || null);
        setEditing(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") setEditing(false);
      }}
      className="h-7 w-56 rounded-md border border-leash-rim bg-white px-2 text-xs outline-none"
    />
  );
}
