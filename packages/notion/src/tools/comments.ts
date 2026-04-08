import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerCommentTools(server: McpServer, client: Client) {
  // ─── get_comments ───────────────────────────────────────────────────────────

  server.registerTool(
    "get_comments",
    {
      annotations: { readOnlyHint: true },
      description:
        "Retrieve comments on a Notion page or block. " +
        "Returns a list of comment objects with their content and metadata.",
      inputSchema: {
        block_id: z.string().describe(
          "The page or block ID to get comments for (UUID with or without dashes)"
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
          .describe("Number of comments to return (1–100, default 100)"),
      },
    },
    async ({ block_id, start_cursor, page_size }) => {
      const result = await client.comments.list({
        block_id,
        ...(start_cursor && { start_cursor }),
        ...(page_size && { page_size }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── create_comment ─────────────────────────────────────────────────────────

  server.registerTool(
    "create_comment",
    {
      annotations: { readOnlyHint: false },
      description:
        "Add a comment to a Notion page. " +
        "To start a new discussion, provide parent.page_id. " +
        "To reply to an existing discussion, provide discussion_id instead.",
      inputSchema: {
        rich_text: z.any().describe(
          'Comment content as rich text array. E.g. [{"type": "text", "text": {"content": "Great work!"}}]'
        ),
        parent: z.any().optional().describe(
          'Parent page for a new top-level comment. E.g. {"page_id": "uuid"}'
        ),
        discussion_id: z.string().optional().describe(
          "ID of an existing discussion to reply to"
        ),
      },
    },
    async ({ rich_text, parent, discussion_id }) => {
      const result = await client.comments.create({
        rich_text,
        ...(parent && { parent }),
        ...(discussion_id && { discussion_id }),
      } as Parameters<typeof client.comments.create>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
