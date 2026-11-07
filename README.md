# Leash

**A personal assistant that spends and sends money like you would, but only inside rules you set.**

Leash is an AI assistant with a PayPal wallet and a leash. Ask it to restock your coffee or pay a friend back,
and it searches, decides, and pays. Every payment is checked against your spending rules first, and anything
outside them is **reserved but not taken** until you approve it on your phone. It also learns your taste from
every approve, deny and refund, like a digital twin.

## For judges: a 60-second test

1. Open the live demo (link in the Devpost submission). PayPal is already connected to a sandbox account, so you
   don't need to log in to anything.
2. On **Assistant**, click **"Restock my coffee setup, under $60…"**. Watch Claude search, check the rules and pay.
   The beans are paid; the $85 grinder is **held**: PayPal has reserved the money but not taken it.
3. Scan the QR code (or click **Open approval screen**) and tap **Deny**. Say why, in your own words. PayPal voids the
   reservation, and the screen shows what your twin learned. Ask for a grinder again: it picks differently.
4. Click **Try to break the leash** and pick an attack. A scam "takes over" the assistant, and the rules stop the money
   anyway.
5. Open **Control room** and ask it a question in plain English, e.g. _"what did I spend on coffee this week?"_.
   Click any row to see each PayPal step with its id.

Everyone shares one demo account. **Reset demo** (bottom left) puts it back to the start, and it resets every night.

## How the money moves

| Your rules say                                             | PayPal does                     | You see                                        |
| ---------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| Within every rule                                          | authorize, then capture         | Paid automatically                             |
| Over your auto-approve limit, over budget, or a new person | authorize and **hold**          | Waiting for you: approve or deny on your phone |
| You deny                                                   | **void** the authorization      | Denied, never charged. Your twin remembers.    |
| Blocked category, merchant, cap or hard limit              | nothing; PayPal is never called | Blocked by rules                               |
| You refund                                                 | refund the capture              | Refunded. Your twin remembers.                 |

You connect your PayPal account once with **PayPal Vault**. After that the assistant pays with the saved account,
so there is no PayPal popup for every purchase, and the authorize-then-capture flow is what makes "held" possible.

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
  held --> phone[Your phone:<br/>approve or deny + why]
  phone -->|approve| capture[PayPal: capture]
  phone -->|deny| void[PayPal: void]
  void --> twin[Digital twin<br/>Claude turns your reason into a preference]
  twin -.->|next time| claude
```

Claude decides _what_ to buy. Code decides _whether money moves_: every purchase and payment goes through one
function, `server/spending/spending-service.ts`, which applies the rules, calls PayPal, saves the decision and
teaches the twin, in that order, every time.

## What it can do

- **Shop like you.** Claude searches real products (Channel3), explains every pick, and avoids things you've said
  no to before.
- **Pay people.** "Pay Sam $25 for dinner." Trusted people are paid within your limits; anyone new waits for you.
- **Learn your taste.** Deny an $85 grinder and next time it picks the $34 one, and says why. The twin page shows
  everything it has learned, and you can teach it or make it forget.
- **Restock on a schedule.** "Restock dog food every 30 days." A daily job runs what's due. You aren't there to
  watch, so everything a restock buys waits for your OK.
- **Approve from your phone.** Anything held shows a QR code. Scan it, approve or deny, and the desktop updates live.
- **Ask why, and learn it.** When you deny, say why: "too expensive", "wrong store", or your own words like "I only
  want hand grinders". Claude turns it into a precise preference, and the twin applies it next time.
- **Survive a hijack.** "Try to break the leash" plays three scams against the assistant: $900 to a stranger, gift
  cards from a poisoned product page, and draining the budget in small buys. They skip the AI entirely, so only the
  rules stand in the way, and they hold.
- **Show everything.** The AG Grid control room lists every decision live, with the rule that applied, the AI's
  reasoning, the PayPal status and `debug_id`, and approve, deny and refund buttons. Ask it questions in plain
  English ("held payments over $20, biggest first"): Claude turns them into grid filters and sorting, and the totals
  row adds up exactly what you see. Click a row to see each PayPal step with its id.
- **Rules in your own words.** "Ask me before anything over $30, and no snacks." Claude suggests the change, you see
  each difference, and nothing is saved until you confirm.
- **Never leave money stuck.** A reservation nobody answers is released after 7 days by the daily job.

## Run it locally (no keys needed)

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # optional: every service has a mock mode
npm run dev
```

