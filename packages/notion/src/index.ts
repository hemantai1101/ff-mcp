import express from "express";
import { mcpAuthRouter, getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { NotionOAuthProvider } from "./auth/provider.js";
import { createNotionServer } from "./server.js";

// ─── Config ─────────────────────────────────────────────────────────────────

const BASE_URL = (process.env.NOTION_MCP_BASE_URL ?? "https://mcp.fluentlab.co").replace(/\/$/, "");
const ISSUER_URL = new URL(BASE_URL);
const SERVER_URL = new URL(`${BASE_URL}/notion-mcp`);

const provider = new NotionOAuthProvider();
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(SERVER_URL);

// ─── Express app ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.json());

// Claude Code compatibility: ensure Accept header satisfies StreamableHTTP requirement
app.use((_req, _res, next) => {
  _req.headers["accept"] = "application/json, text/event-stream";
  next();
});

// ─── OAuth endpoints ─────────────────────────────────────────────────────────
// These are served at root paths (/.well-known/*, /authorize, /token, /register)
// and reached via dedicated path rules in the GCP URL map.
app.use(
  mcpAuthRouter({
    provider,
    issuerUrl: ISSUER_URL,
    resourceServerUrl: SERVER_URL,
    resourceName: "Notion MCP",
    scopesSupported: [],
  })
);

// ─── Notion OAuth callback ────────────────────────────────────────────────────
// Notion redirects here after user authorization.
// Routed by the /notion-mcp/* path rule in the GCP URL map.
app.get("/notion-mcp/oauth/callback", (req, res) => {
  provider.handleCallback(req, res).catch((err) => {
    console.error("OAuth callback error:", err);
    res.status(500).send("Internal server error during OAuth callback");
  });
});

// ─── MCP endpoint ─────────────────────────────────────────────────────────────
// All MCP requests arrive at /notion-mcp (or /notion-mcp/*) and require a valid
// Notion access token (Bearer). The token is verified via the Notion API.
const bearerAuth = requireBearerAuth({ verifier: provider, resourceMetadataUrl });

async function mcpRequestHandler(
  req: express.Request,
  res: express.Response
): Promise<void> {
  const apiKey = (req as any).auth.token as string;
  const server = await createNotionServer(apiKey);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

app.all("/notion-mcp", bearerAuth, mcpRequestHandler);
app.all("/notion-mcp/*", bearerAuth, mcpRequestHandler);

// ─── Cloud Function export ────────────────────────────────────────────────────
export const notionMcp = (req: express.Request, res: express.Response) => app(req, res);

