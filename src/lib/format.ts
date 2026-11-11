// Formatting helpers for the UI.

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatMoney = (amount: number) => usdFormatter.format(amount);

/** "$157" for whole dollars, "$12.50" otherwise: for totals like "$157 reserved, not taken". */
export const formatShortMoney = (amount: number) =>
  Number.isInteger(amount) ? `$${amount.toLocaleString("en-US")}` : usdFormatter.format(amount);

/** A receipt's time: "Today, 9:41", "Yesterday", "Monday", or "Nov 4" for anything older. */
export function formatReceiptTime(isoDate: string) {
  const date = new Date(isoDate);
  const daysAgo = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (daysAgo === 0)
    return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: false })}`;
  if (daysAgo === 1) return "Yesterday";
  if (daysAgo > 1 && daysAgo < 7) return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "14:05" for today, "Nov 4, 14:05" for other days. */
export function formatWhen(isoDate: string) {
  const date = new Date(isoDate);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

/** "today", "in 4 days" or "3 days ago". */
export function formatDaysAway(isoDate: string) {
  const days = Math.round((new Date(isoDate).getTime() - Date.now()) / 86_400_000);
  if (days === 0) return "today";
  if (days > 0) return days === 1 ? "tomorrow" : `in ${days} days`;
  return days === -1 ? "yesterday" : `${-days} days ago`;
}

/** A title inside a sentence: "Your orthopedic dog bed…", "Review payment to Casey". Only the first letter changes. */
export const inSentence = (title: string) => title.charAt(0).toLowerCase() + title.slice(1);

/** Joins class names, skipping empty ones. */
export function classNames(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}
