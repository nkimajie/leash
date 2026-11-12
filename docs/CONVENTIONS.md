# Project conventions

How Leash is organised, and the rules every change follows. Read this before adding code.

## Folder structure

```
src/
  app/                      Routes only. Pages and API endpoints stay thin.
    (dashboard)/            Pages that share the sidebar: Ask, Money, Your leash (tabs: limits, people,
                            restocks, PayPal, agents) and Twin
    welcome/                First visit: sign in with PayPal, set your leash, meet your twin (no sidebar)
    api/                    HTTP endpoints. Each one: validate input -> call a server function -> return JSON
  components/               React components, grouped by screen
    ui/                     Shared building blocks from the V2 design system: Button, Card, Stamp, ReceiptCard,
                            LeashMeter, Segmented, Chip, Sheet, Illustration
    layout/                 App shell (sidebar, tabs), logo, notifications, profile, settings, help
    assistant/ money/ approvals/ people/ twin/ restocks/ rules/ connect/ agents/ welcome/
  lib/                      Browser-safe helpers: API client, formatting, labels, hooks, the attack scripts,
                            and voice (use-voice-input.ts listens, speak.ts talks back)
  schemas/                  SCHEMA SECTION. Zod schemas + TypeScript types for every kind of data
  server/                   Server-only code (never imported by components)
    agent/                  AGENT SECTION. The assistant, its tools, and request parsing
      tools/                One file per tool the assistant can use
      ask-claude.ts         One small question to Claude with a zod-checked answer (Money filters, rules, twin)
      read-*.ts             Pure built-in readers used when Claude is off, each with unit tests
      what-leash-can-do.ts  What Leash can do, in its own words: Claude and the built-in assistant answer from it
    database/               DATABASE SECTION. One file per table, in two versions with the same functions:
      memory/               no setup, resets on restart (used when Supabase keys are missing)
      supabase/             the real Postgres database; adds sample data to an empty database
      index.ts              picks one; TypeScript checks both versions match
    payments/               PayPal: authorize, capture, void, refund, Payouts, connecting with Vault, webhooks (+ mock)
    products/               Product search: Channel3 (+ sample catalog)
    restocks/               Recurring restocks and the daily job
    spending/               The rule engine and the money path
    twin/                   The digital twin: learning preferences from your decisions (and your reasons)
    config/                 Environment variables and service modes
    demo-mode.ts            Public demo for judges: reset to sample data
supabase/migrations/        SQL schema for the database
scripts/                    Developer scripts (smoke test)
docs/                       Documentation
```

## The rules

1. **Money only moves through `server/spending/spending-service.ts`.** Never call PayPal from a route, tool or component. The spending service applies the rules, calls PayPal, saves the decision and teaches the twin, in that order, every time.
2. **The rule engine is pure.** `server/spending/check-spending-rules.ts` and `server/twin/learn-preferences.ts` have no database or network calls, so they can be unit-tested. Keep them that way.
3. **Schemas are the single source of truth.** Define data once in `src/schemas/` with zod and infer the TypeScript type with `z.infer`. API routes validate every request body with a schema.
4. **Every outside service has a mock mode.** PayPal, Claude, Channel3 and Supabase each fall back to a mock when their keys are missing, so anyone can run the app with zero setup. A new integration must do the same. Every small Claude feature has a pure built-in fallback (`agent/read-*.ts`), used when Claude is off or its answer doesn't fit the schema.
5. **Secrets stay on the server.** Only `NEXT_PUBLIC_*` variables may reach the browser. Files in `src/server/` start with `import "server-only";` so an accidental import from a component fails the build.
6. **Routes stay thin.** A route reads input with `readJsonBody(request, Schema)`, calls one server function, and returns `Response.json(...)`. Wrap handlers in `apiRoute(...)` so errors become clear JSON. Throw `NotFoundError`, `ConflictError` or `BadRequestError` from `server/errors.ts` for expected failures.
7. **GET routes that read changing data call `await connection()`** (from `next/server`), or Next.js may freeze the response at build time.
8. **Components never call `fetch` directly.** Use the functions in `src/lib/api-client.ts`.
9. **A new table gets both versions.** Add it to `database/memory/` and `database/supabase/` with the same functions, plus the SQL in `supabase/migrations/`. The build fails if the two versions don't match.

## Naming

- Files: `kebab-case.ts`. Components: `PascalCase`. Functions: verbs that say what happens (`approveHeldDecision`, `findPayeeByName`, `lessonFromYourDecision`).
- Database access is grouped by table: `database.decisions.listDecisions()`, `database.payees.addPayee(...)`.
- Use plain words a reader understands without context: "held", "paid automatically", "denied, not charged".
- TypeScript uses camelCase; the SQL schema uses snake_case. Repositories translate between them.

## Outcomes (what happened to the money)

| Outcome         | Meaning                          | PayPal                              | Stamp on screen |
| --------------- | -------------------------------- | ----------------------------------- | --------------- |
| `auto_approved` | Within every rule                | authorized, then captured           | Paid            |
| `held`          | Needs your okay                  | authorized (money reserved)         | Reserved        |
| `approved`      | You said yes                     | captured                            | Paid            |
| `denied`        | You said no                      | authorization voided, never charged | Released        |
| `blocked`       | A hard rule said no              | never called                        | Blocked         |
| `refunded`      | Money returned                   | refunded                            | Refunded        |
| `failed`        | PayPal error, e.g. card declined | voided; `debug_id` saved            | Failed          |

The stamps, their colours and their PayPal wording live in `src/lib/labels.ts` (`OUTCOME_STYLE`).

Paying a person: once the money is captured, PayPal Payouts sends it on to their email (the payout id is saved).
If PayPal refuses the payout, the capture is refunded and the outcome is `failed` (PayPal status `REFUNDED`, or
`REFUND_FAILED` with the capture id in the explanation). Money sent to a person can't be refunded.

## Checks before every commit

```bash
npm run check    # type check + lint + unit tests
npm run build    # production build
npm run smoke    # end-to-end demo story (needs `ANTHROPIC_API_KEY= npm run dev` running)
```

Format with `npm run format`. Commit small, working steps with short, imperative messages ("Add pay-person tool").
