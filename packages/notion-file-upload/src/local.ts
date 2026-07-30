import "dotenv/config";
import { createNotionFileUploadServer } from "./server.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

async function main() {
  const apiKey = process.env.NOTION_FILE_UPLOAD_TOKEN;
  if (!apiKey) throw new Error("NOTION_FILE_UPLOAD_TOKEN environment variable is required");
  const server = await createNotionFileUploadServer(apiKey);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
