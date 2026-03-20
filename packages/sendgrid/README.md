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

**1. Create a `.env` file at the repo root:**

```bash
cp .env.template .env
```

Then edit `.env` and set your key:

```
SENDGRID_API_KEY=your-actual-sendgrid-api-key
```

> `.env` is gitignored — your key stays local.

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
