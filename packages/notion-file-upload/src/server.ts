import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createNotionClient } from "./client.js";
import { registerFileUploadTools } from "./tools/files.js";

export async function createNotionFileUploadServer(apiKey: string): Promise<McpServer> {
  const client = createNotionClient(apiKey);
  const server = new McpServer({ name: "notion-file-upload", version: "1.0.0" });

  registerFileUploadTools(server, client);

  return server;
}
