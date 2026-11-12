# Leash

**Your AI assistant can spend. Your rules decide what money moves.**

AI agents read untrusted text: product pages, emails, messages. One hidden sentence can tell an agent to buy gift
cards or pay a stranger. That's why nobody hands an AI their PayPal today.

Leash lets Claude shop and pay with your PayPal for the boring parts of running a home: restocking coffee and dog
food, paying the babysitter, settling dinner with a roommate. Claude chooses, but **code decides whether money
moves**. Anything outside your rules is **reserved, not taken** (a PayPal authorization) until you say yes, with
one tap in Leash. Say no, and PayPal releases it: you're never charged. Leash also learns from every yes, no and refund, like a
digital twin. And you can just talk to it: say what you need, and it tells you what it's doing and answers out loud.

## For judges: a 60-second test

1. Open the live demo (link in the Devpost submission) and sign in: tap **Continue with PayPal**, and log in on
   PayPal's page with the sandbox test account shown under the button (copy buttons included; test money only).
   PayPal sends you back to set your leash and meet your twin. If someone left it signed in, sign out from your
   profile (top right) to try the login yourself. For a clean start, open **Settings** and click **Reset demo**.
2. On **Ask**, tap **Talk** (or hold the space bar) and say _"What can you do for me?"_. Leash checks your account and
   answers out loud. (Or click the same question under **A place to start**.)
3. A grinder is already **waiting for you**: PayPal has reserved the money but not taken it. Tap **Deny** right
   there. Pick a reason in **Why not?**, or say it in your own words.
   PayPal releases the money, and the screen shows what your twin learned. You can also just say _"Deny the grinder,
   I only want hand grinders"_; try _"Approve it"_ too, and Leash refuses: only you can approve.
4. Click **"Restock my coffee setup, under $60"**. Watch Claude search real stores (Channel3), check your rules and
   pay. Every purchase gets a receipt stamped with what happened to the money: **Paid**, **Reserved** or **Blocked**.
5. Under **Try to break the leash**, pick an attack. A scam "takes over" the assistant, and the rules stop the money
   anyway.
6. Click **"Pay Sam $25 for dinner"**. PayPal takes the money from your account and **Payouts** sends it on to Sam.
7. Ask _"what did I spend on coffee today?"_ and click **See it in Money**: AG Grid filters your receipts to the same
   question. Click any receipt to see its PayPal trail, with every id. The **Money reserved at PayPal** timeline
   (Bryntum) shows how long each reservation was held. Switch Money to **Dashboard** (AG Studio) and click
   "Blocked category" in **What your leash stopped**: every chart and the table filter to what the leash refused.
8. Say _"Restock dog food every 30 days"_, then open **Your leash › Restocks**: it's on the Bryntum timeline. Drag
   its next run to another day.

Everyone shares one demo account. It resets every night, and on its own when someone arrives after 30 quiet
minutes. Resetting releases every open PayPal reservation first.

## How the money moves

| Your rules say                                             | PayPal does                     | The receipt's stamp                                     |
| ---------------------------------------------------------- | ------------------------------- | ------------------------------------------------------- |
| Within every rule                                          | authorize, then capture         | **Paid** · PayPal captured                              |
| Over a limit or budget, someone new, or not what you asked | authorize and **hold**          | **Reserved** · PayPal authorized: waiting for your okay |
| You deny                                                   | **void** the authorization      | **Released** · PayPal released. Your twin remembers.    |
| Blocked category, merchant, cap or hard limit              | nothing; PayPal is never called | **Blocked** · PayPal never called                       |
| You refund a purchase                                      | refund the capture              | **Refunded** · PayPal refunded. Your twin remembers.    |
| PayPal says no (e.g. a declined card)                      | void what was reserved          | **Failed**, with PayPal's `debug_id`                    |
| Paying a person, once the money is taken                   | **Payouts** to their email      | Paid out to Sam's PayPal                                |

Signing in to Leash is **Continue with PayPal**: you save your PayPal account once with **PayPal Vault**, and PayPal
tells Leash your name and email. After that the assistant pays with the saved account, so there is no PayPal popup
for every purchase, and the authorize-then-capture flow is what makes "reserved, not taken" possible.

