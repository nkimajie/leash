// What Leash can do, in its own words. Claude answers "what can you do for me?" from this,
// and so does the built-in assistant when Claude is off. Pure: no database or network calls.

/** A snapshot of your leash, read by the read_my_leash tool. */
export type LeashStatus = {
  paypal: { mode: "paypal-sandbox" | "mock"; connected: boolean; payerEmail: string | null };
  rules: {
    currency: string;
    autoApproveLimit: number;
    maxItemPrice: number;
    maxPaymentPerPerson: number;
    dailyCap: number;
    weeklyCap: number;
    blockedCategories: string[];
    newPeopleNeedApproval: boolean;
  };
  /** Money taken or reserved so far (reserved money waits for you), not counting the sample history. */
  paidOrReserved: { today: number; thisWeek: number };
  waitingForYou: { id: string; title: string; amount: number; why: string }[];
  people: { name: string; trusted: boolean; hasPayPalEmail: boolean }[];
  twinRemembers: string[];
  restocks: { prompt: string; everyDays: number }[];
};

export const WHAT_LEASH_CAN_DO = [
  {
    title: "Talk to me",
    text: "Type it, or tap Talk (or hold Space) and just say it. I'll tell you what I'm doing as I go, and answer out loud.",
  },
  {
    title: "Shop for you",
    text: 'Tell me what you need, like "restock my coffee, under $60". I search real stores, pick what fits your taste, and pay with your PayPal.',
  },
  {
    title: "Pay people",
    text: '"Pay Sam $25 for dinner." PayPal takes it from your account, and PayPal Payouts sends it on to them.',
  },
  {
    title: "Learn your taste",
    text: 'Say no and tell me why ("I only want hand grinders"). Your twin remembers it, and I choose differently next time.',
  },
  {
    title: "Answer questions about your money",
    text: '"What\'s waiting for me?" or "What did I spend on coffee this week?"',
  },
  {
    title: "Say no for you",
    text: '"Deny the grinder." PayPal releases the reserved money. I can never approve anything: that is always your tap.',
  },
  {
    title: "Keep you stocked",
    text: "Recurring restocks, like dog food every 30 days. Anything a schedule buys waits for your OK.",
  },
];

export const HOW_PAYPAL_KEEPS_YOU_SAFE =
  "Within your rules, PayPal takes the money straight away. Anything else, PayPal only reserves until you approve it in Leash, and releases it if you say no, so you're never charged. Gift cards, big payments to strangers and anything over your caps never reach PayPal at all. Your rules are code, not a prompt, so a scam can't talk me past them.";

/** How Leash introduces itself out loud: what the AI does first, then how PayPal keeps the money safe. */
export const INTRODUCTION_ALOUD =
  "I'm Leash. I understand what you need, pick what fits your taste, learn from every no, and pay with your PayPal. Within your rules I pay straight away; anything else, PayPal only reserves until you approve it.";

export const ONLY_YOU_CAN_APPROVE =
  "I can't approve that: only you can, with a tap on Approve in Leash. That way a scam, or a voice on the TV, can never release your money.";

/** The built-in answer to "what can you do for me?", ending with where your leash stands right now. */
export function describeWhatICanDo(status: LeashStatus, spoken: boolean): string {
  const money = moneyFormatter(status.rules.currency);
  const rightNow = [
    status.paypal.connected
      ? `I can spend up to ${money(status.rules.autoApproveLimit)} at a time without asking you`
      : "PayPal isn't connected yet, so I can't pay for anything until you connect it",
    describeWaitingCount(status.waitingForYou.length),
  ].join(", and ");

  if (spoken) return `${INTRODUCTION_ALOUD} Right now, ${rightNow}.`;
  return [
    "I'm Leash. I use AI to shop and pay people with your PayPal, and your rules decide every time money moves.",
    WHAT_LEASH_CAN_DO.map((item) => `• ${item.title}: ${item.text}`).join("\n"),
    `How PayPal keeps you safe: ${HOW_PAYPAL_KEEPS_YOU_SAFE}`,
    `Right now, ${rightNow}.`,
  ].join("\n\n");
}

/** When the built-in assistant isn't sure what you mean, it says so and spends nothing. */
export const HOW_TO_ASK =
  'I\'m not sure what you\'d like, so I didn\'t buy or pay anything. I can shop ("restock my coffee, under $60"), pay someone ("pay Sam $25 for dinner"), answer questions about your money ("what did I spend on coffee this week?", "what\'s my limit?") or open a page ("open my limits").';

/** The built-in answer to "what's my limit?" and "how much is left today?". */
export function describeLimits(status: LeashStatus): string {
  const money = moneyFormatter(status.rules.currency);
  const { rules, paidOrReserved } = status;
  const leftToday = Math.max(0, rules.dailyCap - paidOrReserved.today);
  const leftThisWeek = Math.max(0, rules.weeklyCap - paidOrReserved.thisWeek);
  return [
    `I pay up to ${money(rules.autoApproveLimit)} without asking. Your hard limits: ${money(rules.maxItemPrice)} for one item, ${money(rules.maxPaymentPerPerson)} to one person.`,
    `Today ${money(leftToday)} of your ${money(rules.dailyCap)} daily cap is left, and ${money(leftThisWeek)} of ${money(rules.weeklyCap)} this week. Money reserved for your okay counts too, so denying something waiting frees it.`,
    "Want me to open your limits?",
  ].join(" ");
}

/** The built-in answer to "what's waiting for me?". */
export function describeWaiting(status: LeashStatus): string {
  const money = moneyFormatter(status.rules.currency);
  const waiting = status.waitingForYou;
  if (waiting.length === 0) return "Nothing is waiting for you. Everything within your rules is already paid.";
  const items = waiting.map((item) => `${item.title} (${money(item.amount)}): ${item.why}`);
  return `${capitalise(describeWaitingCount(waiting.length))}. PayPal has reserved the money but not taken it.\n${items.map((item) => `• ${item}`).join("\n")}`;
}

function describeWaitingCount(count: number): string {
  if (count === 0) return "nothing is waiting for you";
  return count === 1 ? "1 thing is waiting for you" : `${count} things are waiting for you`;
}

const moneyFormatter = (currency: string) => (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const capitalise = (text: string) => text[0].toUpperCase() + text.slice(1);
