import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import client from "@sendgrid/client";

export function registerTemplateTools(server: McpServer) {
  server.registerTool(
    "list_templates",
    {
      description: "List all dynamic email templates in SendGrid. Supports cursor-based pagination via page_token.",
      inputSchema: {
        page_size: z.number().min(1).max(200).optional().describe("Number of templates per page (1–200, default 100)"),
        page_token: z.string().optional().describe("Pagination token from previous response metadata"),
      },
    },
    async ({ page_size = 100, page_token }) => {
      const qs: Record<string, unknown> = { generations: "dynamic", page_size };
      if (page_token) qs.page_token = page_token;
      const [_, body] = await client.request({ method: "GET", url: "/v3/templates", qs });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "get_template",
    {
      description: "Get a SendGrid dynamic template with all its versions",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
      },
    },
    async ({ template_id }) => {
      const [_, body] = await client.request({ method: "GET", url: `/v3/templates/${template_id}` });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "create_template",
    {
      description: "Create a new dynamic email template",
      inputSchema: {
        name: z.string().max(100).describe("Template name (max 100 characters)"),
      },
    },
    async ({ name }) => {
      const [_, body] = await client.request({
        method: "POST",
        url: "/v3/templates",
        body: { name, generation: "dynamic" },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "update_template",
    {
      description: "Rename an existing dynamic email template",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
        name: z.string().max(100).describe("New template name (max 100 characters)"),
      },
    },
    async ({ template_id, name }) => {
      const [_, body] = await client.request({
        method: "PATCH",
        url: `/v3/templates/${template_id}`,
        body: { name },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "delete_template",
    {
      description: "Delete a dynamic email template and all its versions",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID to delete"),
      },
    },
    async ({ template_id }) => {
      await client.request({ method: "DELETE", url: `/v3/templates/${template_id}` });
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true, template_id }) }] };
    }
  );

  server.registerTool(
    "duplicate_template",
    {
      description: "Duplicate an existing dynamic email template",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID to duplicate"),
        name: z.string().max(100).optional().describe("Name for the duplicated template"),
      },
    },
    async ({ template_id, name }) => {
      const body: Record<string, unknown> = {};
      if (name) body.name = name;
      const [_, responseBody] = await client.request({
        method: "POST",
        url: `/v3/templates/${template_id}/duplicate`,
        body,
      });
      return { content: [{ type: "text", text: JSON.stringify(responseBody, null, 2) }] };
    }
  );
}
