import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildGscClient } from "./client.js";
import { registerSearchAnalyticsTools } from "./tools/search_analytics.js";
import { registerUrlInspectionTools } from "./tools/url_inspection.js";
import { registerSitemapTools } from "./tools/sitemaps.js";
import { registerSiteTools } from "./tools/sites.js";

export async function createSearchConsoleServer(apiKey: string): Promise<McpServer> {
  const gsc = buildGscClient(apiKey);

  const server = new McpServer({
    name: "searchconsole",
    version: "1.0.0",
  });

  registerSearchAnalyticsTools(server, gsc);
  registerUrlInspectionTools(server, gsc);
  registerSitemapTools(server, gsc);
  registerSiteTools(server, gsc);

  return server;
}
