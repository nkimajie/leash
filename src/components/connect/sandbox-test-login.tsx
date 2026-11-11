"use client";

// For testers and judges: the PayPal sandbox account to log in with on PayPal's page. Sandbox money is
// test money, never real. It's public on purpose, so it comes from NEXT_PUBLIC_ settings (set in
// .env.local and on Render), never from the code, and only shows when real PayPal sandbox is on.

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const EMAIL = process.env.NEXT_PUBLIC_SANDBOX_TEST_EMAIL;
const PASSWORD = process.env.NEXT_PUBLIC_SANDBOX_TEST_PASSWORD;
const PAYPAL_SANDBOX_IS_ON = Boolean(process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID);

export function SandboxTestLogin({ className = "" }: { className?: string }) {
  if (!EMAIL || !PASSWORD || !PAYPAL_SANDBOX_IS_ON) return null;
  return (
    <div className={`rounded-2xl border border-dashed border-ink-soft/40 bg-white/70 p-4 ${className}`}>
      <p className="text-sm font-medium">Testing Leash? Log in to PayPal with this sandbox account:</p>
      <dl className="mt-3 flex flex-col gap-2">
        <CopyRow label="Email" value={EMAIL} />
        <CopyRow label="Password" value={PASSWORD} />
      </dl>
      <p className="mt-3 text-xs text-ink-soft">PayPal&apos;s sandbox uses test money. Nothing real is ever charged.</p>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <dt className="w-[72px] shrink-0 text-xs text-ink-soft">{label}</dt>
      <dd className="min-w-0 flex-1 font-mono text-[13px] break-all">{value}</dd>
      <button
        type="button"
        onClick={() =>
          navigator.clipboard.writeText(value).then(
            () => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            },
            () => {},
          )
        }
        aria-label={`Copy the ${label.toLowerCase()}`}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 text-xs hover:bg-paper"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-paid" /> : <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
