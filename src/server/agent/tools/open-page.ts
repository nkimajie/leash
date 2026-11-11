import "server-only";

import { z } from "zod";
import { LEASH_PAGE, LEASH_PAGES } from "@/schemas";
import { defineTool } from "./define-tool";

export const openPageTool = defineTool({
  name: "open_page",
  description:
    "Open one of Leash's pages when the user asks to go there: Money (every purchase and payment), their limits (spending rules), the people they pay, restocks, their PayPal account, or their twin. When they want a limit changed, open limits with suggestedChange: the page shows that change ready for them to confirm. You can't change anything yourself; nothing changes until they save.",
  inputSchema: z.object({
    page: z.enum(LEASH_PAGES),
    suggestedChange: z
      .string()
      .trim()
      .max(200)
      .optional()
      .describe("Only for limits: the change in plain words, e.g. 'Never buy one item over $600'"),
  }),
  async run({ page, suggestedChange }) {
    if (page === "limits" && suggestedChange) {
      return {
        summary: `Opening your limits, with "${suggestedChange}" ready for you to confirm. Nothing changes until you save.`,
        openPage: {
          ...LEASH_PAGE.limits,
          path: `${LEASH_PAGE.limits.path}?change=${encodeURIComponent(suggestedChange)}`,
        },
      };
    }
    return { summary: `Opening ${LEASH_PAGE[page].label}.`, openPage: LEASH_PAGE[page] };
  },
});
