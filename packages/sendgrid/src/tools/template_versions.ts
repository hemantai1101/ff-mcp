import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import client from "@sendgrid/client";

const versionFields = {
  name: z.string().max(100).describe("Version name (max 100 characters)"),
  subject: z.string().max(255).describe("Email subject line (max 255 characters)"),
  html_content: z.string().optional().describe("HTML body content (max 1MB)"),
  plain_content: z.string().optional().describe("Plain text body content (max 1MB). Auto-generated from HTML if omitted."),
  generate_plain_content: z.boolean().optional().describe("Auto-generate plain text from HTML (default: true)"),
  active: z.union([z.literal(0), z.literal(1)]).optional().describe("Set as the active version: 1 = active, 0 = inactive"),
  editor: z.enum(["code", "design"]).optional().describe("Editor type used to create this version"),
  test_data: z.string().optional().describe("Mock JSON for dynamic template variable substitution during testing"),
};

export function registerTemplateVersionTools(server: McpServer) {
  server.registerTool(
    "create_template_version",
    {
      description: "Create a new version for a dynamic email template",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
        ...versionFields,
      },
    },
    async ({ template_id, ...fields }) => {
      const [_, body] = await client.request({
        method: "POST",
        url: `/v3/templates/${template_id}/versions`,
        body: fields,
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "get_template_version",
    {
      description: "Retrieve a specific version of a dynamic email template",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
        version_id: z.string().describe("The template version ID"),
      },
    },
    async ({ template_id, version_id }) => {
      const [_, body] = await client.request({
        method: "GET",
        url: `/v3/templates/${template_id}/versions/${version_id}`,
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "update_template_version",
    {
      description: "Update the content or settings of a specific template version",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
        version_id: z.string().describe("The template version ID"),
        name: versionFields.name.optional(),
        subject: versionFields.subject.optional(),
        html_content: versionFields.html_content,
        plain_content: versionFields.plain_content,
        generate_plain_content: versionFields.generate_plain_content,
        active: versionFields.active,
        editor: versionFields.editor,
        test_data: versionFields.test_data,
      },
    },
    async ({ template_id, version_id, ...fields }) => {
      const [_, body] = await client.request({
        method: "PATCH",
        url: `/v3/templates/${template_id}/versions/${version_id}`,
        body: fields,
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "delete_template_version",
    {
      description: "Delete a specific version of a dynamic email template",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
        version_id: z.string().describe("The template version ID to delete"),
      },
    },
    async ({ template_id, version_id }) => {
      await client.request({
        method: "DELETE",
        url: `/v3/templates/${template_id}/versions/${version_id}`,
      });
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true, template_id, version_id }) }] };
    }
  );

  server.registerTool(
    "activate_template_version",
    {
      description: "Set a specific template version as the active version for sending",
      inputSchema: {
        template_id: z.string().describe("The SendGrid template ID"),
        version_id: z.string().describe("The template version ID to activate"),
      },
    },
    async ({ template_id, version_id }) => {
      const [_, body] = await client.request({
        method: "POST",
        url: `/v3/templates/${template_id}/versions/${version_id}/activate`,
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );
}
