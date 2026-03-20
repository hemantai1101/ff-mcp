import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import client from "@sendgrid/client";

const designFields = {
  name: z.string().optional().describe("Design name"),
  html_content: z.string().optional().describe("HTML body content (max 1MB)"),
  plain_content: z.string().optional().describe("Plain text content (max 1MB). Auto-generated from HTML if omitted."),
  subject: z.string().optional().describe("Design subject line"),
  editor: z.enum(["code", "design"]).optional().describe("Editor type: 'code' or 'design'"),
};

export function registerDesignTools(server: McpServer) {
  server.registerTool(
    "list_designs",
    {
      description: "List all designs from the SendGrid design library. Supports cursor-based pagination.",
      inputSchema: {
        page_size: z.number().min(1).max(100).optional().describe("Number of designs per page (1–100, default 100)"),
        page_token: z.string().optional().describe("Pagination token from previous response metadata"),
        summary: z.boolean().optional().describe("Set to false to include full HTML/plain content in results (default: true, summary only)"),
      },
    },
    async ({ page_size = 100, page_token, summary }) => {
      const qs: Record<string, unknown> = { page_size };
      if (page_token) qs.page_token = page_token;
      if (summary !== undefined) qs.summary = summary;
      const [_, body] = await client.request({ method: "GET", url: "/v3/designs", qs });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "get_design",
    {
      description: "Get a specific design from the SendGrid design library",
      inputSchema: {
        design_id: z.string().describe("The SendGrid design ID"),
      },
    },
    async ({ design_id }) => {
      const [_, body] = await client.request({ method: "GET", url: `/v3/designs/${design_id}` });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "create_design",
    {
      description: "Create a new design in the SendGrid design library",
      inputSchema: {
        html_content: z.string().describe("HTML body content (max 1MB)"),
        name: designFields.name,
        plain_content: designFields.plain_content,
        subject: designFields.subject,
        editor: designFields.editor,
      },
    },
    async (fields) => {
      const [_, body] = await client.request({ method: "POST", url: "/v3/designs", body: fields });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "update_design",
    {
      description: "Update an existing design in the SendGrid design library",
      inputSchema: {
        design_id: z.string().describe("The SendGrid design ID to update"),
        name: designFields.name,
        html_content: designFields.html_content,
        plain_content: designFields.plain_content,
        subject: designFields.subject,
        editor: designFields.editor,
      },
    },
    async ({ design_id, ...fields }) => {
      const [_, body] = await client.request({ method: "PATCH", url: `/v3/designs/${design_id}`, body: fields });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "delete_design",
    {
      description: "Delete a design from the SendGrid design library",
      inputSchema: {
        design_id: z.string().describe("The SendGrid design ID to delete"),
      },
    },
    async ({ design_id }) => {
      await client.request({ method: "DELETE", url: `/v3/designs/${design_id}` });
      return { content: [{ type: "text", text: JSON.stringify({ deleted: true, design_id }) }] };
    }
  );

  server.registerTool(
    "duplicate_design",
    {
      description: "Duplicate an existing design from the SendGrid design library",
      inputSchema: {
        design_id: z.string().describe("The SendGrid design ID to duplicate"),
        name: z.string().optional().describe("Name for the duplicated design (default: 'Duplicate: <original name>')"),
        editor: designFields.editor,
      },
    },
    async ({ design_id, ...fields }) => {
      const [_, body] = await client.request({ method: "POST", url: `/v3/designs/${design_id}`, body: fields });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "list_prebuilt_designs",
    {
      description: "List all SendGrid pre-built design templates from the design library",
      inputSchema: {
        page_size: z.number().min(1).max(100).optional().describe("Number of designs per page (1–100, default 100)"),
        page_token: z.string().optional().describe("Pagination token from previous response metadata"),
        summary: z.boolean().optional().describe("Set to false to include full content in results (default: true, summary only)"),
      },
    },
    async ({ page_size = 100, page_token, summary }) => {
      const qs: Record<string, unknown> = { page_size };
      if (page_token) qs.page_token = page_token;
      if (summary !== undefined) qs.summary = summary;
      const [_, body] = await client.request({ method: "GET", url: "/v3/designs/pre-builts", qs });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "get_prebuilt_design",
    {
      description: "Retrieve a specific SendGrid pre-built design template",
      inputSchema: {
        design_id: z.string().describe("The SendGrid pre-built design ID"),
      },
    },
    async ({ design_id }) => {
      const [_, body] = await client.request({ method: "GET", url: `/v3/designs/pre-builts/${design_id}` });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.registerTool(
    "duplicate_prebuilt_design",
    {
      description: "Duplicate a SendGrid pre-built design into your own design library",
      inputSchema: {
        design_id: z.string().describe("The SendGrid pre-built design ID to duplicate"),
        name: z.string().optional().describe("Name for the duplicated design (default: 'Duplicate: <original name>')"),
        editor: designFields.editor,
      },
    },
    async ({ design_id, ...fields }) => {
      const [_, body] = await client.request({ method: "POST", url: `/v3/designs/pre-builts/${design_id}`, body: fields });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );
}
