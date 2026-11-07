import "server-only";

// In demo mode the app is public, so Claude use is capped: a few requests per visitor per day,
// and a total for everyone. Past the cap the built-in assistant takes over, so the demo keeps
// working and the bill stays small. Outside demo mode there is no cap.
// Counts live in memory, so they reset when the server restarts. That's fine for a cap.

import { serviceModes } from "@/server/config/environment";

const PER_VISITOR_PER_DAY = 20;
const FOR_EVERYONE_PER_DAY = 400;

const usesToday = new Map<string, number>();
let countingDay = "";

/** Counts one Claude call and says whether it's allowed. `visitor` is set for assistant requests. */
export function mayUseClaude(visitor?: string, now = new Date()): boolean {
  if (!serviceModes().demoMode) return true;

  const today = now.toISOString().slice(0, 10);
  if (today !== countingDay) {
    usesToday.clear();
    countingDay = today;
  }
  const everyone = usesToday.get("everyone") ?? 0;
  const theirs = visitor ? (usesToday.get(visitor) ?? 0) : 0;
  if (everyone >= FOR_EVERYONE_PER_DAY || theirs >= PER_VISITOR_PER_DAY) return false;

  usesToday.set("everyone", everyone + 1);
  if (visitor) usesToday.set(visitor, theirs + 1);
  return true;
}

/** Who is asking, as well as we can tell behind Render's proxy. */
export function visitorOf(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}
