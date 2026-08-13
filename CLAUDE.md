# ff-mcp — Claude Code Guide

## Project Overview

A pnpm monorepo of MCP (Model Context Protocol) servers, each deployed as a Google Cloud Functions gen2 service. The custom domain `mcp.fluentlab.co` routes to them via Firebase Hosting rewrites (path → Cloud Run service).

**Key docs to read before making changes:**
- [`README.md`](README.md) — architecture overview and the critical Accept-header fix
- [`GCP_SETUP.md`](GCP_SETUP.md) — Firebase Hosting config, rewrite rules, and commands for adding new MCP services

---

## Monorepo Structure

```
packages/
  shared/         # @mcp/shared — Cloud Function handler used by every MCP server
  sendgrid/       # @mcp/sendgrid — SendGrid MCP (templates, designs, send email)
  google-search-console/  # @mcp/google-search-console — Google Search Console MCP
```

**Package manager:** pnpm@9 with workspaces (`packages/*` glob).

---

## Pattern for Adding a New MCP Server

Every new MCP follows the same structure as `packages/sendgrid/` or `packages/google-search-console/`:

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
| google-search-console | Service account JSON (compact) or OAuth2 token | `Authorization: Bearer {...}` or `Bearer ya29.xxx` |

For Google APIs: if the Bearer value starts with `{`, it's parsed as service account JSON → `google.auth.JWT`. Otherwise it's treated as an OAuth2 access token. This logic lives in `packages/google-search-console/src/client.ts`.

For local dev, Google credentials go in `GOOGLE_SERVICE_ACCOUNT_JSON` env var (compact single-line JSON).

---

## Firebase Hosting Rewrites

See [`GCP_SETUP.md`](GCP_SETUP.md) for full commands. Config lives in [`hosting/firebase.json`](hosting/firebase.json). Current path routing on `mcp.fluentlab.co`:

| Path | Cloud Run service | Region |
|------|---------|--------|
| `/sendgrid-mcp`, `/sendgrid-mcp/*` | `sendgrid-mcp` | `asia-east1` |
| `/notion-mcp`, `/notion-mcp/*` | `notion-mcp` | `asia-east1` |
| `/google-search-console-mcp`, `/google-search-console-mcp/*` | `google-search-console-mcp` | `asia-east1` |
| `/fundfluent-mcp`, `/fundfluent-mcp/*` | `fundfluent-mcp` | `asia-east1` |
| `/playwright-mcp`, `/playwright-mcp/*` | `playwright-mcp` | `us-central1` |

**When you add a new MCP service, you must also:**
1. Add two rewrite rules to `hosting/firebase.json` (see "Adding a New MCP Service" section in `GCP_SETUP.md`)
2. Redeploy: `cd hosting && firebase deploy --only hosting --project ff-mcp-490817`
3. Update the table above

---

## GCP Resources

| Resource | Name | Notes |
|---|---|---|
| Project | `ff-mcp-490817` | Firebase-enabled |
| Region | `asia-east1` | most Cloud Functions deployed here (`playwright-mcp` is `us-central1`) |
| Firebase Hosting site | `ff-mcp-490817` | serves `mcp.fluentlab.co`, `ff-mcp-490817.web.app` |
| DNS zone | `mcp-fluentlab-co` | lives in project `vpc-production-349017`, **not** `ff-mcp-490817` |
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
