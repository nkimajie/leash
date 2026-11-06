// End-to-end check of the demo story against a running app (mock mode).
// Usage: npm run dev   (in one terminal)
//        npm run smoke (in another)   or   BASE_URL=https://your-app.onrender.com npm run smoke

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;

function check(description, condition, details = "") {
  console.log(`${condition ? "✓" : "✗"} ${description}${!condition && details ? `\n    ${details}` : ""}`);
  if (!condition) failures++;
}

async function call(method, path, body) {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** Sends a request to the assistant and returns the decisions it made. */
async function ask(prompt) {
  const response = await fetch(`${BASE_URL}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  const events = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  return {
    events,
    decisions: events.filter((e) => e.type === "decision_made").map((e) => e.decision),
  };
}

const status = await call("GET", "/api/status");
check("status endpoint answers", status.status === 200, JSON.stringify(status.body));
console.log(`  modes: ${JSON.stringify(status.body)}\n`);

// 1. Shopping: cheap item paid, expensive item held
const coffee = await ask("Restock my coffee setup, under $60, fair-trade beans only");
const [beans, grinder] = coffee.decisions;
check(
  "beans ($14) are paid automatically",
  beans?.outcome === "auto_approved" && beans.amount === 14,
  JSON.stringify(beans),
);
check(
  "grinder ($85) is held for approval",
  grinder?.outcome === "held" && grinder.ruleHit === "auto_approve_limit",
  JSON.stringify(grinder),
);

// 2. You deny the grinder: PayPal voids it and the twin learns
const denied = await call("POST", `/api/decisions/${grinder.id}/deny`);
check(
  "denying voids the PayPal authorization",
  denied.body?.outcome === "denied" && denied.body.paypal.status === "VOIDED",
);
const deniedAgain = await call("POST", `/api/decisions/${grinder.id}/deny`);
check("denying twice is refused with 409", deniedAgain.status === 409);
const preferences = await call("GET", "/api/preferences");
check(
  "the twin learned to avoid expensive coffee equipment",
  preferences.body.some((p) => p.source === "learned" && p.learnedFromDecisionId === grinder.id),
);

// 3. Same request again: the twin steers away from the grinder you denied
const coffeeAgain = await ask("Restock my coffee setup, under $60, fair-trade beans only");
const secondGrinder = coffeeAgain.decisions[1];
check(
  "next time it picks a cheaper grinder instead",
  secondGrinder && secondGrinder.product?.id !== "cof-4",
  JSON.stringify(secondGrinder?.title),
);
check(
  "and says why it skipped the old one",
  coffeeAgain.events.some((e) => e.type === "thinking" && e.text.includes("Your twin remembers")),
);

// 4. Paying people
const sam = await ask("Pay Sam $25 for dinner");
check(
  "paying trusted Sam $25 goes through",
  sam.decisions[0]?.outcome === "auto_approved",
  JSON.stringify(sam.decisions[0]),
);
const jordan = await ask("Send $30 to Jordan for concert tickets");
check(
  "paying untrusted Jordan is held",
  jordan.decisions[0]?.ruleHit === "new_person",
  JSON.stringify(jordan.decisions[0]),
);
const approved = await call("POST", `/api/decisions/${jordan.decisions[0].id}/approve`);
check(
  "approving captures the payment",
  approved.body?.outcome === "approved" && approved.body.paypal.status === "COMPLETED",
);
const stranger = await ask("Pay Morgan $20 for lunch");
const people = await call("GET", "/api/payees");
check(
  "a new person is added to People as not trusted",
  stranger.decisions[0]?.outcome === "held" && people.body.some((p) => p.name === "Morgan" && !p.trusted),
);

// 5. Hard rules and validation
const giftCard = await ask("buy a coffee shop gift card");
check(
  "gift cards are blocked before PayPal",
  giftCard.decisions[0]?.outcome === "blocked" && !giftCard.decisions[0].paypal.orderId,
);
const refund = await call("POST", `/api/decisions/${beans.id}/refund`);
check("refunding a paid purchase works", refund.body?.outcome === "refunded");
const badRules = await call("PUT", "/api/rules", { autoApproveLimit: -5 });
check("invalid rules are rejected with 400", badRules.status === 400);
const emptyPrompt = await call("POST", "/api/assistant", { prompt: "" });
check("an empty request is rejected with 400", emptyPrompt.status === 400);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
