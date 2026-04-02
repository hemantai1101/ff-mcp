import "dotenv/config";
import { createSearchConsoleServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  const credential = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credential) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON environment variable is required");
  }
  const server = await createSearchConsoleServer(credential);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
