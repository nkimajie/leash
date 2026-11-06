"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeBadges } from "./ModeBadges";

const LINKS = [
  { href: "/", label: "Agent" },
  { href: "/control-room", label: "Control room" },
];

export function Nav() {
  const path = usePathname();
  if (path.startsWith("/approve")) return null; // the phone approval screen stands alone

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-stone-900 text-sm text-white">L</span>
          Leash
        </Link>
        <nav className="flex gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-md px-3 py-1.5 ${path === l.href ? "bg-stone-100 font-medium text-stone-900" : "text-stone-600 hover:text-stone-900"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <ModeBadges />
        </div>
      </div>
    </header>
  );
}
