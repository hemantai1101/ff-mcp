import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import client from "@sendgrid/client";
import { getSecret } from "@mcp/shared";
import { registerTemplateTools } from "./tools/templates.js";
import { registerDesignTools } from "./tools/designs.js";

export async function createSendGridServer(): Promise<McpServer> {
  const apiKey = await getSecret("SENDGRID_API_KEY");
  client.setApiKey(apiKey);

  const server = new McpServer({
    name: "sendgrid",
    version: "1.0.0",
  });

  registerTemplateTools(server);
  registerDesignTools(server);

  return server;
}
