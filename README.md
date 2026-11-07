# Leash

**A personal assistant that spends and sends money like you would, but only inside rules you set.**

Leash is an AI assistant with a PayPal wallet and a leash. Ask it to restock your coffee or pay a friend back,
and it searches, decides, and pays. Every payment is checked against your spending rules first, and anything
outside them is **reserved but not taken** until you approve it on your phone. It also learns your taste from
every approve, deny and refund, like a digital twin.

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

## What it can do

- **Shop like you.** Claude searches real products (Channel3), explains every pick, and avoids things you've said
  no to before.
- **Pay people.** "Pay Sam $25 for dinner." Trusted people are paid within your limits; anyone new waits for you.
- **Learn your taste.** Deny an $85 grinder and next time it picks the $34 one, and says why. The twin page shows
  everything it has learned, and you can teach it or make it forget.
- **Restock on a schedule.** "Restock dog food every 30 days." A daily job runs what's due. You aren't there to
  watch, so everything a restock buys waits for your OK.
- **Show everything.** The AG Grid control room lists every decision live, with the rule that applied, the AI's
  reasoning, the PayPal status and `debug_id`, and approve, deny and refund buttons.

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
- **Claude** (Anthropic): Claude Haiku with tool use, through `@anthropic-ai/sdk`
- **Channel3**: product search API
- **Supabase**: Postgres and Realtime
- **AG Grid Community**: the control room grid
- **Render**: hosting and the daily cron job
- Next.js 16, React 19, TypeScript, zod, Tailwind CSS, Vitest, lucide icons

## License

MIT
