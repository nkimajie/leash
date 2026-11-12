import "server-only";

// A scripted stand-in for the Claude agent, used when ANTHROPIC_API_KEY is missing.
// It calls the same tools as the real agent, so every purchase and payment it makes goes
// through the real rules, PayPal flow and digital twin. Only the "thinking" is scripted.

import {
  pageToFix,
  type AssistantEvent,
  type AssistantRequest,
  type Decision,
  type EarlierTurn,
  type LeashPage,
  type Product,
} from "@/schemas";
import { pickByTitle, readCommand, readFollowUp, type Command } from "./read-command";
import { readGridQuestion } from "./read-grid-question";
import { readPaymentInstruction, readRestockSchedule, type PaymentInstruction } from "./read-request";
import { runTool, type ToolContext, type ToolResult } from "./tools";
import {
  describeBalance,
  describeLimits,
  describeWaiting,
  describeWhatICanDo,
  HOW_TO_ASK,
  ONLY_YOU_CAN_APPROVE,
  type LeashStatus,
} from "./what-leash-can-do";

type ShoppingStep = { search: string; why: (product: Product) => string };

/** Demo-friendly shopping plans, chosen by keywords in the request. */
const SHOPPING_PLANS: { matches: RegExp; steps: ShoppingStep[] }[] = [
  {
    matches: /gift ?cards?/i,
    steps: [{ search: "gift card", why: (p) => `You asked for a gift card: "${p.title}".` }],
  },
  {
    matches: /coffee|espresso|beans?/i,
    steps: [
      {
        search: "fair-trade coffee beans",
        why: (p) => `You asked for fair-trade beans. "${p.title}" is the best match at $${p.price.toFixed(2)}.`,
      },
      {
        search: "conical burr grinder",
        why: (p) => `Fresh beans need a good grinder to complete the setup. "${p.title}" is $${p.price.toFixed(2)}.`,
      },
    ],
  },
  {
    matches: /dog|pet|puppy/i,
    steps: [
      { search: "dog food", why: (p) => `Restocking dog food: "${p.title}" at $${p.price.toFixed(2)}.` },
      {
        search: "orthopedic dog bed",
        why: (p) => `You asked for a comfier bed, so I picked "${p.title}" at $${p.price.toFixed(2)}.`,
      },
    ],
  },
  {
    matches: /office|desk|paper|pens?|stationery/i,
    steps: [
      { search: "printer paper", why: (p) => `Basic office restock: "${p.title}" at $${p.price.toFixed(2)}.` },
      { search: "gel pens", why: (p) => `Pens were on the list too: "${p.title}" at $${p.price.toFixed(2)}.` },
    ],
  },
];

export async function* runMockAssistant(
  request: AssistantRequest,
  spoken = false,
  earlier: EarlierTurn[] = [],
): AsyncGenerator<AssistantEvent> {
  const context: ToolContext = { request };
  // "Yes, do that" answers the last reply; anything else is read on its own.
  const command = readFollowUp(request.prompt, earlier.at(-1)?.leash) ?? readCommand(request.prompt);
  if (command) {
    yield* followCommand(command, context, spoken);
    return;
  }
  const schedule = request.source === "you" ? readRestockSchedule(request.prompt) : null;
  if (schedule) {
    const scheduled = yield* callTool("schedule_restock", schedule, context);
    yield reply(scheduled.summary);
    return;
  }
  const payment = readPaymentInstruction(request.prompt);
  const decisions = payment ? yield* sendPayment(payment, context) : yield* goShopping(context);
  yield reply(describeResults(decisions));
}

/** Questions and commands: "what can you do?", "what's waiting?", "deny the grinder", "open the rules". */
async function* followCommand(command: Command, context: ToolContext, spoken: boolean): AsyncGenerator<AssistantEvent> {
  switch (command.kind) {
    case "what_can_you_do": {
      const leash = yield* callTool("read_my_leash", {}, context);
      yield reply(describeWhatICanDo(leash.data as LeashStatus, spoken));
      return;
    }
    case "whats_waiting": {
      const leash = yield* callTool("read_my_leash", {}, context);
      yield reply(describeWaiting(leash.data as LeashStatus));
      return;
    }
    case "look_up_spending": {
      const { searchText, sinceDays, kind } = readGridQuestion(context.request.prompt);
      const found = yield* callTool("look_up_spending", { searchText, sinceDays, kind }, context);
      yield reply(found.summary);
      return;
    }
    case "deny": {
      const leash = yield* callTool("read_my_leash", {}, context);
      const item = pickByTitle((leash.data as LeashStatus).waitingForYou, command.what);
      if (!item) {
        yield reply(`Nothing waiting for you matches "${command.what}", so I didn't deny anything.`);
        return;
      }
      yield think(
        `You want to say no to "${item.title}". PayPal will release the $${item.amount.toFixed(2)} it reserved.`,
      );
      const denied = yield* callTool("deny_held_item", { decisionId: item.id, reason: command.reason }, context);
      const learned = command.reason && denied.decision ? " Your twin will remember why." : "";
      yield reply(denied.summary + learned);
      return;
    }
    case "approve":
      yield reply(ONLY_YOU_CAN_APPROVE);
      return;
    case "my_limits": {
      const leash = yield* callTool("read_my_leash", {}, context);
      yield reply(describeLimits(leash.data as LeashStatus));
      return;
    }
    case "refund": {
      const refunded = yield* callTool("refund_purchase", { purchase: command.what, reason: command.reason }, context);
      const learned = command.reason && refunded.decision ? " Your twin will remember why." : "";
      yield reply(refunded.summary + learned);
      return;
    }
    case "track": {
      const tracked = yield* callTool("track_orders", { purchase: command.what }, context);
      yield reply(tracked.summary);
      return;
    }
    case "my_balance": {
      const leash = yield* callTool("read_my_leash", {}, context);
      yield reply(describeBalance(leash.data as LeashStatus));
      return;
    }
    case "unclear":
      yield reply(HOW_TO_ASK);
      return;
    case "open_page": {
      const opened = yield* callTool("open_page", { page: command.page, suggestedChange: command.change }, context);
      yield reply(opened.summary);
      return;
    }
  }
}

