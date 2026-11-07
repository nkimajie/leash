/** An ISO timestamp `days` days from now. */
export function daysFromNow(days: number, from = new Date()): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}
