import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FundFluentClient } from "../client.js";

export function registerFunderTools(server: McpServer, client: FundFluentClient) {
  server.registerTool(
    "list_funders",
    {
      annotations: { readOnlyHint: true },
      description: "List funding organizations (government bodies, banks, VCs, etc.) that provide funding programs.",
      inputSchema: {
        name: z.string().optional().describe("Filter by funder name"),
        limit: z.number().optional().describe("Max results (default 20)"),
        page: z.number().optional().describe("Page number (1-based)"),
        sort: z.string().optional().describe("Sort field. Prefix with - for descending, e.g. -updatedAt"),
      },
    },
    async ({ name, limit, page, sort }) => {
      const data = await client.fo("/funders", { query: { name, limit, page, sort } });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_funder",
    {
      annotations: { readOnlyHint: true },
      description: "Get details of a specific funding organization by ID.",
      inputSchema: {
        funderId: z.string().describe("The funder ID"),
      },
    },
    async ({ funderId }) => {
      const data = await client.fo(`/funders/${funderId}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_funder_by_slug",
    {
      annotations: { readOnlyHint: true },
      description: "Get details of a funding organization by its slug.",
      inputSchema: {
        slug: z.string().describe("The funder slug, e.g. 'innovation-and-technology-commission'"),
      },
    },
    async ({ slug }) => {
      const data = await client.fo(`/funders/slug/${slug}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
