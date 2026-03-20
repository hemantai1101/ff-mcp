import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import client from "@sendgrid/client";
import { registerTemplateTools } from "./tools/templates.js";
import { registerTemplateVersionTools } from "./tools/template_versions.js";
import { registerDesignTools } from "./tools/designs.js";

export async function createSendGridServer(apiKey: string): Promise<McpServer> {
  client.setApiKey(apiKey);

  const server = new McpServer({
    name: "sendgrid",
    version: "1.0.0",
  });

  registerTemplateTools(server);
  registerTemplateVersionTools(server);
  registerDesignTools(server);

  return server;
}
