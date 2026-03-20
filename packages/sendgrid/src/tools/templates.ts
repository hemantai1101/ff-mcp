import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import client from "@sendgrid/client";
import { toMcpError } from "@mcp/shared";

export function registerTemplateTools(server: McpServer) {
  server.tool(
    "list_templates",
    "List all dynamic email templates in SendGrid",
    {},
    async () => {
      const [_, body] = await client.request({
        method: "GET",
        url: "/v3/templates",
        qs: { generations: "dynamic", page_size: 100 },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.tool(
    "get_template",
    "Get a SendGrid template with all its versions",
    { template_id: z.string().describe("The SendGrid template ID") },
    async ({ template_id }) => {
      const [_, body] = await client.request({
        method: "GET",
        url: `/v3/templates/${template_id}`,
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.tool(
    "create_template",
    "Create a new dynamic email template",
    { name: z.string().describe("Template name") },
    async ({ name }) => {
      const [_, body] = await client.request({
        method: "POST",
        url: "/v3/templates",
        body: { name, generation: "dynamic" },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );
}
