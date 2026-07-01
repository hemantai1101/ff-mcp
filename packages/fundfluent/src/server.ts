import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildFundFluentClient } from "./client.js";
import { registerStoryTools } from "./tools/stories.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerFundingOptionTools } from "./tools/funding_options.js";
import { registerFunderTools } from "./tools/funders.js";
import { registerInterestTools } from "./tools/interests.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerDocumentTools } from "./tools/documents.js";
import { registerDocumentSetTools } from "./tools/document_sets.js";

// Demo token → company ID map. Add entries here for each demo account.
const DEMO_TOKENS: Record<string, string> = {
  "ffl_71b12ed7b6d970f101fac2952776575081554d46cefdbe67": "6879cdaf2737368469b0bcb3",
};

export async function createFundFluentServer(apiKey: string): Promise<McpServer> {
  const companyId = DEMO_TOKENS[apiKey];
  if (!companyId) throw new Error(`Unknown access token: ${apiKey}`);

  const client = buildFundFluentClient(companyId);

  const server = new McpServer({ name: "fundfluent", version: "1.0.0" });

  registerStoryTools(server, client, companyId);
  registerTaskTools(server, client, companyId);
  registerFundingOptionTools(server, client);
  registerFunderTools(server, client);
  registerInterestTools(server, client, companyId);
  registerCommentTools(server, client, companyId);
  registerDocumentTools(server, client, companyId);
  registerDocumentSetTools(server, client, companyId);

  return server;
}
