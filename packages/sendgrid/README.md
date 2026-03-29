# SendGrid MCP Server

An MCP server that exposes SendGrid email templates and designs as tools for Claude.

## Available Tools

| Tool | Description |
|---|---|
| `list_templates` | List all dynamic email templates in your SendGrid account |
| `get_template` | Get a specific template including all its versions |
| `create_template` | Create a new dynamic email template |
| `list_designs` | List all designs from the SendGrid design library |
| `get_design` | Get a specific design by ID |

## Local Setup (Claude Code)

This repo includes a `.mcp.json` at the root — Claude Code picks it up automatically. You just need to provide your SendGrid API key via a `.env` file.

**1. Create a `.env` file in this package:**

```bash
cp packages/sendgrid/.env.template packages/sendgrid/.env
```

Then edit `packages/sendgrid/.env` and set your key:

```
SENDGRID_API_KEY=your-actual-sendgrid-api-key
```

> `.env` is gitignored — your key stays local.
>
> **Why `packages/sendgrid/.env` and not the repo root?** When pnpm runs a package script, it changes the working directory to the package folder. So `dotenv` reads `.env` from `packages/sendgrid/`, not the root.

**2. Open the repo in Claude Code.**

Claude Code will detect `.mcp.json` and show a prompt asking you to approve the `sendgrid` server. Approve it and the tools are immediately available.

**3. Verify it's running:**

```bash
claude mcp list
```

You should see `sendgrid` listed. You can now ask Claude to list your templates, get a design, etc.

---

### Alternative: manual registration (no `.mcp.json`)

If you prefer to register the server yourself instead of using `.mcp.json`:

```bash
claude mcp add --transport stdio \
  --env SENDGRID_API_KEY=<your-key> \
  sendgrid \
  -- pnpm --filter @mcp/sendgrid run local
```

This registers the server in your local Claude Code config (not shared with the team).

---

## Production Deployment

The server is deployed as a Google Cloud Function (HTTP transport). See [`scripts/deploy.sh`](../../scripts/deploy.sh) for deployment instructions.

---

## Troubleshooting

### MCP client gets "Not Acceptable" / 406 from the cloud endpoint

**Root cause:** The `@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` requires the incoming request to carry an `Accept` header that includes **both** `application/json` and `text/event-stream`. Claude Code's built-in MCP HTTP client omits this header entirely (or sends only one of the two MIME types), causing the SDK to reject the request with a 406 Not Acceptable error before any tool is invoked.

> This is a known upstream bug tracked at [anthropics/claude-code#5960](https://github.com/anthropics/claude-code/issues/5960). The server-side fix below is the recommended workaround until Anthropic resolves it in the client.

**Fix (already applied in `packages/shared/src/server.ts`):**

```ts
// Ensure Accept header satisfies StreamableHTTP requirement,
// since some MCP clients (e.g. Claude Code) may omit one of the two types.
req.headers['accept'] = 'application/json, text/event-stream';
```

This line is injected inside `createCloudFunctionHandler` — before the request is passed to `transport.handleRequest` — so every MCP server built on the shared handler inherits the fix automatically. No changes are needed in individual package servers.

**If you add a new MCP server package**, build it on top of `createCloudFunctionHandler` from `@mcp/shared` and you will get this fix for free. Do **not** construct `StreamableHTTPServerTransport` directly in a Cloud Function without force-setting the `Accept` header first, or Claude Code will fail to connect.