A saved PayPal account can only pay the app that saved it. So paying Sam is two PayPal steps: your account pays
Leash (reserved, then captured, exactly like a purchase), and Leash sends the same amount straight on to Sam's
email with **PayPal Payouts**. If PayPal refuses the payout, the capture is refunded at once (and if even the
refund fails, the record says exactly where the money is). If Sam has no PayPal account, PayPal emails Sam a link to
claim it, and returns the money if it isn't claimed within 30 days. A double tap on Approve can't pay twice: each
decision is handled one at a time, and each payout uses its reservation's id, which PayPal won't accept twice.

In the sandbox, the capture reaches Leash's account minus PayPal's fee, and the payout sends the full amount. A real
launch would use PayPal's marketplace setup, since Leash would be passing money between people.

### What's real and what's simulated

| Real                                                                                                            | Simulated                                                                                     |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Every PayPal call (sandbox): Vault, Orders, authorize, capture, void, refund, Payouts, order tracking, webhooks | One sandbox business account stands in for every store you buy from                           |
| Claude Haiku choosing products and payments with tools, and turning your words into lessons, filters and rules  | The attacks are scripted, and skip the AI on purpose, so only the rules stand in the way      |
| Channel3 product search across real online stores, with real photos and prices                                  | The history you see on first open is sample data. It has no PayPal ids, and can't be refunded |
| The tracking number on the PayPal order, and the address from your saved PayPal account                         | Shipping: the stand-in store ships with a made-up UPS number (1ZLEASH…), arriving in 3 days   |
| Supabase storage and live updates                                                                               |                                                                                               |

## How it fits together

```mermaid
flowchart LR
  you([You]) -->|"Restock my coffee, under $60"| claude[Claude Haiku<br/>tool-use agent]
  claude -->|can only call tools| tools[search · check rules · buy · pay · remember]
  tools --> channel3[(Channel3<br/>product search)]
  tools --> rules{Spending rules<br/>pure code, unit tested}
  rules -->|hard rule| blocked[Blocked<br/>PayPal never called]
  rules -->|within every rule| paid[PayPal: authorize + capture]
  rules -->|needs your OK| held[PayPal: authorize<br/>money reserved]
  held --> you2[You, in Leash:<br/>approve or deny + why]
  you2 -->|approve| capture[PayPal: capture]
  capture -->|paying a person| payout[PayPal Payouts<br/>to their email]
  you2 -->|deny| void[PayPal: void]
  void --> twin[Digital twin<br/>Claude turns your reason into a preference]
  twin -.->|next time| claude
```

Claude decides _what_ to buy. Code decides _whether money moves_: every purchase and payment goes through one
function, `server/spending/spending-service.ts`, which applies the rules, calls PayPal, saves the decision and
teaches the twin, in that order, every time.

**Why Claude doesn't get PayPal's own AI tools.** PayPal's Agent Toolkit and MCP server give a model tools like
`create_order` and `capture_order`. That makes the model the last line of defence: one injected sentence, and it
calls them. Leash gives Claude intent-level tools instead ("buy this product", "pay Sam $25, because…"), and keeps
PayPal behind one rule-checked function the model can't skip, change or see the keys for.

## What it can do

- **Talk to it.** Tap **Talk** or hold the space bar and say what you need. Leash tells you what it's doing as it
  goes and answers out loud, using the browser's own speech recognition and voice, so there's nothing to install.
  Ask it what it can do, what's waiting for you, or what you spent on coffee this week, and Claude answers from your
  real account. A spending answer links to the same question in Money.
- **Remember the conversation.** Leash keeps your last 10 exchanges and what it really did in each (bought the beans
  for $14, paid; the grinder is waiting for you), so "how long is the delivery?" or "yes, do that" makes sense, even
  after a reload or on another device. **Start fresh** forgets them; your receipts stay.
- **Track your orders.** _"Where are my beans?"_ Once paid, the store ships to the address on your PayPal account,
  and the tracking number goes on the real PayPal order. Leash answers with the carrier, the tracking number and
  the day it arrives, and the receipt shows it too.
- **Undo by asking.** _"The beans arrived broken, refund them"_: PayPal refunds it, and your twin learns why. Money
  already sent on to a person can't come back, and Leash says so.
- **Know your leash balance.** _"What's my balance?"_ PayPal keeps your PayPal balance private, even from apps
  you've connected, so Leash tells you what it does know: what's left to spend today and this week under your
  rules, and what's reserved for your okay.
- **Say no for you, never yes.** _"Deny the grinder, I only want hand grinders"_: PayPal voids the reservation, and
  your twin learns why. Claude has a tool to deny, and deliberately none to approve, so a scam (or a voice on the TV)
  can never release your money. Only your tap can.
