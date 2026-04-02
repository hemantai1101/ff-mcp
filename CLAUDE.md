# ff-mcp — Claude Code Guide

## Project Overview

A pnpm monorepo of MCP (Model Context Protocol) servers, each deployed as a Google Cloud Functions gen2 service. The custom domain `mcp.fluentlab.co` routes to them via a GCP Load Balancer.

**Key docs to read before making changes:**
- [`README.md`](README.md) — architecture overview and the critical Accept-header fix
- [`GCP_SETUP.md`](GCP_SETUP.md) — load balancer resources, path rules, and commands for adding new MCP services

---

## Monorepo Structure

```
packages/
  shared/         # @mcp/shared — Cloud Function handler used by every MCP server
  sendgrid/       # @mcp/sendgrid — SendGrid MCP (templates, designs, send email)
  searchconsole/  # @mcp/searchconsole — Google Search Console MCP
```

**Package manager:** pnpm@9 with workspaces (`packages/*` glob).

---

## Pattern for Adding a New MCP Server

Every new MCP follows the same structure as `packages/sendgrid/` or `packages/searchconsole/`:

```
packages/<name>/
  package.json       # name: @mcp/<name>, depends on @mcp/shared workspace:*
  tsconfig.json      # extends ../../tsconfig.base.json
  tsup.config.ts     # bundle to CJS with noExternal: [/.*/]
  src/
    index.ts         # export const <name>Mcp = createCloudFunctionHandler(create<Name>Server)
    server.ts        # export async function create<Name>Server(apiKey: string): Promise<McpServer>
    local.ts         # reads env var, uses StdioServerTransport (local dev)
    tools/           # one file per logical group, each exports register<Group>Tools(server, client?)
```

**Shared handler** (`@mcp/shared`) gives you for free:
- Bearer token extraction (`Authorization: Bearer <token>` → `apiKey` parameter)
- Optional `X-Access-Token` gateway auth
- Accept-header injection (fixes Claude Code 406 errors — see README.md)

---

## Authentication Patterns

| MCP | Credential type | How it's passed |
|-----|----------------|-----------------|
| sendgrid | SendGrid API key | `Authorization: Bearer SG.xxx` |
| searchconsole | Service account JSON (compact) or OAuth2 token | `Authorization: Bearer {...}` or `Bearer ya29.xxx` |

For Google APIs: if the Bearer value starts with `{`, it's parsed as service account JSON → `google.auth.JWT`. Otherwise it's treated as an OAuth2 access token. This logic lives in `packages/searchconsole/src/client.ts`.

For local dev, Google credentials go in `GOOGLE_SERVICE_ACCOUNT_JSON` env var (compact single-line JSON).

---

## Load Balancer Path Rules

See [`GCP_SETUP.md`](GCP_SETUP.md) for full commands. Current path routing on `mcp.fluentlab.co`:

| Path | Backend |
|------|---------|
| `/sendgrid-mcp`, `/sendgrid-mcp/*` | `backend-sendgrid-mcp` |
| `/searchconsole-mcp`, `/searchconsole-mcp/*` | `backend-searchconsole-mcp` |

**When you add a new MCP service, you must also:**
1. Create a Serverless NEG pointing to the new Cloud Function
2. Create a backend service and attach the NEG
3. Add a path rule to the `mcp-urlmap` URL map (see "Adding a New MCP Service" section in `GCP_SETUP.md`)

---

## GCP Resources

| Resource | Name | Notes |
|---|---|---|
| Project | `ff-mcp-490817` | |
| Region | `asia-east1` | all Cloud Functions deployed here |
| Static IP | `mcp-ip` | `35.244.199.141` |
| SSL Cert | `mcp-cert` | `mcp.fluentlab.co` |
| URL Map | `mcp-urlmap` | path-based routing |
| SA (deploy) | `ff-mcp-cloud-run@ff-mcp-490817.iam.gserviceaccount.com` | used by Cloud Functions |

---

## Build & Deploy

```bash
pnpm install
pnpm --filter "@mcp/<name>" run build   # builds to packages/<name>/dist/
```

Deployment is automated via GitHub Actions on push to `main` when files under `packages/<name>/` change. Each MCP has its own workflow at `.github/workflows/deploy-<name>.yml`.

---

## Tool Response Format

All tools return:
```typescript
{ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] }
```

For operations returning 204 No Content (create/delete), return a confirmation object:
```typescript
{ content: [{ type: "text", text: JSON.stringify({ success: true, ...ids }, null, 2) }] }
```

---

## .mcp.json

The `.mcp.json` file is gitignored (contains credentials). Each MCP is registered in three modes:
- `<name>` — local stdio via `pnpm run local`
- `<name>-cloud` — direct Cloud Functions URL
- `<name>-ext` — via load balancer at `mcp.fluentlab.co`
