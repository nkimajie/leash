import "server-only";

import { z } from "zod";
import { LEASH_PAGE, LEASH_PAGES } from "@/schemas";
import { defineTool } from "./define-tool";

export const openPageTool = defineTool({
  name: "open_page",
  description:
    "Open one of Leash's pages when the user asks to go there: Money (every purchase and payment), their limits (spending rules), the people they pay, restocks, their PayPal account, or their twin.",
  inputSchema: z.object({ page: z.enum(LEASH_PAGES) }),
  async run({ page }) {
    return { summary: `Opening ${LEASH_PAGE[page].label}.`, openPage: LEASH_PAGE[page] };
  },
});
