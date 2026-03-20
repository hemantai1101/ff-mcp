import "dotenv/config";
import { createSendGridServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  const server = await createSendGridServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
