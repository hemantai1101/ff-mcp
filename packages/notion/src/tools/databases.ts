import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { z } from "zod";

export function registerDatabaseSchemaTools(server: McpServer, client: Client) {
  // ─── get_database ───────────────────────────────────────────────────────────

  server.registerTool(
    "get_database",
    {
      annotations: { readOnlyHint: true },
      description:
        "Retrieve a Notion database schema by ID. " +
        "Returns the database title, description, and all property definitions.",
      inputSchema: {
        database_id: z.string().describe(
          "The database ID (UUID with or without dashes) or a notion.so URL"
        ),
      },
    },
    async ({ database_id }) => {
      const result = await client.databases.retrieve({ database_id });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── create_database ────────────────────────────────────────────────────────

  server.registerTool(
    "create_database",
    {
      annotations: { readOnlyHint: false },
      description:
        "Create a new Notion database with a custom schema. " +
        "Provide the parent page, title, and properties map defining the schema.",
      inputSchema: {
        parent: z.any().describe(
          'Parent page. E.g. {"page_id": "uuid", "type": "page_id"}'
        ),
        title: z.any().describe(
          'Database title as rich text array. E.g. [{"type": "text", "text": {"content": "My Database"}}]'
        ),
        properties: z.any().describe(
          "Property schema map. Key = property name, value = property configuration. " +
          'E.g. {"Name": {"title": {}}, "Status": {"select": {"options": [{"name": "Active", "color": "green"}]}}, "Due Date": {"date": {}}}'
        ),
        is_inline: z.boolean().optional().describe("Whether the database is inline in a page"),
      },
    },
    async ({ parent, title, properties, is_inline }) => {
      const result = await client.databases.create({
        parent,
        title,
        properties,
        ...(is_inline !== undefined && { is_inline }),
      } as Parameters<typeof client.databases.create>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  // ─── update_database ────────────────────────────────────────────────────────

  server.registerTool(
    "update_database",
    {
      annotations: { readOnlyHint: false },
      description:
        "Update a Notion database's title, description, or property schema. " +
        "Add, remove, or modify properties. Only include fields you want to change.",
      inputSchema: {
        database_id: z.string().describe("The database ID to update (UUID with or without dashes)"),
        title: z.any().optional().describe(
          'New title as rich text array. E.g. [{"type": "text", "text": {"content": "New Name"}}]'
        ),
        description: z.any().optional().describe(
          "New description as rich text array."
        ),
        properties: z.any().optional().describe(
          "Property schema updates. To add a property, include its config. " +
          "To remove a property, set it to null. To rename, include a 'name' key in the property config."
        ),
      },
    },
    async ({ database_id, title, description, properties }) => {
      const result = await client.databases.update({
        database_id,
        ...(title && { title }),
        ...(description && { description }),
        ...(properties && { properties }),
      } as Parameters<typeof client.databases.update>[0]);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );
}
