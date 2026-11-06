"use client";

import { LayoutGrid, MessageSquareText, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { classNames } from "@/lib/format";
import { LeashLogo } from "./leash-logo";
import { ServiceStatus } from "./service-status";

const NAVIGATION = [
  { href: "/", label: "Assistant", icon: MessageSquareText },
  { href: "/control-room", label: "Control room", icon: LayoutGrid },
  { href: "/people", label: "People", icon: Users },
  { href: "/twin", label: "Your twin", icon: Sparkles },
  { href: "/rules", label: "Rules", icon: ShieldCheck },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      {/* Sidebar on large screens */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-stone-200 bg-white lg:flex">
        <div className="px-5 py-5">
          <LeashLogo />
        </div>
        <nav className="flex flex-col gap-0.5 px-3">
          {NAVIGATION.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={classNames(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                isActive(href)
                  ? "bg-stone-100 font-medium text-stone-900"
                  : "text-stone-600 hover:bg-stone-50 hover:text-stone-900",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={isActive(href) ? 2.25 : 1.75} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-stone-100 px-5 py-4">
          <ServiceStatus />
        </div>
      </aside>

      {/* Top bar on phones and tablets */}
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <LeashLogo />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {NAVIGATION.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={classNames(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs",
                isActive(href) ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
