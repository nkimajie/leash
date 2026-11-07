# Devpost submission text

Copy each section into the matching Devpost field. Replace the parts in `<angle brackets>`.

## Project name

Leash

## Elevator pitch

An AI assistant that shops and pays people with your PayPal, like a digital twin, but only inside rules you set.
Anything outside them is reserved, not taken, until you say yes.

## About the project

### Inspiration

AI agents are starting to buy things for us. But handing an AI your PayPal today is all or nothing: either it can
spend, or it can't. We wanted the middle ground people actually trust: an assistant that does the boring buying
and paying for you, and asks first whenever it matters, the way a good personal assistant would.

### What it does

You tell Leash what you need: "restock my coffee, under $60", "pay Sam $25 for dinner", "restock dog food every 30
days". Claude searches real products (Channel3), picks what fits your taste, and pays with your PayPal. Every
purchase and payment first passes your spending rules:

- **Within every rule:** PayPal authorizes and captures. Paid automatically.
- **Over your limit, over budget, or someone new:** PayPal only authorizes. The money is **reserved, not taken**,
  and you approve or deny it on your phone (scan the QR code). Deny, and PayPal voids it: you're never charged.
- **Against a hard rule** (gift cards, a per-person limit, a daily cap): blocked, and PayPal is never called.

It learns like a digital twin. Deny something and say why, in your own words ("I only want hand grinders"), and
Claude turns it into a preference it applies next time. You can change the rules in plain English, ask the AG Grid
control room questions ("what did I spend on coffee this week?"), and click any payment to see each PayPal step.

To prove the leash holds, "Try to break the leash" plays three scams against it: $900 to a stranger, gift cards
from a poisoned product page, and draining the budget in small buys. The attacks skip the AI entirely, so only the
rules stand in the way. They hold.

### How we built it

- **PayPal:** Vault v3 saves your PayPal account once (setup token, then payment token). Each payment is an Orders
  v2 order with `AUTHORIZE` intent, paid with the vaulted account, so there's no popup per purchase. Then
  Payments v2 captures, voids or refunds it. Webhooks keep the status up to date, and every error stores PayPal's
  `debug_id`. All of it runs through `@paypal/paypal-server-sdk`.
- **Claude Haiku** runs the assistant as a tool-use agent. It can only act through tools (search, check rules, buy,
  pay, remember), and every money-moving tool goes through one function that applies the rules, calls PayPal,
  saves the decision and teaches the twin. Claude structured outputs, checked with zod, power the smaller features:
  the twin's lessons, control room questions, and rules in your own words.
- **The rule engine and the twin's learning are pure functions** with unit tests: no network, no database.
- **Channel3** for real product search, **AG Grid** for the live control room, **Supabase** (Postgres and Realtime)
  for storage and live updates, **Next.js 16**, hosted on **Render** with a daily cron job that runs due restocks,
  releases reservations nobody answered, and keeps the database awake.
- **Every outside service has a mock mode**, so anyone can clone the repo and run it with zero keys.

### Challenges we ran into

- Making "held" real: authorizing without capturing needs a saved payment method, so we built the PayPal Vault flow
  instead of a checkout popup.
- Keeping the AI from ever being the last line of defence. Claude chooses, but it can't set a price, skip a rule or
  move money directly.
- Learning from a "no" correctly: denying an $85 grinder because it's too expensive and denying it because you
  only want hand grinders should teach different lessons.

### Accomplishments that we're proud of

- The full PayPal money path works in the sandbox: authorize, capture, void and refund, with every id on screen.
- A scam can fully take over the assistant and still not get past the rules.
- It runs with zero setup: every service falls back to a mock.

### What we learned

Authorize-then-capture is the right building block for agentic commerce: it turns "the AI wants to spend" into
"the money is reserved and a human decides", without ever charging and refunding.

### What's next for Leash

Accounts for several people (a household sharing one leash), spending limits per category, and paying bills and
subscriptions through PayPal as more APIs allow it.

## Built with

`paypal` `paypal-vault` `paypal-orders-api` `claude` `anthropic` `channel3` `ag-grid` `supabase` `render` `next.js`
`react` `typescript` `zod` `tailwindcss`

## Tools: how each AI tool is used

- **Claude Haiku (Anthropic), tool use:** the assistant itself. It chooses products and payments by calling Leash's
  tools; it never touches money directly.
- **Claude Haiku, structured outputs:** turns your reason for a "no" into a preference, control room questions into
  grid filters, and rules in plain English into rule changes. Each answer is checked against a zod schema, with a
  simple built-in fallback.

## Try it out

- Live demo: `<live Render URL>`
- Code: `<GitHub repo URL>`

## Testing instructions

The live demo is already connected to a PayPal sandbox account, so there's nothing to log in to. Follow
"For judges: a 60-second test" in the README. To connect your own sandbox buyer instead, use:
`<sandbox Personal account email>` / `<its password>`.

To run it yourself with zero keys: `npm install && npm run dev`, then open http://localhost:3000.
