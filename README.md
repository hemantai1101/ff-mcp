# ff-mcp

A monorepo of MCP (Model Context Protocol) servers deployed as Google Cloud Functions.

## Packages

| Package | Description |
|---|---|
| [`packages/sendgrid`](packages/sendgrid/README.md) | SendGrid email templates, designs, and send tools |
| [`packages/google-search-console`](packages/google-search-console/) | Google Search Console — analytics, URL inspection, sitemaps, sites |
| [`packages/shared`](packages/shared/) | Shared Cloud Function handler used by all MCP servers |

---

## Architecture

Each MCP server is a stateless Google Cloud Function using the `StreamableHTTP` transport from `@modelcontextprotocol/sdk`. The shared handler in `packages/shared/src/server.ts` handles:

- API key extraction from the `Authorization: Bearer <key>` header
- Optional gateway-level auth via `X-Access-Token`
- **Accept header injection** (see critical fix below)
- Wiring the `McpServer` to a `StreamableHTTPServerTransport` per request

### Adding a new MCP server

1. Create `packages/<name>/` with its own `package.json`.
2. Import and use `createCloudFunctionHandler` from `@mcp/shared` — this gives you auth and the Accept-header fix for free.
3. Never construct `StreamableHTTPServerTransport` directly in a Cloud Function without the fix below.

---

## Critical Fix: Accept Header for Claude Code Compatibility

**Problem:** Claude Code's built-in MCP HTTP client does not send the `Accept` header that `StreamableHTTPServerTransport` requires (`application/json, text/event-stream`). Without it the SDK returns **406 Not Acceptable** and the MCP tools are unreachable.

> Tracked upstream in [anthropics/claude-code#5960](https://github.com/anthropics/claude-code/issues/5960) — "Streamable HTTP MCP Response Problem". As of March 2026 this is still open; the server-side workaround below is the recommended fix.

**Fix (applied in `packages/shared/src/server.ts`):**

```ts
// Force-set Accept header before passing to handleRequest.
// Claude Code omits it; the SDK rejects requests that don't include both MIME types.
req.headers['accept'] = 'application/json, text/event-stream';
```

This is injected once, centrally, inside `createCloudFunctionHandler`. All packages that extend it inherit the fix automatically.

**Symptom checklist** — if Claude Code cannot connect to your cloud MCP endpoint, check:

1. The endpoint URL in your MCP config is correct and reachable.
2. The `Authorization: Bearer <api-key>` header is being sent.
3. The `Accept` header fix is present in your server handler (or you're using `createCloudFunctionHandler`).

---

## Local Development

```bash
pnpm install
pnpm --filter @mcp/sendgrid run local
```

See each package's README for package-specific setup.

## Deployment

```bash
bash scripts/deploy.sh
```

See [`GCP_SETUP.md`](GCP_SETUP.md) for first-time GCP configuration.