async function* goShopping(context: ToolContext): AsyncGenerator<AssistantEvent, Decision[]> {
  const { request } = context;
  yield think(`Reading your request. Budget for this one: $${request.budget.toFixed(2)}.`);
  await pause();
  yield* callTool("recall_preferences", {}, context);

  const plan = SHOPPING_PLANS.find((p) => p.matches.test(request.prompt));
  const steps: ShoppingStep[] = plan?.steps ?? [
    { search: request.prompt, why: (p) => `Best match for your request: "${p.title}" at $${p.price.toFixed(2)}.` },
  ];

  const decisions: Decision[] = [];
  for (const step of steps) {
    const search = yield* callTool("search_products", { query: step.search }, context);
    const results = (search.data ?? []) as (Product & { twinAvoids: string | null; twinLikes: string | null })[];

    const avoided = results.filter((p) => p.twinAvoids);
    const choice = results.find((p) => !p.twinAvoids);
    for (const product of avoided.slice(0, 1)) {
      yield think(`Skipping "${product.title}". Your twin remembers: ${product.twinAvoids}`);
    }
    if (!choice) {
      yield think("Nothing in these results fits what you like, so I'll skip this one.");
      continue;
    }

    const reasoning = step.why(choice) + (choice.twinLikes ? ` You've told me: ${choice.twinLikes.toLowerCase()}` : "");
    yield think(reasoning);
    await pause();
    yield* callTool("check_purchase_rules", { productId: choice.id }, context);
    const bought = yield* callTool("buy_product", { productId: choice.id, reasoning }, context);
    if (bought.decision) decisions.push(bought.decision);
  }
  return decisions;
}

async function* sendPayment(
  payment: PaymentInstruction,
  context: ToolContext,
): AsyncGenerator<AssistantEvent, Decision[]> {
  const what = payment.note ? ` for ${payment.note}` : "";
  yield think(`You want to send $${payment.amount.toFixed(2)} to ${payment.personName}${what}.`);
  await pause();
  yield* callTool("check_payment_rules", { personName: payment.personName, amount: payment.amount }, context);
  const sent = yield* callTool(
    "pay_person",
    {
      personName: payment.personName,
      amount: payment.amount,
      note: payment.note,
      reasoning: `You asked me to pay ${payment.personName}${what}.`,
    },
    context,
  );
  return sent.decision ? [sent.decision] : [];
}

/** Runs a tool and reports it on the live timeline. */
async function* callTool(
  name: string,
  input: Record<string, unknown>,
  context: ToolContext,
): AsyncGenerator<AssistantEvent, ToolResult> {
  yield { type: "tool_started", tool: name, input };
  const result = await runTool(name, input, context);
  await pause(250);
  yield { type: "tool_finished", tool: name, summary: result.summary, products: result.products };
  if (result.decision) yield { type: "decision_made", decision: result.decision };
  if (result.openPage) yield { type: "open_page", ...result.openPage };
  return result;
}

function describeResults(decisions: Decision[]): string {
  if (decisions.length === 0) return "I couldn't find anything to do within your rules and preferences.";
  const count = (outcome: Decision["outcome"]) => decisions.filter((d) => d.outcome === outcome).length;
  const parts = [
    count("auto_approved") && `${count("auto_approved")} paid automatically`,
    count("held") && `${count("held")} waiting for your approval (money reserved, not taken)`,
    count("blocked") && `${count("blocked")} blocked by your rules`,
    count("failed") && `${count("failed")} declined by PayPal, nothing charged`,
  ].filter(Boolean);
  return `Done: ${parts.join(", ")}.${offerToChangeTheRule(decisions)}`;
}

const OFFER: Partial<Record<LeashPage, string>> = {
  limits: " Want me to open your limits?",
  people: " Want me to open the people you pay?",
  paypal: " Want me to open your PayPal?",
};

/** When a rule blocked something (not just held it for your okay), offer the page where you can change it. */
function offerToChangeTheRule(decisions: Decision[]): string {
  const page = decisions.map(pageToFix).find(Boolean);
  return (page && OFFER[page]) ?? "";
}

const think = (text: string): AssistantEvent => ({ type: "thinking", text });
const reply = (text: string): AssistantEvent => ({ type: "reply", text });
const pause = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
