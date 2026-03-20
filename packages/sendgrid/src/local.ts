import "dotenv/config";
import { createSendGridServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) throw new Error("SENDGRID_API_KEY environment variable is required");
  const server = await createSendGridServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
