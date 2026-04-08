import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerSearchTools(server: McpServer, client: Client) {
  server.registerTool(
    "search",
    {
      annotations: { readOnlyHint: true },
      description:
        "Search across Notion pages and databases by title. " +
        "Returns matching pages and databases. " +
        "Filter by object type (page or database) and sort results.",
      inputSchema: {
        query: z.string().optional().describe(
          "Search query to match against page and database titles. Omit to list all accessible content."
        ),
        filter: z.any().optional().describe(
          'Filter by object type. E.g. {"value": "page", "property": "object"} or {"value": "database", "property": "object"}'
        ),
        sort: z.any().optional().describe(
          'Sort order. E.g. {"direction": "descending", "timestamp": "last_edited_time"}'
        ),
        start_cursor: z
          .string()
          .optional()
          .describe("Pagination cursor from a previous response's next_cursor field"),
        page_size: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Number of results to return (1–100, default 100)"),
      },
    },
    async ({ query, filter, sort, start_cursor, page_size }) => {
      const result = await client.search({
        ...(query && { query }),
        ...(filter && { filter }),
        ...(sort && { sort }),
        ...(start_cursor && { start_cursor }),
        ...(page_size && { page_size }),
      } as Parameters<typeof client.search>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
