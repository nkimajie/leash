"use client";

// Connect your PayPal account once. After that the assistant can pay within your rules
// without a PayPal popup each time, and anything outside them waits for your OK.

import { CheckCircle2, Link2, ShieldCheck, Unlink } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { PayPalConnection } from "@/schemas";
import { disconnectPayPal, fetchPayPalConnection, startConnectingPayPal } from "@/lib/api-client";
import { formatWhen } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const RESULT_MESSAGE: Record<string, { text: string; good: boolean }> = {
  connected: { text: "Your PayPal account is connected.", good: true },
  cancelled: { text: "You cancelled on PayPal, so nothing was connected.", good: false },
  failed: { text: "PayPal didn't finish connecting. Please try again.", good: false },
  "missing-approval": { text: "PayPal didn't send an approval back. Please try again.", good: false },
};

export function ConnectPayPal() {
  const result = RESULT_MESSAGE[useSearchParams().get("result") ?? ""];
  const [connection, setConnection] = useState<PayPalConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const firstLoad = setTimeout(
      () => fetchPayPalConnection().then(setConnection, () => setError("Couldn't check your PayPal account.")),
      0,
    );
    return () => clearTimeout(firstLoad);
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const { approvalUrl } = await startConnectingPayPal();
      window.location.href = approvalUrl; // PayPal's own page; it sends you back here afterwards
    } catch (failure) {
      setError((failure as Error).message);
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setConnection(await disconnectPayPal().finally(() => setBusy(false)));
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <PageHeader
        title="Connect PayPal"
        description="Connect once, and your assistant can pay with your PayPal without a popup each time. Your rules still decide every payment."
      />
      {result && (
        <p
          className={
            result.good
              ? "rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800"
              : "rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-800"
          }
        >
          {result.text}
        </p>
      )}
      {error && <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</p>}

      <Card className="p-6">
        {!connection ? (
          <p className="text-sm text-stone-500">Checking…</p>
        ) : connection.mode === "mock" ? (
          <Status
            icon={<ShieldCheck className="h-6 w-6 text-stone-500" />}
            title="Mock mode: payments are simulated"
            detail="No PayPal keys are set, so the app pretends to be PayPal. Add sandbox keys to connect a real sandbox account."
          />
        ) : connection.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Status
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              title={`Connected${connection.payerEmail ? ` as ${connection.payerEmail}` : ""}`}
              detail={`Saved with PayPal Vault ${connection.connectedAt ? formatWhen(connection.connectedAt) : ""}.`}
            />
            <Button variant="secondary" onClick={disconnect} disabled={busy}>
              <Unlink className="h-4 w-4" /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Status
              icon={<Link2 className="h-6 w-6 text-stone-500" />}
              title="Not connected yet"
              detail="Until you connect, the assistant can't pay for anything. You'll approve this on PayPal's own page."
            />
            <Button onClick={connect} disabled={busy}>
              {busy ? "Opening PayPal…" : "Connect PayPal"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-stone-900">How the leash works with PayPal</h2>
        <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm text-stone-600">
          <li>Within your rules: PayPal reserves the money, then takes it straight away.</li>
          <li>Outside your auto-approve limit, or someone new: PayPal reserves it and waits for you.</li>
          <li>You deny: PayPal releases the reservation. You are never charged.</li>
          <li>Blocked by a rule: PayPal is never called at all.</li>
        </ol>
      </Card>
    </div>
  );
}

function Status({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div>
        <div className="font-medium text-stone-900">{title}</div>
        <p className="mt-0.5 text-sm text-stone-500">{detail}</p>
      </div>
    </div>
  );
}