- **Shop like you.** Claude searches real products (Channel3), explains every pick, and avoids things you've said
  no to before.
- **Pay people.** "Pay Sam $25 for dinner." Trusted people are paid within your limits, through PayPal Payouts;
  anyone new waits for you, and so does anyone without a PayPal email yet.
- **Learn your taste.** Deny an $85 grinder and next time it picks the $34 one, and says why. The twin page shows
  everything it has learned, and you can teach it or make it forget.
- **Restock on a schedule.** Say "restock dog food every 30 days" and Leash schedules it (buying nothing now). A
  daily job runs what's due. You aren't there to watch, so everything a restock buys waits for your okay. Your
  restocks sit on a Bryntum timeline: drag the next run to move it.
- **Approve with one tap, right there.** Anything that waits for you has **Approve** and **Deny** wherever you see
  it: under your request, in Waiting for you, in the notifications and on its receipt. The result ("All paid." or
  "You weren't charged.") shows what your twin learned.
- **Ask why, and learn it.** When you deny, say why: "too expensive", "wrong store", or your own words like "I only
  want hand grinders". Claude turns it into a precise preference, and the twin applies it next time.
- **Stay on what you asked for.** Ask for coffee, and anything that isn't coffee (or close to it: beans, a grinder,
  filters) waits for you, however cheap. That makes it much harder for a hijacked assistant to slip extra items into
  your order one small buy at a time.
- **Survive a hijack.** "Try to break the leash" plays three scams against the assistant: $900 to a stranger, gift
  cards from a poisoned product page, and extra items hidden in your coffee order. They skip the AI entirely, so
  only the rules stand in the way, and they hold. The stranger doesn't even end up on your people list.
- **Show everything.** **Money** lists every receipt live in AG Grid, stamped with what happened to the money. Filter
  it by asking ("held payments over $20, biggest first"): Claude turns the question into grid filters and sorting,
  and the totals row adds up exactly what you see. Click a receipt for its PayPal trail: every step and id, the rule
  that applied, the AI's reasoning, and approve, deny or refund. A Bryntum timeline shows how long PayPal held each
  reservation, and how long it would still wait. Money also has a live **Dashboard** built with AG Studio: totals for what was paid, what's waiting for your
  okay, what your leash stopped and what was refunded, plus charts by category, day, rule and payee. Click any bar
  or row and every other widget filters to match, so "Blocked category" instantly shows the gift card your leash
  refused. It updates as your assistant spends, uses Leash's receipt stamps, and **Customise** opens AG Studio's
  drag-and-drop editor.
