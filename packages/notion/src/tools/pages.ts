import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerPageTools(server: McpServer, client: Client) {
  // ─── fetch ──────────────────────────────────────────────────────────────────

  server.registerTool(
    "fetch",
    {
      annotations: { readOnlyHint: true },
      description:
        "Retrieve a Notion page or database by ID or URL. " +
        "For pages, returns all properties and metadata. " +
        "For databases, returns schema and property definitions. " +
        "Pass include_content: true to also fetch the page's block children (body content).",
      inputSchema: {
        id: z.string().describe(
          "Notion page or database ID (UUID with or without dashes) or a notion.so URL"
        ),
        include_content: z
          .boolean()
          .optional()
          .describe("Also fetch the page's block children (body content). Default false."),
      },
    },
    async ({ id, include_content }) => {
      // Normalize ID — strip URL to UUID
      const normalized = id
        .replace(/^https?:\/\/(?:www\.)?notion\.so\/(?:[^/]+\/)?/, "")
        .replace(/\?.*$/, "")
        .split("-").pop()! // last segment is always the UUID without dashes
        || id;
      const cleanId = id.includes("notion.so")
        ? id.replace(/^https?:\/\/(?:www\.)?notion\.so\/(?:[^/]+\/)?[^?]*?([a-f0-9]{32}).*$/, "$1")
        : id;

      let result: Record<string, unknown>;
      let type: "page" | "database" = "page";

      try {
        result = await client.pages.retrieve({ page_id: cleanId }) as unknown as Record<string, unknown>;
      } catch {
        try {
          result = await client.databases.retrieve({ database_id: cleanId }) as unknown as Record<string, unknown>;
          type = "database";
        } catch (e2) {
          throw e2;
        }
      }

      const output: Record<string, unknown> = { ...result };

      if (include_content && type === "page") {
        const blocks = await client.blocks.children.list({ block_id: cleanId });
        output.content = blocks;
      }

      return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
    }
  );

  // ─── create_page ────────────────────────────────────────────────────────────

  server.registerTool(
    "create_page",
    {
      annotations: { readOnlyHint: false },
      description:
        "Create a new Notion page. " +
        "Parent can be a page (page_id) or a database (database_id). " +
        "For database pages, provide properties matching the database schema. " +
        "Optionally provide block children as page body content.",
      inputSchema: {
        parent: z.any().describe(
          'Parent location. One of: {"page_id": "uuid"} or {"database_id": "uuid"}'
        ),
        properties: z.any().describe(
          "Page properties. For standalone pages, include {\"title\": [{\"text\": {\"content\": \"Page title\"}}]}. " +
          "For database pages, use the database schema property names."
        ),
        children: z.any().optional().describe(
          "Array of Notion block objects for page body content."
        ),
        icon: z.any().optional().describe(
          'Page icon. E.g. {"type": "emoji", "emoji": "🚀"} or {"type": "external", "external": {"url": "https://..."}}'
        ),
        cover: z.any().optional().describe(
          'Page cover. E.g. {"type": "external", "external": {"url": "https://..."}}'
        ),
      },
    },
    async ({ parent, properties, children, icon, cover }) => {
      const result = await client.pages.create({
        parent,
        properties,
        ...(children && { children }),
        ...(icon && { icon }),
        ...(cover && { cover }),
      } as Parameters<typeof client.pages.create>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── update_page ────────────────────────────────────────────────────────────

  server.registerTool(
    "update_page",
    {
      annotations: { readOnlyHint: false },
      description:
        "Update a Notion page's properties, icon, cover, or archive status. " +
        "Fetch the page first to get the current property schema. " +
        "Only include properties you want to change — other properties are unchanged.",
      inputSchema: {
        page_id: z.string().describe("The page ID to update (UUID with or without dashes)"),
        properties: z.any().optional().describe(
          "Map of property names to new values. Use the exact property names from the page schema."
        ),
        archived: z.boolean().optional().describe("Set to true to archive (trash) the page."),
        icon: z.any().optional().describe(
          'New icon. E.g. {"type": "emoji", "emoji": "✅"} or null to remove.'
        ),
        cover: z.any().optional().describe(
          'New cover image. E.g. {"type": "external", "external": {"url": "https://..."}} or null to remove.'
        ),
      },
    },
    async ({ page_id, properties, archived, icon, cover }) => {
      const result = await client.pages.update({
        page_id,
        ...(properties && { properties }),
        ...(archived !== undefined && { archived }),
        ...(icon !== undefined && { icon }),
        ...(cover !== undefined && { cover }),
      } as Parameters<typeof client.pages.update>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── move_page ──────────────────────────────────────────────────────────────

  server.registerTool(
    "move_page",
    {
      annotations: { readOnlyHint: false },
      description: "Move a Notion page or database to a new parent page or database.",
      inputSchema: {
        page_id: z.string().describe("The page or database ID to move"),
        new_parent: z.any().describe(
          'New parent location. One of: {"page_id": "uuid"} or {"database_id": "uuid"}'
        ),
      },
    },
    async ({ page_id, new_parent }) => {
      const result = await client.pages.update({
        page_id,
        parent: new_parent,
      } as Parameters<typeof client.pages.update>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
