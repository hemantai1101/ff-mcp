import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GscClient } from "../client.js";

export function registerSitemapTools(server: McpServer, gsc: GscClient): void {
  server.registerTool(
    "list_sitemaps",
    {
      description: "List all sitemaps submitted for a Search Console property.",
      inputSchema: {
        site_url: z.string().describe("The verified property URL, e.g. 'https://example.com/'"),
        sitemap_index: z
          .string()
          .optional()
          .describe("Filter to sitemaps under this sitemap index URL"),
      },
    },
    async ({ site_url, sitemap_index }) => {
      const response = await gsc.sitemaps.list({
        siteUrl: site_url,
        sitemapIndex: sitemap_index,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_sitemap",
    {
      description: "Get details for a specific sitemap including processing status and coverage stats.",
      inputSchema: {
        site_url: z.string().describe("The verified property URL"),
        feedpath: z.string().url().describe("The sitemap URL to retrieve details for"),
      },
    },
    async ({ site_url, feedpath }) => {
      const response = await gsc.sitemaps.get({
        siteUrl: site_url,
        feedpath,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );

  server.registerTool(
    "submit_sitemap",
    {
      description: "Submit a sitemap to Google Search Console for indexing.",
      inputSchema: {
        site_url: z.string().describe("The verified property URL"),
        feedpath: z.string().url().describe("The sitemap URL to submit"),
      },
    },
    async ({ site_url, feedpath }) => {
      await gsc.sitemaps.submit({
        siteUrl: site_url,
        feedpath,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, submitted: true, feedpath }, null, 2),
          },
        ],
      };
    }
  );

  server.registerTool(
    "delete_sitemap",
    {
      description: "Delete a sitemap from Google Search Console.",
      inputSchema: {
        site_url: z.string().describe("The verified property URL"),
        feedpath: z.string().url().describe("The sitemap URL to delete"),
      },
    },
    async ({ site_url, feedpath }) => {
      await gsc.sitemaps.delete({
        siteUrl: site_url,
        feedpath,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, deleted: true, feedpath }, null, 2),
          },
        ],
      };
    }
  );
}
