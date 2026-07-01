import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient } from "../client.js";

const INTEREST_TYPES = ["Bookmark", "Like", "Good", "Surprise", "Huh"] as const;

export function registerInterestTools(server: McpServer, client: FundFluentClient, companyId: string) {
  server.registerTool(
    "list_interests",
    {
      annotations: { readOnlyHint: true },
      description: "List the company's interests (reactions) on funding programs. Interest types: Bookmark (saved), Like, Good, Surprise, Huh.",
      inputSchema: {
        type: z.enum(INTEREST_TYPES).optional()
          .describe("Filter by interest type: 'Bookmark', 'Like', 'Good', 'Surprise', 'Huh'. Omit for all types."),
        fundingOptionId: z.string().optional().describe("Filter by a specific funding option ID"),
        limit: z.number().optional().describe("Max results per page"),
        page: z.number().optional().describe("Page number (1-based)"),
      },
    },
    async ({ type, fundingOptionId, limit, page }) => {
      const data = await client.fo("/interest", {
        query: {
          companyId,
          originType: "Company",
          origin: companyId,
          with: "FundingOption",
          for: fundingOptionId,
          type,
          limit,
          page,
        },
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "add_interest",
    {
      annotations: { readOnlyHint: false },
      description: "Add an interest/reaction to a funding program. Use 'Bookmark' to save it for later, or other types to react.",
      inputSchema: {
        fundingOptionId: z.string().describe("The funding option ID"),
        type: z.enum(INTEREST_TYPES).default("Bookmark")
          .describe("Interest type: 'Bookmark' (save for later), 'Like', 'Good', 'Surprise', 'Huh'"),
      },
    },
    async ({ fundingOptionId, type }) => {
      const data = await client.fo("/interest", {
        method: "POST",
        body: JSON.stringify({
          origin: companyId,
          originType: "Company",
          with: "FundingOption",
          for: fundingOptionId,
          type,
        }),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "remove_interest",
    {
      annotations: { readOnlyHint: false },
      description: "Remove an interest/reaction from a funding program.",
      inputSchema: {
        interestId: z.string().describe("The interest ID to remove"),
      },
    },
    async ({ interestId }) => {
      await client.fo(`/interest/${interestId}`, { method: "DELETE" });
      return { content: [{ type: "text", text: JSON.stringify({ success: true, interestId }, null, 2) }] };
    }
  );
}
