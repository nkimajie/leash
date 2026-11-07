import "server-only";

// One small question to Claude with a typed answer. Used by the twin ("why did you say no?"),
// the control room ("show me held payments") and the rules page ("never spend over $30 on snacks").
// Claude's answer must fit the zod schema; if Claude is off or the answer doesn't fit, callers
// get null and use their simple built-in version instead.

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { serviceModes } from "@/server/config/environment";

const MODEL = "claude-haiku-5-5";

let claude: Anthropic | null = null;

export async function askClaudeFor<Schema extends z.ZodType>(
  schema: Schema,
  instructions: string,
  question: string,
): Promise<z.infer<Schema> | null> {
  if (serviceModes().assistant !== "claude") return null;
  claude ??= new Anthropic();
  try {
    const response = await claude.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system: instructions,
      messages: [{ role: "user", content: question }],
    });
    const parsed = schema.safeParse(response.parsed_output);
    return parsed.success ? parsed.data : null;
  } catch (error) {
    console.warn("Claude couldn't answer, using the built-in version instead", error);
    return null;
  }
}
