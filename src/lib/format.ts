// Formatting helpers for the UI.

const usdFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatMoney = (amount: number) => usdFormatter.format(amount);

/** "14:05" for today, "Nov 4, 14:05" for other days. */
export function formatWhen(isoDate: string) {
  const date = new Date(isoDate);
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })}, ${time}`;
}

/** Joins class names, skipping empty ones. */
export function classNames(...names: (string | false | null | undefined)[]) {
  return names.filter(Boolean).join(" ");
}
