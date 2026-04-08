import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@notionhq/client";
import { registerDatabaseTools } from "./tools/database.js";
import { registerDatabaseSchemaTools } from "./tools/databases.js";
import { registerPageTools } from "./tools/pages.js";
import { registerBlockTools } from "./tools/blocks.js";
import { registerSearchTools } from "./tools/search.js";
import { registerCommentTools } from "./tools/comments.js";
import { registerUserTools } from "./tools/users.js";

export async function createNotionServer(apiKey: string): Promise<McpServer> {
  const client = new Client({ auth: apiKey });
  const server = new McpServer({ name: "notion", version: "1.0.0" });

  registerDatabaseTools(server, client);       // query_database
  registerDatabaseSchemaTools(server, client); // get_database, create_database, update_database
  registerPageTools(server, client);           // fetch, create_page, update_page, move_page
  registerBlockTools(server, client);          // get_block_children, append_block_children, delete_block
  registerSearchTools(server, client);         // search
  registerCommentTools(server, client);        // get_comments, create_comment
  registerUserTools(server, client);           // get_users, get_user

  return server;
}