Open http://localhost:3000 and try **"I need a coffee grinder"**. Approve or deny it under "Waiting for you",
then ask again and watch the assistant choose differently. The sidebar shows which services are live and which
are mocked.

## Turning on the real services

Each service switches from mock to real as soon as its keys are in `.env.local`. Add them in any order.

| Service                        | Keys                                                                                     | Where to get them                                                                                                                                                                         |
| ------------------------------ | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PayPal sandbox**             | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`               | developer.paypal.com > Apps & Credentials > Sandbox > Create App. Turn on **Save payment methods**. Then open **Connect PayPal** in the app and log in with a sandbox _personal_ account. |
| PayPal webhooks (optional)     | `PAYPAL_WEBHOOK_ID`                                                                      | In the same app, add a webhook pointing at `https://<your-app>/api/paypal/webhook` for the `PAYMENT.AUTHORIZATION.*` and `PAYMENT.CAPTURE.*` events.                                      |
| **Claude** (the assistant)     | `ANTHROPIC_API_KEY`                                                                      | console.anthropic.com. Uses Claude Haiku: a whole demo costs about a dollar.                                                                                                              |
| **Channel3** (product search)  | `CHANNEL3_API_KEY`                                                                       | channel3.ai                                                                                                                                                                               |
| **Supabase** (database + live) | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Create a project, open the SQL editor and run `supabase/migrations/20261106000000_initial_schema.sql`. The app adds sample data on first start.                                           |
| Daily job                      | `CRON_SECRET`                                                                            | Any long random text.                                                                                                                                                                     |
| Public demo                    | `DEMO_MODE=true`                                                                         | For a shared demo: adds **Reset demo**, resets every night, hides **Disconnect**, and caps Claude use per visitor (the built-in assistant takes over past the cap).                       |

To pay a person for real in the sandbox, set their PayPal email on the **People** page to a sandbox account's
email (developer.paypal.com > Sandbox accounts).

To show a declined card in a demo, set `DEMO_FORCE_DECLINE=true`. PayPal's sandbox then declines every capture
(`INSTRUMENT_DECLINED`) and the control room shows the failure with its `debug_id`.

## Deploy on Render

`render.yaml` describes everything. In the Render dashboard choose **New > Blueprint**, pick this repository, and
fill in the keys you have (leave the rest blank for mock mode). It creates:

- **leash**: the web app
- **leash-daily**: a cron job that calls `/api/keepalive` once a day, to keep the database awake and run due
  restocks

After the first deploy, set `APP_URL` to the app's address (e.g. `https://leash.onrender.com`).

## Checks

```bash
npm run check   # type check, lint, unit tests
npm run build   # production build
npm run smoke   # end-to-end demo story; start the app with `ANTHROPIC_API_KEY= npm run dev` first
```

The smoke test uses the scripted assistant, because Claude's choices vary. With `ANTHROPIC_API_KEY` set, the
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
    payments/   PayPal: authorize, capture, void, refund, Vault, webhooks
    products/   Product search: Channel3 and a sample catalog
    restocks/   Recurring restocks and the daily job
    spending/   Rule engine and the money path
    twin/       Learning your preferences
supabase/migrations/   Database schema (SQL)
render.yaml            Render deployment
```

See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for the rules every change follows.

## Built with

- **PayPal**: Orders v2 (authorize, capture, void), Payments v2 (refund), Vault v3 (saved payment method),
  webhooks and negative testing, through `@paypal/paypal-server-sdk`
- **Claude** (Anthropic): Claude Haiku, through `@anthropic-ai/sdk`. Tool use for the assistant, and structured
  outputs (checked with zod) for the twin's lessons, control room questions and rules in your own words
- **Channel3**: product search API
- **Supabase**: Postgres and Realtime
- **AG Grid Community**: the control room grid: external filters and sorting set by Claude, quick filter, a pinned
  totals row for the rows shown, cell flashing on live updates, and row selection for the PayPal step-by-step view
- **Render**: hosting and the daily cron job
- Next.js 16, React 19, TypeScript, zod, Tailwind CSS, Vitest, lucide icons

## License

MIT
