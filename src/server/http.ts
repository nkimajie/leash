import "server-only";

// Helpers that keep every API route short: validate the body, run the work, and turn
// known errors into clear JSON responses.

import { unstable_rethrow as rethrowNextInternalErrors } from "next/navigation";
import { z } from "zod";
import type { AssistantEvent } from "@/schemas";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "./errors";
import { PayPalError } from "./payments/paypal-error";

/** Reads the JSON body and checks it against a schema. Throws a 400 error if it doesn't fit. */
export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestError(z.prettifyError(parsed.error));
  return parsed.data;
}

/** Reads the URL's query string and checks it against a schema. Throws a 400 error if it doesn't fit. */
export function readSearchParams<T>(request: Request, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) throw new BadRequestError(z.prettifyError(parsed.error));
  return parsed.data;
}

/** Streams assistant steps to the browser as they happen, one JSON object per line. */
export function streamEvents(events: AsyncIterable<AssistantEvent>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const event of events) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** Wraps a route handler so errors become `{ error: "..." }` responses with the right status code. */
export function apiRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      rethrowNextInternalErrors(error); // let Next.js handle its own signals (e.g. from connection())
      if (
        error instanceof BadRequestError ||
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof UnauthorizedError
      ) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      if (error instanceof PayPalError) {
        const debug = error.debugId ? ` (debug_id ${error.debugId})` : "";
        return Response.json({ error: `PayPal: ${error.message}${debug}` }, { status: 502 });
      }
      console.error("Unexpected API error", error);
      return Response.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}
