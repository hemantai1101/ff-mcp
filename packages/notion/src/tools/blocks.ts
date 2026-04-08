import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerBlockTools(server: McpServer, client: Client) {
  // ─── get_block_children ─────────────────────────────────────────────────────

  server.registerTool(
    "get_block_children",
    {
      annotations: { readOnlyHint: true },
      description:
        "Retrieve the children blocks of a Notion page or block. " +
        "Use this to fetch the body content of a page. " +
        "Supports pagination via start_cursor and page_size.",
      inputSchema: {
        block_id: z.string().describe(
          "The page or block ID whose children to retrieve (UUID with or without dashes)"
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
          .describe("Number of blocks to return (1–100, default 100)"),
      },
    },
    async ({ block_id, start_cursor, page_size }) => {
      const result = await client.blocks.children.list({
        block_id,
        ...(start_cursor && { start_cursor }),
        ...(page_size && { page_size }),
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── append_block_children ──────────────────────────────────────────────────

  server.registerTool(
    "append_block_children",
    {
      annotations: { readOnlyHint: false },
      description:
        "Append new block children to a Notion page or block. " +
        "Use this to add content to a page. " +
        "Blocks are appended after existing content.",
      inputSchema: {
        block_id: z.string().describe(
          "The page or block ID to append children to (UUID with or without dashes)"
        ),
        children: z.any().describe(
          "Array of Notion block objects to append. " +
          'E.g. [{"object":"block","type":"paragraph","paragraph":{"rich_text":[{"type":"text","text":{"content":"Hello"}}]}}]'
        ),
        after: z
          .string()
          .optional()
          .describe("The ID of an existing block to insert the new blocks after"),
      },
    },
    async ({ block_id, children, after }) => {
      const result = await client.blocks.children.append({
        block_id,
        children,
        ...(after && { after }),
      } as Parameters<typeof client.blocks.children.append>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── delete_block ────────────────────────────────────────────────────────────

  server.registerTool(
    "delete_block",
    {
      annotations: { readOnlyHint: false, destructiveHint: true },
      description: "Archive (delete) a Notion block by ID.",
      inputSchema: {
        block_id: z.string().describe("The block ID to delete (UUID with or without dashes)"),
      },
    },
    async ({ block_id }) => {
      const result = await client.blocks.delete({ block_id });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
