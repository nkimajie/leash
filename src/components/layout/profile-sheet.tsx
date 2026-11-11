"use client";

// Your profile: your name and email from PayPal, and signing out (which forgets your PayPal account).

import { UserRound, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { disconnectPayPal } from "@/lib/api-client";
import { useAccount } from "@/lib/use-account";
import { NotificationPreferencesSheet } from "./notification-preferences-sheet";

export function ProfileSheet({
  open,
  onClose,
  onOpenSettings,
  onOpenHelp,
}: {
  open: boolean;
  onClose: () => void;
  /** Phones have no sidebar, so Settings (and Reset demo) and Help live here too. */
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}) {
  const router = useRouter();
  const { connection, refresh } = useAccount();
  const [editingNotifications, setEditingNotifications] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const signOut = async () => {
    try {
      await disconnectPayPal();
      await refresh();
      onClose();
      router.push("/welcome");
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't sign out.");
    }
  };

  const item = "flex h-14 w-full items-center justify-center rounded-xl text-base hover:bg-paper";
  return (
    <>
      <Sheet open={open} onClose={onClose} close="none" white>
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] border border-hairline">
            <UserRound className="h-[22px] w-[22px]" strokeWidth={1.375} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xl font-medium">{connection?.payerName ?? "Not signed in"}</div>
            {connection?.payerEmail && <div className="truncate text-sm text-ink-soft">{connection.payerEmail}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-hairline"
          >
            <X className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </div>
        <p className="mt-5 text-sm text-ink-soft">Personal workspace</p>
        <nav className="mt-3 flex flex-col">
          <Link href="/leash" onClick={onClose} className={item}>
            Your leash
          </Link>
          <button onClick={() => setEditingNotifications(true)} className={item}>
            Notification settings
          </button>
          <button onClick={onOpenSettings} className={item}>
            Settings
          </button>
          <button onClick={onOpenHelp} className={item}>
            Help &amp; support
          </button>
          {connection?.signedIn ? (
            <button onClick={signOut} disabled={!connection.canDisconnect} className={`${item} disabled:opacity-50`}>
              Sign out
            </button>
          ) : (
            <Link href="/welcome?step=how" onClick={onClose} className={`${item} text-leash`}>
              Continue with PayPal
            </Link>
          )}
        </nav>
        {connection?.signedIn && !connection.canDisconnect && (
          <p className="mt-2 text-center text-xs text-ink-soft">Signing out is off in the public demo.</p>
        )}
        {problem && <p className="mt-2 text-center text-sm text-failed">{problem}</p>}
      </Sheet>
      <NotificationPreferencesSheet open={editingNotifications} onClose={() => setEditingNotifications(false)} />
    </>
  );
}
