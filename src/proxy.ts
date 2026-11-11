// Leash's own API (approve, deny, your rules, your people…) is for the Leash app in your browser.
// A request that changes something must come from Leash's own pages, so another website, or an AI
// agent browsing one, can't approve your purchases or loosen your rules. Outside agents use the
// Leash API (/api/v1), which has no way to approve anything.
//
// This hackathon build has no accounts, so this is a guard against other sites, not real security:
// a script that writes its own headers could still get through. A real deployment would sign you in.

import { NextResponse, type NextRequest } from "next/server";

/** Paths outside callers may use: the Leash API, PayPal's webhook and the daily job. */
const OPEN_TO_OUTSIDE_CALLERS = ["/api/v1/", "/api/paypal/webhook", "/api/keepalive"];

export function proxy(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return NextResponse.next();
  const path = request.nextUrl.pathname;
  if (OPEN_TO_OUTSIDE_CALLERS.some((open) => path.startsWith(open))) return NextResponse.next();
  if (comesFromLeash(request)) return NextResponse.next();
  return NextResponse.json(
    { error: "Only the Leash app can change this. Outside AI agents use the Leash API at /api/v1." },
    { status: 403 },
  );
}

/** Browsers say where a request comes from; without that, the Origin must be this site. */
function comesFromLeash(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return origin !== null && host !== null && new URL(origin).host === host;
}

export const config = { matcher: "/api/:path*" };
