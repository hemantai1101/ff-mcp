import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerUserTools(server: McpServer, client: Client) {
  // ─── get_users ──────────────────────────────────────────────────────────────

  server.registerTool(
    "get_users",
    {
      annotations: { readOnlyHint: true },
      description:
        "List all users in the Notion workspace. " +
        "Returns workspace members with their IDs, names, and avatar URLs. " +
        "Supports cursor-based pagination.",
      inputSchema: {
        start_cursor: z
          .string()
          .optional()
          .describe("Pagination cursor from a previous response's next_cursor field"),
        page_size: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .describe("Number of users to return (1–100, default 100)"),
      },
    },
    async ({ start_cursor, page_size }) => {
      const result = await client.users.list({
        ...(start_cursor && { start_cursor }),
        ...(page_size && { page_size }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── get_user ───────────────────────────────────────────────────────────────

  server.registerTool(
    "get_user",
    {
      annotations: { readOnlyHint: true },
      description:
        'Get a specific Notion user by ID. Pass "me" to get the current authenticated user (bot).',
      inputSchema: {
        user_id: z.string().describe('The user ID (UUID) or "me" for the current user'),
      },
    },
    async ({ user_id }) => {
      const result = user_id === "me"
        ? await client.users.me({})
        : await client.users.retrieve({ user_id });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
