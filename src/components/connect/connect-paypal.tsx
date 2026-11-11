"use client";

// Your leash, PayPal: who you're signed in as, and how the leash works with PayPal.
// Signing in is connecting your PayPal account once (PayPal Vault). After that Leash pays within
// your rules without a PayPal popup each time, and anything outside them waits for your okay.

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Stamp } from "@/components/ui/stamp";
import { disconnectPayPal, startConnectingPayPal } from "@/lib/api-client";
import { formatReceiptTime } from "@/lib/format";
import { useAccount } from "@/lib/use-account";

const RESULT_MESSAGE: Record<string, { text: string; good: boolean }> = {
  connected: { text: "Your PayPal account is connected.", good: true },
  cancelled: { text: "You cancelled on PayPal, so nothing was connected.", good: false },
  failed: { text: "PayPal didn't finish connecting. Please try again.", good: false },
  "missing-approval": { text: "PayPal didn't send an approval back. Please try again.", good: false },
};

export function ConnectPayPal() {
  const router = useRouter();
  const result = RESULT_MESSAGE[useSearchParams().get("result") ?? ""];
  const { connection, refresh } = useAccount();
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function connect() {
    setIsBusy(true);
    setProblem(null);
    try {
      const { approvalUrl } = await startConnectingPayPal("paypal");
      window.location.href = approvalUrl; // PayPal's own page; it sends you back here afterwards
    } catch (error) {
      setProblem((error as Error).message);
      setIsBusy(false);
    }
  }

  async function signOut() {
    setIsBusy(true);
    try {
      await disconnectPayPal();
      await refresh();
      router.push("/welcome");
    } catch (error) {
      setProblem((error as Error).message);
      setIsBusy(false);
    }
  }

  return (
    <>
      {result && (
        <p
          className={`rounded-xl px-4 py-3 text-sm ${result.good ? "bg-paid-wash text-paid" : "bg-reserved-wash text-reserved"}`}
        >
          {result.text}
        </p>
      )}
      {problem && <p className="rounded-xl bg-failed-wash px-4 py-3 text-sm text-failed">{problem}</p>}

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Card>
          {!connection ? (
            <p className="text-sm text-ink-soft">Checking…</p>
          ) : connection.signedIn ? (
            <>
              <CardHeader title="PayPal connected" description="Your rules come first." />
              <div className="text-lg">{connection.payerName ?? "Your PayPal account"}</div>
              {connection.payerEmail && <div className="text-sm text-ink-soft">{connection.payerEmail}</div>}
              <p className="mt-3 font-mono text-xs text-ink-soft">
                {connection.mode === "mock"
                  ? "Mock mode · payments are simulated"
                  : `Saved with PayPal Vault${connection.connectedAt ? ` · ${formatReceiptTime(connection.connectedAt)}` : ""}`}
              </p>
              {connection.canDisconnect ? (
                <Button variant="secondary" className="mt-6 w-full" onClick={signOut} disabled={isBusy}>
                  Sign out
                </Button>
              ) : (
                <p className="mt-6 text-xs text-ink-soft">Signing out is off in the public demo.</p>
              )}
            </>
          ) : (
            <>
              <CardHeader
                title="Not connected yet"
                description="Until you continue with PayPal, Leash can't pay for anything. You approve it on PayPal's own page, once."
              />
              <Button variant="paypal" className="w-full" onClick={connect} disabled={isBusy}>
                {isBusy ? "Opening PayPal…" : "Continue with PayPal"}
              </Button>
            </>
          )}
        </Card>

        <Card>
          <CardHeader title="How the leash works with PayPal" />
          <ul className="flex flex-col gap-4">
            <HowItWorks tone="paid" stamp="Paid" text="Within your rules: PayPal reserves the money, then takes it straight away." />
            <HowItWorks tone="reserved" stamp="Reserved" text="Bigger, or someone new: PayPal reserves it and waits for your okay." />
            <HowItWorks tone="released" stamp="Released" text="You say no: PayPal releases it. You are never charged." />
            <HowItWorks tone="blocked" stamp="Blocked" text="Over a hard limit: PayPal is never called at all." />
          </ul>
        </Card>
      </div>
    </>
  );
}

function HowItWorks({ tone, stamp, text }: { tone: "paid" | "reserved" | "released" | "blocked"; stamp: string; text: string }) {
  return (
    <li className="grid grid-cols-[96px_1fr] items-start gap-3">
      <span>
        <Stamp tone={tone} size="compact">
          {stamp}
        </Stamp>
      </span>
      <span className="text-sm">{text}</span>
    </li>
  );
}
