"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { classNames } from "@/lib/format";

const TABS = [
  { href: "/leash", label: "Limits" },
  { href: "/leash/people", label: "People" },
  { href: "/leash/restocks", label: "Restocks" },
  { href: "/leash/paypal", label: "PayPal" },
  { href: "/leash/agents", label: "Agents" },
];

export function LeashTabs() {
  const pathname = usePathname();
  // On a phone the tabs scroll sideways: keep the one you're on in view.
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    nav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return (
    <nav ref={nav} className="-mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0" aria-label="Your leash">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={classNames(
            "flex h-12 shrink-0 items-center rounded-xl border px-5 text-base transition-colors",
            pathname === href
              ? "border-leash-rim bg-leash-wash text-leash"
              : "border-transparent text-ink hover:bg-white",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
