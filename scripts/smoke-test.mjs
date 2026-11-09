// End-to-end check of the demo story against a running app.
// It expects the scripted assistant, whose choices are predictable, so start the app without Claude:
// Usage: ANTHROPIC_API_KEY= npm run dev   (in one terminal)
//        npm run smoke                    (in another)   or   BASE_URL=https://your-app.onrender.com npm run smoke

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
if (status.body?.assistant !== "mock") {
  console.log("The assistant is running on Claude, whose choices vary. Restart with `ANTHROPIC_API_KEY= npm run dev`.");
  process.exit(1);
}

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
  "paying trusted Sam $25 goes through, then on to Sam with PayPal Payouts",
  sam.decisions[0]?.outcome === "auto_approved" && Boolean(sam.decisions[0].paypal.payoutId),
  JSON.stringify(sam.decisions[0]),
);
const refundPayment = await call("POST", `/api/decisions/${sam.decisions[0].id}/refund`);
check("money sent on to a person can't be refunded (400)", refundPayment.status === 400);
const jordan = await ask("Send $30 to Jordan for concert tickets");
check(
  "paying untrusted Jordan is held",
  jordan.decisions[0]?.ruleHit === "new_person",
  JSON.stringify(jordan.decisions[0]),
);
const approved = await call("POST", `/api/decisions/${jordan.decisions[0].id}/approve`);
check(
  "approving captures the payment and sends it on to Jordan",
  approved.body?.outcome === "approved" && approved.body.paypal.status === "COMPLETED" && approved.body.paypal.payoutId,
);
const stranger = await ask("Pay Morgan $20 for lunch");
const people = await call("GET", "/api/payees");
check(
  "a new person is added to People as not trusted",
  stranger.decisions[0]?.outcome === "held" && people.body.some((p) => p.name === "Morgan" && !p.trusted),
);
const approveWithoutEmail = await call("POST", `/api/decisions/${stranger.decisions[0].id}/approve`);
check(
  "approving is refused until Morgan has a PayPal email (400), and the money stays reserved",
  approveWithoutEmail.status === 400 && approveWithoutEmail.body?.error?.includes("PayPal email"),
  JSON.stringify(approveWithoutEmail.body),
);

// 5. Hard rules and validation
const giftCard = await ask("buy a coffee shop gift card");
check(
  "gift cards are blocked before PayPal",
  giftCard.decisions[0]?.outcome === "blocked" && !giftCard.decisions[0].paypal.orderId,
);
const refund = await call("POST", `/api/decisions/${beans.id}/refund`);
check("refunding a paid purchase works", refund.body?.outcome === "refunded");
const history = await call("GET", "/api/decisions");
const sampleRow = history.body.find((d) => d.requestId === "sample-history" && d.outcome === "auto_approved");
const refundSample = await call("POST", `/api/decisions/${sampleRow?.id}/refund`);
check(
  "sample history has no PayPal ids and can't be refunded (400)",
  sampleRow && !sampleRow.paypal.orderId && refundSample.status === 400,
);
const badRules = await call("PUT", "/api/rules", { autoApproveLimit: -5 });
check("invalid rules are rejected with 400", badRules.status === 400);
const emptyPrompt = await call("POST", "/api/assistant", { prompt: "" });
check("an empty request is rejected with 400", emptyPrompt.status === 400);

// 6. Recurring restocks: anything a schedule buys waits for you
const restock = await call("POST", "/api/restocks", { prompt: "Restock dog food", everyDays: 30 });
check("a restock can be scheduled", restock.status === 201 && restock.body.everyDays === 30);
const restockRun = await call("POST", `/api/restocks/${restock.body.id}/run`);
const restockDecisions = restockRun.body?.decisions ?? [];
check(
  "a restock's purchases are held for approval, even within the rules",
  restockDecisions.length > 0 &&
    restockDecisions.every((d) => d.outcome === "held" || d.outcome === "blocked") &&
    restockDecisions.some((d) => d.ruleHit === "scheduled_restock"),
  JSON.stringify(restockDecisions.map((d) => [d.title, d.outcome, d.ruleHit])),
);
check(
  "running a restock schedules the next one",
  restockRun.body?.restock?.lastRunAt && new Date(restockRun.body.restock.nextRunAt) > new Date(),
);

// 7. Try to break the leash: a hijacked assistant still can't get past the rules
async function attack(id) {
  const response = await fetch(`${BASE_URL}/api/attacks/${id}`, { method: "POST" });
  const events = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  return events.filter((e) => e.type === "decision_made").map((e) => e.decision);
}
const [toStranger] = await attack("stranger");
const peopleAfterScam = await call("GET", "/api/payees");
check(
  "a hijacked assistant can't send $900 to a stranger, who isn't added to People",
  toStranger?.outcome === "blocked" &&
    !toStranger.paypal.orderId &&
    !peopleAfterScam.body.some((p) => p.name === "Alex"),
  JSON.stringify(toStranger),
);
const [giftCard2] = await attack("gift-cards");
check("a hijacked assistant can't buy gift cards", giftCard2?.outcome === "blocked", JSON.stringify(giftCard2));
const drained = await attack("drain");
check(
  "the coffee you asked for is paid; items slipped into the order are held as not what you asked for",
  drained.length === 5 &&
    drained[0].outcome === "auto_approved" &&
    drained.slice(1).every((d) => d.outcome === "held" && d.ruleHit === "off_request"),
  JSON.stringify(drained.map((d) => [d.title, d.amount, d.outcome, d.ruleHit])),
);

// 8. PayPal connection and the daily job
const paypalConnection = await call("GET", "/api/paypal/connection");
check(
  "the PayPal connection status answers",
  paypalConnection.status === 200 && typeof paypalConnection.body.connected === "boolean",
);
const keepaliveWithoutSecret = await call("GET", "/api/keepalive");
check("the daily job refuses callers without the cron secret", keepaliveWithoutSecret.status === 401);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
