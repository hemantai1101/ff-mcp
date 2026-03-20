import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "@google-cloud/functions-framework";

export function createCloudFunctionHandler(serverFactory: () => Promise<McpServer>) {
  return async (req: Request, res: Response) => {
    const server = await serverFactory();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
}
