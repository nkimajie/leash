// Scripted stand-in for the Claude agent, used when ANTHROPIC_API_KEY is missing.
// It calls the same tools (search, policy check, PayPal) as the real agent will,
// so every decision it makes is real app state; only the "thinking" is scripted.

import type { AgentEvent } from "./agent-events";
import { searchProducts } from "./channel3";
import { previewPolicy, purchase } from "./purchase";
import type { Goal, Product } from "./types";

type Step = { query: string; why: (p: Product) => string };

// A few scenarios that read well in a demo, plus a generic fallback.
const SCENARIOS: { match: RegExp; steps: Step[] }[] = [
  {
    match: /coffee|espresso|beans?/i,
    steps: [
      { query: "fair-trade coffee beans", why: (p) => `You asked for fair-trade beans. "${p.title}" is the cheapest fair-trade option at $${p.price.toFixed(2)}.` },
      { query: "burr grinder", why: (p) => `Fresh beans are wasted on pre-ground coffee, so a grinder completes the setup. "${p.title}" is $${p.price.toFixed(2)}.` },
    ],
  },
  {
    match: /dog|pet|puppy/i,
    steps: [
      { query: "dog food", why: (p) => `Restocking dog food: "${p.title}" at $${p.price.toFixed(2)}.` },
      { query: "dog bed", why: (p) => `You mentioned comfort, so I found "${p.title}" for $${p.price.toFixed(2)}.` },
    ],
  },
  {
    match: /office|desk|paper|pens?|stationery/i,
    steps: [
      { query: "printer paper", why: (p) => `Basic office restock: "${p.title}" at $${p.price.toFixed(2)}.` },
      { query: "gel pens", why: (p) => `Pens were running low too: "${p.title}" at $${p.price.toFixed(2)}.` },
    ],
  },
];

const pause = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export async function* runMockAgent(goal: Goal): AsyncGenerator<AgentEvent> {
  yield { type: "thought", text: `Reading your goal. Budget for this goal: $${goal.budget.toFixed(2)}.` };
  await pause();

  const scenario = SCENARIOS.find((s) => s.match.test(goal.prompt));
  const steps: Step[] = scenario?.steps ?? [
    { query: goal.prompt, why: (p) => `Best match for your goal: "${p.title}" at $${p.price.toFixed(2)}.` },
  ];

  let bought = 0;
  for (const step of steps) {
    yield { type: "tool_call", tool: "search_products", input: { query: step.query } };
    const results = await searchProducts({ query: step.query, limit: 3 });
    await pause();
    if (results.length === 0) {
      yield { type: "tool_result", tool: "search_products", summary: "No products found." };
      continue;
    }
    yield {
      type: "tool_result",
      tool: "search_products",
      summary: results.map((p) => `${p.title}: $${p.price.toFixed(2)} (${p.merchant})`).join("\n"),
    };

    const product = results[0]; // search returns best match first, cheapest among equals
    yield { type: "thought", text: step.why(product) };
    await pause();

    yield { type: "tool_call", tool: "check_policy", input: { item: product.title, price: product.price } };
    const policy = await previewPolicy(goal, product);
    await pause(300);
    yield { type: "tool_result", tool: "check_policy", summary: `${policy.verdict}: ${policy.explanation}` };

    if (policy.verdict === "blocked") {
      yield { type: "thought", text: "Your rules block this, so I won't contact PayPal for it." };
    } else {
      yield { type: "tool_call", tool: "create_authorization", input: { item: product.title, price: product.price } };
    }
    const result = await purchase(goal, product, step.why(product));
    yield { type: "decision", ...result };
    if (["auto_captured", "held"].includes(result.decision.verdict)) bought++;
    await pause();
  }

  yield { type: "message", text: summary(bought) };
}

function summary(bought: number) {
  if (bought === 0) return "I couldn't buy anything for this goal within your rules.";
  return "Done. Anything held is waiting for you on the approval page; nothing is charged until you approve.";
}
