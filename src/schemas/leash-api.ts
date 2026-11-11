// The Leash API (/api/v1): lets any outside AI agent shop and pay through the person's rules.
// It's described once, here. The OpenAPI document below is built from these schemas, served at
// /api/v1/openapi.json and saved as leash-api/src/spec/openapi.json, where APIMatic turns it into
// an SDK, a docs portal and a context plugin for AI coding assistants (see leash-api/README.md).

import { z } from "zod";
import { DecisionSchema } from "./decision";
import { SearchResultSchema } from "./product";
import { SpendingRulesSchema } from "./spending-rules";

const reasoning = z
  .string()
  .trim()
  .min(10)
  .max(500)
  .describe("Why, in one or two plain sentences. The person sees this in their control room.");

const agentName = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .optional()
  .describe("Who is asking, e.g. 'Claude Desktop'. The person sees this in their control room.");

export const ProductSearchQuery = z.object({
  query: z.string().trim().min(2).max(200),
  maxPrice: z.coerce.number().positive().optional(),
});

export const PurchaseBody = z.object({
  productId: z.string().min(1).describe("The id of a product from GET /products"),
  reasoning,
  agentName,
});

export const PaymentBody = z.object({
  personName: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .describe("Who to pay, e.g. 'Sam'. Paying someone new needs the person's OK."),
  amount: z.number().positive().max(10_000).describe("Amount in USD"),
  note: z.string().trim().max(80).default("").describe("What it's for, e.g. 'dinner'"),
  reasoning,
  agentName,
});

export type PurchaseRequest = z.infer<typeof PurchaseBody>;
export type PaymentRequest = z.infer<typeof PaymentBody>;

const ErrorSchema = z.object({ error: z.string().describe("What went wrong, in plain words") });

/** The OpenAPI 3.0 document for the Leash API, built from the schemas above. */
export function leashApiDocument() {
  const schemas = {
    SearchResult: toOpenApi(SearchResultSchema, "output"),
    PurchaseRequest: toOpenApi(PurchaseBody, "input"),
    PaymentRequest: toOpenApi(PaymentBody, "input"),
    Decision: toOpenApi(DecisionSchema, "output"),
    SpendingRules: toOpenApi(SpendingRulesSchema, "output"),
    Error: toOpenApi(ErrorSchema, "output"),
  };
  const body = (name: keyof typeof schemas) => ({
    "application/json": { schema: { $ref: `#/components/schemas/${name}` } },
  });
  const failure = (description: string) => ({ description, content: body("Error") });

  return {
    openapi: "3.0.3",
    info: {
      title: "Leash API",
      version: "1.0.0",
      description:
        "Put any AI agent on a leash. Your agent searches products and asks Leash to buy them or pay people; Leash applies " +
        "the person's spending rules and pays with their PayPal. Within the rules it's paid at once; otherwise PayPal " +
        "reserves the money and the person approves or denies it in Leash. Agents can never approve anything. " +
        "This hackathon build has no accounts: a real deployment would give each agent its own key.",
    },
    servers: [
      {
        url: "{baseUrl}/api/v1",
        description: "Your Leash app",
        variables: { baseUrl: { default: "http://localhost:3000", description: "Where Leash runs" } },
      },
    ],
    paths: {
      "/products": {
        get: {
          operationId: "searchProducts",
          summary: "Search products",
          description:
            "Searches real stores (Channel3), or a sample catalog in mock mode. Each result says what the person's digital twin thinks of it.",
          parameters: [
            {
              name: "query",
              in: "query",
              required: true,
              description: "What to look for, e.g. 'fair-trade coffee beans'",
              schema: { type: "string", minLength: 2, maxLength: 200 },
            },
            {
              name: "maxPrice",
              in: "query",
              required: false,
              description: "Only products at or below this price, in USD",
              schema: { type: "number", minimum: 0, exclusiveMinimum: true },
            },
          ],
          responses: {
            "200": {
              description: "Up to four products",
              content: {
                "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/SearchResult" } } },
              },
            },
            "400": failure("The query is missing or too short"),
          },
        },
      },
      "/purchases": {
        post: {
          operationId: "buyProduct",
          summary: "Buy a product",
          description:
            "Asks Leash to buy a product found with GET /products. The outcome says what happened: auto_approved (paid), held (PayPal reserved the money and the person decides), blocked (a rule said no) or failed.",
          requestBody: { required: true, content: body("PurchaseRequest") },
          responses: {
            "201": { description: "What happened to the money", content: body("Decision") },
            "400": failure("The request doesn't fit the schema"),
            "404": failure("No product with that id: search first"),
          },
        },
      },
      "/payments": {
        post: {
          operationId: "payPerson",
          summary: "Pay a person",
          description:
            "Asks Leash to send money to a person with PayPal. Someone new is added to the person's contacts as not trusted, so the payment waits for their OK.",
          requestBody: { required: true, content: body("PaymentRequest") },
          responses: {
            "201": { description: "What happened to the money", content: body("Decision") },
            "400": failure("The request doesn't fit the schema"),
          },
        },
      },
      "/decisions/{id}": {
        get: {
          operationId: "getDecision",
          summary: "Check a purchase or payment",
          description: "Shows where a purchase or payment stands, e.g. whether the person approved a held one.",
          parameters: [
            { name: "id", in: "path", required: true, description: "The decision id", schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "The purchase or payment", content: body("Decision") },
            "404": failure("No decision with that id"),
          },
        },
      },
      "/rules": {
        get: {
          operationId: "getRules",
          summary: "Read the spending rules",
          description: "The person's limits, so an agent can plan within them.",
          responses: { "200": { description: "The spending rules", content: body("SpendingRules") } },
        },
      },
    },
    components: { schemas },
  };
}

function toOpenApi(schema: z.ZodType, io: "input" | "output") {
  return z.toJSONSchema(schema, { target: "openapi-3.0", io, unrepresentable: "any" });
}
