import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { registerDatabaseTools } from "./tools/database.js";

export async function createNotionServer(apiKey: string): Promise<McpServer> {
  const client = new Client({ auth: apiKey });
  const server = new McpServer({ name: "notion", version: "1.0.0" });
  registerDatabaseTools(server, client);
  return server;
}
