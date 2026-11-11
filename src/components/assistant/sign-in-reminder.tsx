"use client";

// On Ask, while you're looking around without signing in: Leash can't pay until you continue with PayPal.

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { useAccount } from "@/lib/use-account";

export function SignInReminder() {
  const { connection } = useAccount();
  if (!connection || connection.signedIn) return null;
  return (
    <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-medium">You&apos;re looking around</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Continue with PayPal so Leash knows who you are and can pay for you.
        </p>
      </div>
      <Link href="/welcome?step=how" className={buttonClasses("paypal")}>
        Continue with PayPal
      </Link>
    </Card>
  );
}
