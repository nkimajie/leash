"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/format";

const TABS = [
  { href: "/leash", label: "Limits" },
  { href: "/leash/people", label: "People" },
  { href: "/leash/restocks", label: "Restocks" },
  { href: "/leash/paypal", label: "PayPal" },
];

export function LeashTabs() {
  const pathname = usePathname();
  return (
    <nav className="-mx-5 flex gap-1 overflow-x-auto px-5 lg:mx-0 lg:px-0" aria-label="Your leash">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={classNames(
            "flex h-12 shrink-0 items-center rounded-xl border px-5 text-base transition-colors",
            pathname === href ? "border-leash-rim bg-leash-wash text-leash" : "border-transparent text-ink hover:bg-white",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
