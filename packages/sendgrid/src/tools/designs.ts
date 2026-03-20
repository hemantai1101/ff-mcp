import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import client from "@sendgrid/client";

export function registerDesignTools(server: McpServer) {
  server.tool(
    "list_designs",
    "List all designs from the SendGrid design library",
    {},
    async () => {
      const [_, body] = await client.request({
        method: "GET",
        url: "/v3/designs",
        qs: { page_size: 100 },
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );

  server.tool(
    "get_design",
    "Get a specific design from the SendGrid design library",
    { design_id: z.string().describe("The SendGrid design ID") },
    async ({ design_id }) => {
      const [_, body] = await client.request({
        method: "GET",
        url: `/v3/designs/${design_id}`,
      });
      return { content: [{ type: "text", text: JSON.stringify(body, null, 2) }] };
    }
  );
}
