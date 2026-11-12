# The Leash API

Put any AI agent on a leash. Your agent searches products and asks Leash to buy them or pay people; Leash applies
the person's spending rules and pays with their PayPal. Within the rules it's paid at once. Otherwise PayPal reserves
the money and the person approves or denies it in Leash. **Agents can never approve anything**: there is no endpoint
for it.

`src/spec/openapi.json` is the OpenAPI 3.0 description, in the folder layout APIMatic's tools expect.

## Use it

Base address: `http://localhost:3000/api/v1` locally, or your Leash app's address plus `/api/v1`.

| Endpoint              | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `GET /products`       | Search products. Each result says what the person's twin thinks |
| `POST /purchases`     | Buy a product found with `GET /products`                        |
| `POST /payments`      | Pay a person. Someone new always waits for the person's okay    |
| `GET /decisions/{id}` | Check on a purchase or payment, e.g. after the person decides   |
| `GET /rules`          | Read the person's limits, to plan within them                   |
| `GET /openapi.json`   | This description, live                                          |

The same tools are also an MCP server at `/api/v1/mcp`, for Claude Desktop, claude.ai connectors and Claude Code:
`claude mcp add --transport http leash https://leash-rzsu.onrender.com/api/v1/mcp`.

```bash
curl "http://localhost:3000/api/v1/products?query=coffee%20beans&maxPrice=20"

curl -X POST http://localhost:3000/api/v1/purchases -H "Content-Type: application/json" \
  -d '{"productId":"cof-1","reasoning":"Fair-trade beans, well under my budget.","agentName":"My agent"}'
```

Every purchase and payment answers with a decision: `outcome` is `auto_approved` (paid), `held` (PayPal reserved the
money and the person decides), `blocked` (a rule said no, PayPal was never called) or `failed`. The person sees your
`agentName` and `reasoning` on the receipt in Leash.

This hackathon build has no accounts, so there is no API key: a real deployment would give each agent its own key.

## Keep it in sync

The API is described once, with zod, in `src/schemas/leash-api.ts`, and this file is generated from it. After
changing the API, run `npm run openapi`. A unit test fails if this file falls behind the code.

## Generate an SDK, a docs portal and a context plugin with APIMatic

With an APIMatic account (`npx @apimatic/cli auth login`), from the project root:

```bash
npx @apimatic/cli api validate --file leash-api/src/spec/openapi.json
npx @apimatic/cli sdk generate -l typescript -i leash-api        # a typed TypeScript SDK
npx @apimatic/cli portal generate -i leash-api                   # a docs portal with an API playground
npx @apimatic/cli plugin generate -i leash-api                   # a context plugin for AI coding assistants
```
