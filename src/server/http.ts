import "server-only";

// Helpers that keep every API route short: validate the body, run the work, and turn
// known errors into clear JSON responses.

import { unstable_rethrow as rethrowNextInternalErrors } from "next/navigation";
import { z } from "zod";
import { BadRequestError, ConflictError, NotFoundError } from "./errors";

/** Reads the JSON body and checks it against a schema. Throws a 400 error if it doesn't fit. */
export async function readJsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => undefined);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new BadRequestError(z.prettifyError(parsed.error));
  return parsed.data;
}

/** Wraps a route handler so errors become `{ error: "..." }` responses with the right status code. */
export function apiRoute<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      rethrowNextInternalErrors(error); // let Next.js handle its own signals (e.g. from connection())
      if (error instanceof BadRequestError || error instanceof NotFoundError || error instanceof ConflictError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      console.error("Unexpected API error", error);
      return Response.json({ error: "Something went wrong on our side." }, { status: 500 });
    }
  };
}
