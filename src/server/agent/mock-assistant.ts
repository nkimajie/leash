import "server-only";

// A scripted stand-in for the Claude agent, used when ANTHROPIC_API_KEY is missing.
// It calls the same tools as the real agent, so every purchase and payment it makes goes
// through the real rules, PayPal flow and digital twin. Only the "thinking" is scripted.

import type { AssistantEvent, AssistantRequest, Decision, Product } from "@/schemas";
import { readPaymentInstruction, type PaymentInstruction } from "./read-request";
import { runTool, type ToolContext, type ToolResult } from "./tools";

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

export async function* runMockAssistant(request: AssistantRequest): AsyncGenerator<AssistantEvent> {
  const context: ToolContext = { request };
  const payment = readPaymentInstruction(request.prompt);
  const decisions = payment ? yield* sendPayment(payment, context) : yield* goShopping(context);
  yield { type: "reply", text: describeResults(decisions) };
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
  return `Done: ${parts.join(", ")}.`;
}

const think = (text: string): AssistantEvent => ({ type: "thinking", text });
const pause = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
