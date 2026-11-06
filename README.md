# Leash

**An AI shopping agent that can spend money, but only inside rules you set.**

You give the agent a goal in plain English. It searches for products, checks each one
against your spending rules, and pays with PayPal:

| Rules say | PayPal does | Result |
|---|---|---|
| Within every rule | authorize, then capture | bought automatically |
| Over the auto-approve limit or goal budget | authorize and **hold** | you approve or deny on your phone |
| You deny | **void** the authorization | money is never taken |
| Blocked category, merchant, cap or max price | nothing | PayPal is never called |

Every decision, with the rule that applied and the AI's reasoning, appears live in an
AG Grid control room.

> Work in progress for the PayPal "Build What's Next with PayPal and AI" hackathon.
> Full documentation (architecture, PayPal Vault flow, deployment on Render) is coming.

## Run it locally (no keys needed)

```bash
npm install
cp .env.example .env.local   # optional: every service has a mock mode
npm run dev
```

Open http://localhost:3000 and try "Restock my coffee setup, under $60, fair-trade beans only".
Badges in the header show which services are live and which are mocked.

```bash
npm test   # rule engine unit tests
```

## Pages

- `/` – give the agent a goal and watch it work
- `/control-room` – AG Grid dashboard of every decision, with approve / deny / refund
- `/approve/[id]` – phone-sized approve or deny screen for a held purchase

## License

MIT
