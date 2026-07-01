import "dotenv/config";
import { createFundFluentServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  const apiKey = process.env.FF_API_KEY;
  if (!apiKey) throw new Error("FF_API_KEY environment variable is required");
  const server = await createFundFluentServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
