"use client";

// People the assistant can pay. Trusted people can be paid without asking (within your limits);
// everyone else always waits for your approval.

import { Trash2, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Payee } from "@/schemas";
import { addPayee, fetchPayees, removePayee, updatePayee } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, TextInput, Toggle } from "@/components/ui/form-fields";
import { PageHeader } from "@/components/ui/page-header";

export function PeopleManager() {
  const [people, setPeople] = useState<Payee[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => setPeople(await fetchPayees()), []);
  useEffect(() => {
    const firstLoad = setTimeout(() => reload().catch(() => setError("Couldn't load your people.")), 0);
    return () => clearTimeout(firstLoad);
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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="People"
        description="Who your assistant can send money to. Trusted people can be paid without asking, up to your auto-approve limit. Anyone else always waits for you."
      />
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader title="Your people" description={`${people.length} people`} />
          <ul className="divide-y divide-stone-100">
            {people.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Avatar name={person.name} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{person.name}</div>
                  <div className="flex flex-wrap items-center gap-x-1 text-sm text-stone-500">
                    {person.note && <span>{person.note} ·</span>}
                    <EmailEditor
                      email={person.email}
                      onSave={(email) => attempt(() => updatePayee(person.id, { email }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  {person.trusted ? "Trusted" : "Always ask"}
                  <Toggle
                    label={`Trust ${person.name}`}
                    checked={person.trusted}
                    onChange={(trusted) => attempt(() => updatePayee(person.id, { trusted }))}
                  />
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  aria-label={`Remove ${person.name}`}
                  onClick={() => attempt(() => removePayee(person.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>

        <AddPersonForm onAdd={(details) => attempt(() => addPayee(details))} />
      </div>
    </div>
  );
}

function AddPersonForm({
  onAdd,
}: {
  onAdd: (details: { name: string; email: string | null; note: string | null; trusted: boolean }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [trusted, setTrusted] = useState(false);

  return (
    <Card>
      <CardHeader title="Add someone" />
      <form
        className="flex flex-col gap-4 p-5"
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
          <TextInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="Sam Rivera" />
        </Field>
        <Field label="PayPal email" hint="Needed before real money can be sent.">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sam@example.com"
          />
        </Field>
        <Field label="Who they are">
          <TextInput value={note} onChange={(e) => setNote(e.target.value)} placeholder="Roommate" />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-stone-800">Trusted</span>
          <Toggle label="Trusted" checked={trusted} onChange={setTrusted} />
        </div>
        <Button type="submit" disabled={!name.trim()}>
          <UserPlus className="h-4 w-4" />
          Add person
        </Button>
      </form>
    </Card>
  );
}

/** Shows a person's PayPal email; click it to change it. */
function EmailEditor({ email, onSave }: { email: string | null; onSave: (email: string | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(email ?? "");

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="truncate underline decoration-stone-300 underline-offset-2 hover:text-stone-800"
        title="Change PayPal email"
      >
        {email ?? "Add PayPal email"}
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        await onSave(value.trim() || null);
        setEditing(false);
      }}
    >
      <TextInput
        type="email"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-56 text-sm"
        placeholder="name@personal.example.com"
      />
      <Button type="submit" size="sm">
        Save
      </Button>
      <Button type="button" size="sm" variant="text" onClick={() => setEditing(false)}>
        Cancel
      </Button>
    </form>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700">
      {initials}
    </span>
  );
}
