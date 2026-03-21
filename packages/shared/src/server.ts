import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "@google-cloud/functions-framework";

export function createCloudFunctionHandler(serverFactory: (apiKey: string) => Promise<McpServer>) {
  const accessToken = process.env.FF_MCP_ACCESS_TOKEN ?? null;

  return async (req: Request, res: Response) => {
    if (accessToken && req.headers["x-access-token"] !== accessToken) {
      res.status(401).json({ error: "Invalid or missing X-Access-Token" });
      return;
    }

    const authHeader = req.headers.authorization ?? "";
    const apiKey = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (!apiKey) {
      res.status(401).json({ error: "Missing Authorization header with API key" });
      return;
    }
    const server = await serverFactory(apiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  };
}
