"use client";

// The frame around every page except the phone approval screen and the welcome steps.
//   Desktop: a sidebar (Ask, Money, Your leash, Twin) and a top bar (where you are, settings,
//            notifications, your profile).
//   Phone:   the logo with notifications and profile on top, and four tabs at the bottom.

import { Bell, LinkIcon, MessageSquare, ReceiptText, Settings, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconButton } from "@/components/ui/button";
import { classNames } from "@/lib/format";
import { isLookingAround } from "@/lib/looking-around";
import { AccountProvider, useAccount } from "@/lib/use-account";
import { LiveDecisionsProvider, useLiveDecisions } from "@/lib/use-live-decisions";
import { HelpSheet } from "./help-sheet";
import { LeashLogo } from "./leash-logo";
import { NotificationsSheet } from "./notifications-sheet";
import { ProfileSheet } from "./profile-sheet";
import { SettingsSheet } from "./settings-sheet";

const TABS = [
  { href: "/", label: "Ask", short: "Ask", icon: MessageSquare },
  { href: "/money", label: "Money", short: "Money", icon: ReceiptText },
  { href: "/leash", label: "Your leash", short: "Leash", icon: LinkIcon },
  { href: "/twin", label: "Twin", short: "Twin", icon: Users },
];

type Panel = "notifications" | "profile" | "settings" | "help";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AccountProvider>
      <LiveDecisionsProvider>
        <Frame>{children}</Frame>
      </LiveDecisionsProvider>
    </AccountProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { connection } = useAccount();
  const { decisions } = useLiveDecisions();
  const [panel, setPanel] = useState<Panel | null>(null);

  // First visit: welcome, then sign in with PayPal (unless you chose to look around first).
  const needsWelcome = connection !== null && !connection.signedIn && !isLookingAround();
  useEffect(() => {
    if (needsWelcome) router.replace("/welcome");
  }, [needsWelcome, router]);

  const waiting = decisions.filter((d) => d.outcome === "held").length;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const here = TABS.find((tab) => isActive(tab.href)) ?? TABS[0];
  const open = (next: Panel) => () => setPanel(next);

  return (
    <div className="min-h-dvh lg:flex">
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col border-r border-hairline bg-white px-4 py-8 lg:flex">
        <div className="px-0">
          <LeashLogo />
          <p className="mt-6 text-[13px] text-ink-soft">Your personal assistant</p>
        </div>
        <nav className="mt-10 flex flex-col gap-2">
          {TABS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={classNames(
                "flex h-12 items-center gap-3 rounded-2xl px-3 text-base transition-colors",
                isActive(href) ? "bg-leash-wash text-leash" : "text-ink hover:bg-paper",
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.5} />
              <span className="flex-1">{label}</span>
              {href === "/money" && waiting > 0 && <CountBadge count={waiting} />}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          <PayPalCard />
          <button onClick={open("settings")} className="h-12 rounded-2xl text-base hover:bg-paper">
            Settings
          </button>
          <button onClick={open("help")} className="h-12 rounded-2xl text-base hover:bg-paper">
            Help &amp; support
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-20 items-center justify-between border-b border-hairline bg-white px-10 lg:flex">
          <div className="text-base">
            <span className="text-ink-soft">Personal workspace</span>
            <span className="mx-4 text-ink-soft">/</span>
            <span>{here.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <FirstName />
            <IconButton onClick={open("settings")} aria-label="Settings">
              <Settings className="h-[22px] w-[22px]" strokeWidth={1.375} />
            </IconButton>
            <BellButton waiting={waiting} onClick={open("notifications")} />
            <IconButton onClick={open("profile")} aria-label="Your profile">
              <UserRound className="h-[22px] w-[22px]" strokeWidth={1.375} />
            </IconButton>
          </div>
        </header>

        {/* Phone header */}
        <header className="flex items-center justify-between px-5 pt-4 pb-2 lg:hidden">
          <LeashLogo size="compact" />
          <div className="flex items-center gap-2">
            <BellButton waiting={waiting} onClick={open("notifications")} />
            <IconButton onClick={open("profile")} aria-label="Your profile">
              <UserRound className="h-[22px] w-[22px]" strokeWidth={1.375} />
            </IconButton>
          </div>
        </header>

        <main className="flex flex-1 flex-col pb-32 lg:pb-0">{children}</main>
      </div>

      {/* Phone tabs */}
      <nav className="fixed inset-x-5 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 grid grid-cols-4 gap-1 rounded-[24px] border border-hairline bg-white p-1.5 shadow-[0_8px_24px_rgba(20,19,15,0.08)] lg:hidden">
        {TABS.map(({ href, short, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={classNames(
              "flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs",
              isActive(href) ? "bg-leash-wash text-leash" : "text-ink-soft",
            )}
          >
            <span className="flex items-center gap-1">
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              {href === "/money" && waiting > 0 && <CountBadge count={waiting} round />}
            </span>
            {short}
          </Link>
        ))}
      </nav>

      <NotificationsSheet open={panel === "notifications"} onClose={() => setPanel(null)} />
      <ProfileSheet open={panel === "profile"} onClose={() => setPanel(null)} />
      <SettingsSheet open={panel === "settings"} onClose={() => setPanel(null)} />
      <HelpSheet open={panel === "help"} onClose={() => setPanel(null)} />
    </div>
  );
}

/** The count stays neutral (ink), so it never looks like a money state. */
function CountBadge({ count, round = false }: { count: number; round?: boolean }) {
  return (
    <span
      className={classNames(
        "grid h-6 min-w-6 place-items-center bg-ink px-1.5 font-mono text-xs text-white",
        round ? "h-5 min-w-5 rounded-full px-1" : "rounded-md",
      )}
      aria-label={`${count} waiting for you`}
    >
      {count}
    </span>
  );
}

function BellButton({ waiting, onClick }: { waiting: number; onClick: () => void }) {
  return (
    <IconButton onClick={onClick} aria-label={waiting ? `Notifications: ${waiting} waiting for you` : "Notifications"}>
      <Bell className="h-[22px] w-[22px]" strokeWidth={1.375} />
      {waiting > 0 && <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-leash" />}
    </IconButton>
  );
}

function FirstName() {
  const { firstName } = useAccount();
  return firstName ? <span className="mr-2 text-base">{firstName}</span> : null;
}

/** Bottom of the sidebar: is PayPal connected? */
function PayPalCard() {
  const { connection } = useAccount();
  if (!connection) return null;
  return connection.signedIn ? (
    <Link href="/leash/paypal" className="rounded-2xl bg-paper px-3 py-3">
      <div className="text-sm font-medium">PayPal connected</div>
      <div className="mt-0.5 text-sm text-ink-soft">Your rules come first.</div>
    </Link>
  ) : (
    <Link href="/welcome" className="rounded-2xl bg-paper px-3 py-3">
      <div className="text-sm font-medium">Not signed in</div>
      <div className="mt-0.5 text-sm text-leash">Continue with PayPal</div>
    </Link>
  );
}
