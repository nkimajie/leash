"use client";

// "Your phone. Your say." A QR code that opens a purchase's approval screen on your phone
// (or, with nothing waiting, Leash itself).

import { QRCodeSVG } from "qrcode.react";
import type { Decision } from "@/schemas";
import { Illustration } from "@/components/ui/illustration";
import { Sheet } from "@/components/ui/sheet";

export function OpenOnPhoneSheet({
  open,
  onClose,
  decision,
}: {
  open: boolean;
  onClose: () => void;
  /** What to review on the phone; without one, the QR code opens Leash. */
  decision?: Decision | null;
}) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = decision ? `${origin}/approve/${decision.id}` : origin;
  const isLocal = origin.includes("localhost") || origin.includes("127.0.0.1");

  return (
    <Sheet open={open} onClose={onClose} title="Open on phone" close="text">
      <div className="grid place-items-center rounded-2xl border border-leash-rim bg-leash-wash">
        <Illustration name="phone-handoff" className="w-48" />
      </div>
      <h3 className="mt-6 text-center text-2xl font-semibold tracking-[-0.02em]">Your phone. Your say.</h3>
      <div className="mx-auto mt-5 w-fit rounded-2xl border border-hairline bg-white p-4">
        <QRCodeSVG value={link} size={176} marginSize={0} />
      </div>
      <p className="mt-5 text-center text-sm text-ink-soft">
        {decision
          ? `Scan with your phone's camera to review the ${decision.title.toLowerCase()}. Only your tap can release money.`
          : "Scan with your phone's camera to open Leash. Only your tap can release money."}
      </p>
      {isLocal && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          This is your own computer, so the code works once Leash is online.
        </p>
      )}
      {decision && (
        <a href={`/approve/${decision.id}`} target="_blank" className="mt-4 block text-center text-sm text-leash">
          Or open it here
        </a>
      )}
    </Sheet>
  );
}
