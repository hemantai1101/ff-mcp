# Firebase Hosting Setup

Custom domain `mcp.fluentlab.co` with path-based routing to MCP servers deployed as Cloud Run services, via Firebase Hosting rewrites.

**Project:** `ff-mcp-490817` (Firebase attached to the existing GCP project — same billing account)
**Domain:** `mcp.fluentlab.co`
**Config:** [`hosting/firebase.json`](hosting/firebase.json)

> **History:** this replaced a GCP Global HTTPS Load Balancer (see git history for the old `GCP_SETUP.md`), which cost ~$141/month in forwarding-rule fees regardless of traffic. Firebase Hosting rewrites give the same path-based routing on the same domain for free. A prior plan to use Cloud Run domain mappings instead (see [`MIGRATION_CLOUD_RUN_DOMAIN_MAPPING.md`](MIGRATION_CLOUD_RUN_DOMAIN_MAPPING.md)) was superseded by this approach, since domain mappings don't support path-based routing (subdomain-per-service only) and the old URL scheme needed to stay intact for existing clients.

---

## Architecture

```
mcp.fluentlab.co
       │
  (DNS A record → 199.36.158.100, Firebase Hosting's fixed IP)
       │
  Firebase Hosting (site: ff-mcp-490817)
       │
  hosting.rewrites (hosting/firebase.json)
       ├── /sendgrid-mcp, /sendgrid-mcp/*                             → Cloud Run: sendgrid-mcp (asia-east1)
       ├── /notion-mcp, /notion-mcp/*                                 → Cloud Run: notion-mcp (asia-east1)
       ├── /google-search-console-mcp, /google-search-console-mcp/*   → Cloud Run: google-search-console-mcp (asia-east1)
       ├── /fundfluent-mcp, /fundfluent-mcp/*                         → Cloud Run: fundfluent-mcp (asia-east1)
       └── /playwright-mcp, /playwright-mcp/*                         → Cloud Run: playwright-mcp (us-central1)
```

SSL is fully managed by Firebase — no certificate resource to create or renew.

---

## One-Time Project Setup (already done)

```bash
PROJECT=ff-mcp-490817

# Enable required APIs
gcloud services enable firebase.googleapis.com dns.googleapis.com --project=$PROJECT

# Attach Firebase to the existing GCP project (accept ToS in console if prompted)
firebase projects:addfirebase $PROJECT

npm install -g firebase-tools
firebase login
```

DNS for `fluentlab.co` is managed in Cloud DNS under project `vpc-production-349017`, zone `mcp-fluentlab-co` (not `ff-mcp-490817`) — check there if you need to touch DNS records:

```bash
gcloud dns record-sets list --zone=mcp-fluentlab-co --project=vpc-production-349017
```

Current records: a TXT ownership record (`hosting-site=ff-mcp-490817`) and an A record pointing at `199.36.158.100` (Firebase Hosting's fixed serving IP — this is a stable, documented Firebase IP, not project-specific).

---

## Adding a New MCP Service

1. Deploy the Cloud Run service (via existing GitHub Actions workflow).
2. Add two rewrite rules to [`hosting/firebase.json`](hosting/firebase.json):
   ```json
   { "source": "/<name>-mcp/**", "run": { "serviceId": "<name>-mcp", "region": "<region>" } },
   { "source": "/<name>-mcp", "run": { "serviceId": "<name>-mcp", "region": "<region>" } }
   ```
3. Deploy the hosting config:
   ```bash
   cd hosting
   firebase deploy --only hosting --project ff-mcp-490817
   ```
4. Update `CLAUDE.md`'s rewrite table.

No DNS, SSL cert, or load-balancer changes needed — the domain and cert are already wired up.

---

## MCP Client Configuration

URL scheme is unchanged from the old load-balancer setup:

```json
{
  "mcpServers": {
    "sendgrid-ext": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.fluentlab.co/sendgrid-mcp", "--header", "Authorization: Bearer ${SENDGRID_BEARER}"]
    }
  }
}
```

---

## Deploying Hosting Changes

```bash
cd hosting
firebase deploy --only hosting --project ff-mcp-490817
```

Test URL (bypasses the custom domain, useful for isolating DNS/cert issues): `https://ff-mcp-490817.web.app/<name>-mcp`
