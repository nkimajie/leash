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

/** Leash's own API only takes changes from Leash's pages (src/proxy.ts), so the test says it's the app. */
const AS_THE_APP = { Origin: new URL(BASE_URL).origin };

async function call(method, path, body) {
  const response = await fetch(BASE_URL + path, {
    method,
    headers: body ? { "Content-Type": "application/json", ...AS_THE_APP } : AS_THE_APP,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** Sends a request to the assistant (typed, or `spoken` out loud) and returns what happened. */
async function ask(prompt, spoken = false) {
  const response = await fetch(`${BASE_URL}/api/assistant`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...AS_THE_APP },
    body: JSON.stringify({ prompt, spoken }),
  });
  const events = (await response.text())
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  return {
    events,
    decisions: events.filter((e) => e.type === "decision_made").map((e) => e.decision),
    reply: events.find((e) => e.type === "reply")?.text ?? "",
  };
}

const status = await call("GET", "/api/status");
check("status endpoint answers", status.status === 200, JSON.stringify(status.body));
console.log(`  modes: ${JSON.stringify(status.body)}\n`);
if (status.body?.assistant !== "mock") {
  console.log("The assistant is running on Claude, whose choices vary. Restart with `ANTHROPIC_API_KEY= npm run dev`.");
  process.exit(1);
}
if (status.body?.demoMode) {
  const reset = await call("POST", "/api/demo/reset");
  check("demo mode: the demo resets to a clean start first", reset.status === 204);
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

// 1b. Talking to Leash: questions and commands, typed or said out loud
const capabilities = await ask("What can you do for me?", true);
check(
  "asked what it can do, Leash explains itself (with PayPal) and moves no money",
  capabilities.decisions.length === 0 &&
    capabilities.reply.includes("PayPal") &&
    capabilities.reply.includes("approve"),
  capabilities.reply,
);
const waiting = await ask("What's waiting for me?");
check("asked what's waiting, it names the held grinder", waiting.reply.includes(grinder.title), waiting.reply);
const coffeeSpending = await ask("What did I spend on coffee today?");
check(
  "asked what it spent on coffee today, it adds it up",
  coffeeSpending.reply.includes("$14.00"),
  coffeeSpending.reply,
);
const approveByVoice = await ask("Approve the grinder", true);
check(
  "it can't approve anything by itself: only you can, with a tap",
  approveByVoice.decisions.length === 0 && approveByVoice.reply.includes("only you"),
  approveByVoice.reply,
);
const openPage = await ask("Open my money", true);
check(
  "it opens pages when asked",
  openPage.events.some((e) => e.type === "open_page" && e.path === "/money"),
);

// 1c. Leash remembers the conversation, and what it really did in it
const memory = await call("GET", "/api/conversation");
const coffeeTurn = memory.body?.find((turn) => turn.you.startsWith("Restock my coffee setup"));
check(
  "Leash remembers the coffee request, its reply, and what it bought (beans paid, grinder waiting)",
  coffeeTurn?.leash.length > 0 &&
    coffeeTurn.did.some((line) => line.endsWith(": paid")) &&
    coffeeTurn.did.some((line) => line.includes("waiting for your okay")),
  JSON.stringify(coffeeTurn),
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
const morgan = people.body.find((p) => p.name === "Morgan");
await call("PATCH", `/api/payees/${morgan.id}`, { email: "morgan@example.com" });
const morganOnPhone = await call("GET", `/api/decisions/${stranger.decisions[0].id}`);
const morganApproved = await call("POST", `/api/decisions/${stranger.decisions[0].id}/approve`);
check(
  "once Morgan's email is added, the decision shows it and approving sends the money there",
  morganOnPhone.body?.payee?.email === "morgan@example.com" &&
    morganApproved.body?.outcome === "approved" &&
    morganApproved.body.paypal.payoutId,
  JSON.stringify(morganApproved.body),
);

// 5. Hard rules and validation
const giftCard = await ask("buy a coffee shop gift card");
check(
  "gift cards are blocked before PayPal",
  giftCard.decisions[0]?.outcome === "blocked" && !giftCard.decisions[0].paypal.orderId,
);
const refund = await call("POST", `/api/decisions/${beans.id}/refund`);
check("refunding a paid purchase works", refund.body?.outcome === "refunded");
const secondBeans = coffeeAgain.decisions[0];
const refundByVoice = await ask("Refund the beans, they arrived broken", true);
check(
  'saying "refund the beans" refunds the newest beans through PayPal, and the twin learns why',
  refundByVoice.decisions[0]?.id === secondBeans?.id && refundByVoice.decisions[0]?.outcome === "refunded",
  refundByVoice.reply,
);
const refundSamByVoice = await ask("Refund the payment to Sam");
check(
  "asked to refund money sent to a person, it explains the money already went on to them",
  refundSamByVoice.decisions.length === 0 && refundSamByVoice.reply.includes("Sam"),
  refundSamByVoice.reply,
);
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

// 6. Recurring restocks: say it once, and anything a schedule buys waits for you
const scheduled = await ask("Restock dog food every 30 days", true);
const restocks = await call("GET", "/api/restocks");
const restock = restocks.body
  .filter((r) => r.prompt === "Restock dog food" && r.id !== "restock-dog-food") // not the sample one
  .at(-1);
check(
  "saying 'restock dog food every 30 days' schedules it, and buys nothing now",
  restock?.everyDays === 30 && scheduled.decisions.length === 0 && /scheduled/i.test(scheduled.reply),
  scheduled.reply,
);
const restockRun = await call("POST", `/api/restocks/${restock?.id}/run`);
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
const denyByVoice = await ask("Deny the dog food, we buy it at the vet", true);
check(
  "saying 'deny the dog food' makes PayPal release it, and nothing else is touched",
  denyByVoice.decisions.length === 1 &&
    denyByVoice.decisions[0].outcome === "denied" &&
    denyByVoice.decisions[0].paypal.status === "VOIDED" &&
    /dog food/i.test(denyByVoice.decisions[0].title),
  JSON.stringify(denyByVoice.decisions.map((d) => [d.title, d.outcome])) + " " + denyByVoice.reply,
);

// 7. Try to break the leash: a hijacked assistant still can't get past the rules
async function attack(id) {
  const response = await fetch(`${BASE_URL}/api/attacks/${id}`, { method: "POST", headers: AS_THE_APP });
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
    drained[1].ruleHit === "off_request" &&
    // after this long test the daily cap may block the last few instead, which is just as safe
    drained.slice(1).every((d) => (d.outcome === "held" && d.ruleHit === "off_request") || d.ruleHit === "daily_cap"),
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

// 9. The Leash API: any outside AI agent shops through the same rules, and can't approve anything
const openApi = await call("GET", "/api/v1/openapi.json");
check(
  "the Leash API describes itself with OpenAPI",
  openApi.status === 200 && Boolean(openApi.body.paths?.["/purchases"]),
);
const agentSearch = await call("GET", "/api/v1/products?query=coffee%20beans&maxPrice=20");
check("an outside agent can search products", agentSearch.status === 200 && agentSearch.body.length > 0);
const agentPurchase = await call("POST", "/api/v1/purchases", {
  productId: agentSearch.body[0]?.id,
  reasoning: "Fair-trade beans under $20 for the office.",
  agentName: "Smoke test agent",
});
check(
  "its purchase goes through the person's rules, signed with the agent's name",
  agentPurchase.status === 201 &&
    ["auto_approved", "held", "blocked"].includes(agentPurchase.body.outcome) &&
    agentPurchase.body.aiReasoning.startsWith("Smoke test agent:"),
  JSON.stringify(agentPurchase.body),
);
const agentPayment = await call("POST", "/api/v1/payments", {
  personName: "Casey",
  amount: 40,
  note: "plants",
  reasoning: "Casey watered the plants all week.",
  agentName: "Smoke test agent",
});
check(
  "paying someone new is never automatic: it waits for the person (or a hard rule blocks it)",
  agentPayment.status === 201 && ["held", "blocked"].includes(agentPayment.body.outcome),
  JSON.stringify(agentPayment.body),
);
const agentLooksUp = await call("GET", `/api/v1/decisions/${agentPayment.body.id}`);
check("the agent can check on it later", agentLooksUp.status === 200 && agentLooksUp.body.id === agentPayment.body.id);
const agentApproves = await fetch(`${BASE_URL}/api/v1/decisions/${agentPayment.body.id}/approve`, { method: "POST" });
check("and the Leash API has no way to approve it", agentApproves.status === 404 || agentApproves.status === 405);
const otherSiteApproves = await fetch(`${BASE_URL}/api/decisions/${agentPayment.body.id}/approve`, {
  method: "POST",
  headers: { Origin: "https://somewhere-else.example" },
});
check("and another site can't approve it through Leash's own API either (403)", otherSiteApproves.status === 403);
const badPurchase = await call("POST", "/api/v1/purchases", { productId: "nope", reasoning: "short" });
check("a bad request gets a clear 400", badPurchase.status === 400 && typeof badPurchase.body.error === "string");

// 10. Start fresh: Leash forgets the conversation (only from Leash's own pages)
const otherSiteForgets = await fetch(`${BASE_URL}/api/conversation`, {
  method: "DELETE",
  headers: { Origin: "https://somewhere-else.example" },
});
check("another site can't wipe Leash's memory (403)", otherSiteForgets.status === 403);
const startFresh = await call("DELETE", "/api/conversation");
const afterFresh = await call("GET", "/api/conversation");
check("Start fresh: Leash forgets the conversation", startFresh.status === 204 && afterFresh.body?.length === 0);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
