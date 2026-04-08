import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerDatabaseTools(server: McpServer, client: Client) {
  server.registerTool(
    "query_database",
    {
      annotations: { readOnlyHint: true },
      description:
        "Query a Notion database with optional property filters, sorts, and pagination. " +
        "The filter param accepts a raw Notion filter object — see https://developers.notion.com/reference/post-database-query-filter for the full filter syntax. " +
        "Supports all text operators (starts_with, ends_with, contains, equals, is_empty, etc.) and compound AND/OR filters. " +
        "Returns matching pages and a next_cursor for pagination.",
      inputSchema: {
        database_id: z.string().describe("The Notion database ID (UUID with or without dashes)"),
        filter: z
          .record(z.unknown())
          .optional()
          .describe(
            "Notion filter object. Examples: " +
            '{ "property": "Name", "rich_text": { "starts_with": "CM-SG" } } or ' +
            '{ "and": [{ "property": "Status", "status": { "equals": "Active" } }, { "property": "ID", "rich_text": { "starts_with": "CM" } }] }'
          ),
        sorts: z
          .array(
            z.object({
              property: z.string().describe("Property name to sort by"),
              direction: z.enum(["ascending", "descending"]),
            })
          )
          .optional()
          .describe('Sort order, e.g. [{ "property": "Name", "direction": "ascending" }]'),
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
    async ({ database_id, filter, sorts, start_cursor, page_size }) => {
      const result = await client.databases.query({
        database_id,
        ...(filter && { filter: filter as Parameters<typeof client.databases.query>[0]["filter"] }),
        ...(sorts && { sorts }),
        ...(start_cursor && { start_cursor }),
        ...(page_size && { page_size }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