- **Let any AI agent shop, on the same leash.** The Leash API (`/api/v1`) lets an outside agent, like Claude Desktop
  or your own script, search products, buy and pay people through your rules. It has no way to approve anything. See
  [The Leash API](#the-leash-api-for-any-ai-agent).
- **Rules in your own words.** "Ask me before anything over $30, and no snacks." Claude suggests the change, you see
  each difference, and nothing is saved until you confirm.
- **Never leave money stuck.** A reservation nobody answers is released after 7 days by the daily job.

## The Leash API, for any AI agent

Leash's own assistant is one agent. The Leash API lets any other agent shop and pay through the same rules, the same
PayPal flow and the same digital twin, because each call runs the very same tools. Agents can never approve: there
is no endpoint for it. Anything outside your rules waits for you in Leash.

```bash
# Search: each result says what your twin thinks of it
curl "http://localhost:3000/api/v1/products?query=coffee%20beans"

# Buy: the answer says what happened to the money (auto_approved, held, blocked or failed)
curl -X POST http://localhost:3000/api/v1/purchases -H "Content-Type: application/json" \
  -d '{"productId":"cof-1","reasoning":"Fair-trade beans, well under my budget.","agentName":"My agent"}'
```

| Endpoint                   | What it does                                         |
| -------------------------- | ---------------------------------------------------- |
| `GET /api/v1/products`     | Search products, with your twin's notes              |
| `POST /api/v1/purchases`   | Buy a product, through your rules                    |
| `POST /api/v1/payments`    | Pay a person (someone new always waits for you)      |
| `GET /api/v1/decisions/id` | Check on a purchase or payment, e.g. once you decide |
| `GET /api/v1/rules`        | Read your limits, to plan within them                |

The API is described once, with zod, in `src/schemas/leash-api.ts`. The OpenAPI 3 document is built from those
schemas, served at `/api/v1/openapi.json`, and saved as [`leash-api/src/spec/openapi.json`](leash-api/src/spec/openapi.json),
where APIMatic's tools look for it (see [leash-api/README.md](leash-api/README.md)). A unit test fails if the saved
file falls behind the code.

### Over MCP: Claude shops on your leash

The same tools are an MCP server at `/api/v1/mcp` (Streamable HTTP, written by hand in
[`src/server/leash-api/mcp.ts`](src/server/leash-api/mcp.ts)): `search_products`, `buy_product`, `pay_person`,
`check_decision` and `read_rules`. Connect any MCP client to it:

```bash
claude mcp add --transport http leash https://leash-rzsu.onrender.com/api/v1/mcp   # Claude Code
```

In claude.ai or Claude Desktop, add a custom connector with the same URL. Ask Claude to buy something: within your
rules it's paid at once; anything else waits for your tap in Leash. Ask it to approve, and it can't: there is no
tool for that.

Leash's own endpoints (approve, deny, your rules, your people) only accept changes that come from Leash's pages
(`src/proxy.ts`), so another website, or an agent browsing one, can't approve anything there either. This hackathon
build has no accounts, so that's a guard against other sites rather than real security: a real deployment would sign
you in and give each agent its own key.

## Run it locally (no keys needed)

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # optional: every service has a mock mode
npm run dev
```

Open http://localhost:3000. The welcome steps start: **Continue with PayPal** signs you in as a sample person (there
is no PayPal to visit in mock mode), then set your first limits. On **Ask**, try **"I need a coffee grinder"**.
Approve or deny it under **Waiting for you**, then ask again and watch the assistant choose differently.
**Settings** shows which services are live and which are mocked.

## Turning on the real services

Each service switches from mock to real as soon as its keys are in `.env.local`. Add them in any order.

| Service                        | Keys                                                                                     | Where to get them                                                                                                                                                                                          |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PayPal sandbox**             | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`               | developer.paypal.com > Apps & Credentials > Sandbox > Create App. Turn on **Save payment methods** and **Payouts**. Then **Continue with PayPal** in the app and log in with a sandbox _personal_ account. |
| Sandbox test login (optional)  | `NEXT_PUBLIC_SANDBOX_TEST_EMAIL`, `NEXT_PUBLIC_SANDBOX_TEST_PASSWORD`                    | A sandbox _personal_ account, shown with copy buttons under **Continue with PayPal** so testers can log in. Test money only. These are built into the page, so redeploy after changing them.               |
| PayPal webhooks (optional)     | `PAYPAL_WEBHOOK_ID`                                                                      | In the same app, add a webhook pointing at `https://<your-app>/api/paypal/webhook` for the `PAYMENT.AUTHORIZATION.*`, `PAYMENT.CAPTURE.*` and `PAYMENT.PAYOUTS-ITEM.*` events.                             |
| **Claude** (the assistant)     | `ANTHROPIC_API_KEY`                                                                      | console.anthropic.com. Uses Claude Haiku: a whole demo costs about a dollar.                                                                                                                               |
| **Channel3** (product search)  | `CHANNEL3_API_KEY`                                                                       | channel3.ai                                                                                                                                                                                                |
| **Supabase** (database + live) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Create a project, open the SQL editor and run each file in `supabase/migrations/`, oldest first. The app adds sample data on first start.                                                                  |
| Daily job                      | `CRON_SECRET`                                                                            | Any long random text.                                                                                                                                                                                      |
| Public demo                    | `DEMO_MODE=true`                                                                         | For a shared demo: adds **Reset demo** (in Settings), resets every night, and caps Claude use per visitor (the built-in assistant takes over past the cap).                                                |

Payments to people use PayPal Payouts, which works with any email. To watch one arrive, set the person's email in
**Your leash › People** to a sandbox personal account (developer.paypal.com > Sandbox accounts) and log in to it at
sandbox.paypal.com.

To show a declined card in a demo, set `DEMO_FORCE_DECLINE=true`. PayPal's sandbox then declines every capture
(`INSTRUMENT_DECLINED`) and Money shows the **Failed** receipt with its `debug_id`.

## Deploy on Render

`render.yaml` describes the web app, on Render's free plan. In the Render dashboard choose **New > Blueprint**, pick
this repository, and fill in the keys you have (leave the rest blank for mock mode).

The daily job (release reservations nobody answered for 7 days, run due restocks, keep the database awake) is
`GET /api/keepalive` with `Authorization: Bearer <CRON_SECRET>`. Render cron jobs are paid, so call it once a day from
any scheduler you like. Without it the demo still works: it resets when someone arrives after a quiet spell, and
restocks run from **Run now**.

PayPal sends you back to the app's address after you sign in. Render tells the app its own address, so `APP_URL`
is optional there (set it for a custom domain). Use a paid
instance for a public demo: the free one sleeps when idle and takes up to a minute to wake. Connect Supabase too,
because memory mode forgets the connected PayPal account whenever the app restarts.

## Checks

```bash
npm run check   # type check, lint, unit tests
npm run build   # production build
npm run smoke   # end-to-end demo story; start the app with `ANTHROPIC_API_KEY= npm run dev` first
```

The smoke test uses the scripted assistant, because Claude's choices vary. In demo mode it presses **Reset demo**
first, so it can run again and again. With `ANTHROPIC_API_KEY` set, the
assistant runs on Claude: it chooses the tools itself, but it can only act through them, so every purchase and
payment still passes the spending rules. If Claude can't be reached, the scripted assistant takes over.

## Project structure

```
src/
  app/          Pages and API routes (thin)
  components/   UI, grouped by screen
  lib/          Browser helpers: API client, formatting, labels
  schemas/      Every kind of data, defined once with zod
  server/
    agent/      The assistant (Claude + a scripted fallback) and its tools
    database/   One file per table, in a memory version and a Supabase version
    payments/   PayPal: authorize, capture, void, refund, Payouts, Vault, webhooks
    products/   Product search: Channel3 and a sample catalog
    restocks/   Recurring restocks and the daily job
    spending/   Rule engine and the money path
    twin/       Learning your preferences
supabase/migrations/   Database schema (SQL)
leash-api/             The Leash API's OpenAPI document, laid out for APIMatic
render.yaml            Render deployment
```

See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for the rules every change follows.

## Built with

- **PayPal**: Orders v2 (authorize), Payments v2 (capture, void, refund), Vault v3 (saved payment method, and
  signing in with your PayPal name and email), Payouts v1 (paying people), order tracking (Orders v2), webhooks and negative testing, through
  `@paypal/paypal-server-sdk` and the REST API
- **APIMatic**: PayPal's server SDK, `@paypal/paypal-server-sdk`, is generated by APIMatic, and every payment in
  Leash goes through it. The Leash API's OpenAPI document is kept in APIMatic's project layout, ready for its CLI
  to generate SDKs, a docs portal and a context plugin for AI coding assistants. We built the PayPal side with
  APIMatic's PayPal Context Plugin, which kept us on the SDK's current API: Vault tokens, AUTHORIZE orders,
  order tracking, and errors with PayPal's `debug_id`
- **MCP** (Model Context Protocol): Leash's tools as an MCP server, so any MCP client can shop on your leash
- **Claude** (Anthropic): Claude Haiku, through `@anthropic-ai/sdk`. Tool use for the assistant, and structured
  outputs (checked with zod) for the twin's lessons, Money filters and rules in your own words
- **Channel3**: product search API
- **Supabase**: Postgres and Realtime
- **AG Grid Community**: Money's receipts: external filters and sorting set by Claude (from "Filter by asking", or
  from a spending question you asked out loud), quick filter, a pinned totals row for the rows shown, cell flashing
  when a payment's outcome changes, and themed to look like a list of receipts
- **AG Studio** (AG Grid's dashboard builder, with AG Grid and AG Charts Enterprise inside it): Money's live
  dashboard, with cross-filtering, Leash's stamps in its table, a phone layout, and the drag-and-drop editor.
  `NEXT_PUBLIC_AG_GRID_LICENSE_KEY` removes the trial watermark; it works without one
- **Bryntum Scheduler**: two timelines. Your restocks (drag the next run to move it, with past days refused), and
  money reserved at PayPal (each reservation from authorized to decided, and for one still waiting, Leash's 7 days
  then PayPal's own 29-day limit)
- **Web Speech API**: the browser's own speech recognition and voice, for talking to Leash (Chrome, Edge, Safari)
- **Render**: hosting
- Next.js 16, React 19, TypeScript, zod, Tailwind CSS, Vitest, lucide icons

## License

MIT
