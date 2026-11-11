import "server-only";

import { z } from "zod";
import * as database from "@/server/database";
import { defineTool } from "./define-tool";

export const recallPreferencesTool = defineTool({
  name: "recall_preferences",
  description:
    "List what the user's digital twin knows: things they like and things they avoid. Use before choosing products.",
  inputSchema: z.object({}),
  async run() {
    const preferences = await database.preferences.listPreferences();
    if (preferences.length === 0) return { summary: "Nothing remembered yet.", data: [] };
    return {
      summary: preferences.map((p) => `${p.sentiment === "likes" ? "Likes" : "Avoids"}: ${p.statement}`).join("\n"),
      data: preferences,
    };
  },
});

export const rememberPreferenceTool = defineTool({
  name: "remember_preference",
  description: "Save something new the user told you about their taste, so their digital twin remembers it next time.",
  inputSchema: z.object({
    sentiment: z.enum(["likes", "avoids"]),
    statement: z.string().trim().min(3).max(240).describe("Plain-English statement, e.g. 'Prefers oat milk'"),
    category: z.string().trim().min(1).optional().describe("Product category it applies to, if any"),
  }),
  async run({ sentiment, statement, category }) {
    await database.preferences.addPreference({ sentiment, statement, category: category ?? null, source: "you" });
    return { summary: `Remembered: ${statement}` };
  },
});
