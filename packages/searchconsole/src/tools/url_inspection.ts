import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GscClient } from "../client.js";

export function registerUrlInspectionTools(server: McpServer, gsc: GscClient): void {
  server.registerTool(
    "inspect_url",
    {
      annotations: { readOnlyHint: true },
      description:
        "Inspect a URL's status in the Google index. Returns indexing status, last crawl date, " +
        "mobile usability issues, rich results validation, and AMP status. " +
        "Rate limit: ~2,000 inspections per day per property — use judiciously.",
      inputSchema: {
        inspection_url: z.string().url().describe("The URL to inspect"),
        site_url: z.string().describe(
          "The Search Console property this URL belongs to, e.g. 'https://example.com/' or 'sc-domain:example.com'"
        ),
        language_code: z
          .string()
          .optional()
          .describe("Language code for localized issue messages, e.g. 'en-US'. Default: en-US"),
      },
    },
    async ({ inspection_url, site_url, language_code }) => {
      const response = await gsc.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: inspection_url,
          siteUrl: site_url,
          languageCode: language_code ?? "en-US",
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
      };
    }
  );
}
