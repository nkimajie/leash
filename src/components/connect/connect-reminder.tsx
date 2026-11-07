"use client";

// A reminder on the assistant page when PayPal is live but your account isn't connected yet.
// Shows nothing in mock mode or once you're connected.

import { Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchPayPalConnection } from "@/lib/api-client";

export function ConnectReminder() {
  const [needsConnecting, setNeedsConnecting] = useState(false);

  useEffect(() => {
    fetchPayPalConnection()
      .then((connection) => setNeedsConnecting(!connection.connected))
      .catch(() => {});
  }, []);

  if (!needsConnecting) return null;
  return (
    <Link
      href="/connect"
      className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
    >
      <Wallet className="h-4 w-4 shrink-0" />
      <span>
        <strong className="font-semibold">Connect your PayPal account</strong> so the assistant can pay. It takes one
        approval on PayPal.
      </span>
    </Link>
  );
}
