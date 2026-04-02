import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GscClient } from "../client.js";

export function registerSiteTools(server: McpServer, gsc: GscClient): void {
  server.registerTool(
    "list_sites",
    {
      description: "List all sites (properties) verified in Google Search Console.",
      inputSchema: {},
    },
    async () => {
      const response = await gsc.sites.list({});
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_site",
    {
      description: "Get details for a specific Search Console property including permission level.",
      inputSchema: {
        site_url: z
          .string()
          .describe(
            "The property URL, e.g. 'https://example.com/' or 'sc-domain:example.com'"
          ),
      },
    },
    async ({ site_url }) => {
      const response = await gsc.sites.get({
        siteUrl: site_url,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "add_site",
    {
      description: "Add a new site to Google Search Console. Requires site ownership verification afterward.",
      inputSchema: {
        site_url: z.string().url().describe("The URL of the site to add"),
      },
    },
    async ({ site_url }) => {
      await gsc.sites.add({
        siteUrl: site_url,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, added: true, site_url }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "delete_site",
    {
      description: "Remove a site from Google Search Console.",
      inputSchema: {
        site_url: z
          .string()
          .describe(
            "The property URL to remove, e.g. 'https://example.com/' or 'sc-domain:example.com'"
          ),
      },
    },
    async ({ site_url }) => {
      await gsc.sites.delete({
        siteUrl: site_url,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, deleted: true, site_url }, null, 2),
          },
        ],
      };
    }
  );
}
