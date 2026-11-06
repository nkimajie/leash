# Leash

**A personal assistant that spends and sends money like you would, but only inside rules you set.**

Leash is an AI assistant with a PayPal wallet and a leash. Ask it to restock your coffee or pay a friend back,
and it searches, decides, and pays. Every payment is checked against your spending rules first, and anything
outside them is **reserved but not taken** until you approve it on your phone. It also learns your taste from
every approve, deny and refund, like a digital twin.

## How the money moves

| Your rules say | PayPal does | You see |
|---|---|---|
| Within every rule | authorize, then capture | Paid automatically |
| Over your auto-approve limit, over budget, or a new person | authorize and **hold** | Waiting for you: approve or deny on your phone |
| You deny | **void** the authorization | Denied, never charged. Your twin remembers. |
| Blocked category, merchant, cap or hard limit | nothing; PayPal is never called | Blocked by rules |
| You refund | refund the capture | Refunded. Your twin remembers. |

## What it can do

- **Shop like you.** Finds products, explains every pick, and avoids things you've said no to before.
- **Pay people.** "Pay Sam $25 for dinner." Trusted people are paid within your limits; anyone new waits for you.
- **Learn your taste.** The twin page shows everything it has learned, and you can teach it or make it forget.
- **Show everything.** The AG Grid control room lists every decision live, with the rule that applied, the AI's
  reasoning, the PayPal status and `debug_id`, and approve, deny and refund buttons.

## Run it locally (no keys needed)

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # optional: every service has a mock mode
npm run dev
```

Open http://localhost:3000 and try **"Restock my coffee setup, under $60, fair-trade beans only"**. Then deny
the grinder, ask again, and watch the assistant choose differently. The sidebar shows which services are live
and which are mocked.

```bash
npm run check   # type check, lint, unit tests
npm run smoke   # end-to-end demo story against the running app
```

## Project structure

```
src/
  app/          Pages and API routes (thin)
  components/   UI, grouped by screen
  lib/          Browser helpers: API client, formatting, labels
  schemas/      Every kind of data, defined once with zod
  server/
    agent/      The assistant and its tools
    database/   One repository per table
    payments/   PayPal: authorize, capture, void, refund
    spending/   Rule engine and the money path
    twin/       Learning your preferences
supabase/migrations/   Database schema (SQL)
```

See [docs/CONVENTIONS.md](docs/CONVENTIONS.md) for the rules every change follows.

## Status

Built for the PayPal "Build What's Next with PayPal and AI" hackathon. Done so far: rules, PayPal flow and
assistant in mock mode, digital twin, people, control room, phone approvals. Next: PayPal sandbox with Vault,
the Claude agent, Channel3 search, Supabase with live updates, and deployment on Render.

## License

MIT
