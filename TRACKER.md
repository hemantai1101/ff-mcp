# Tracker

A running log of infrastructure/cost changes made to this project. Newest entry first.

---

## 2026-08-13 — Killed idle sendgrid-mcp traffic + replaced load balancer with Firebase Hosting

**Problem found:** `ff-mcp-490817` was burning unexpected cost.
1. `sendgrid-mcp` Cloud Run service was getting ~5,400 requests/day, every request timing out at 61s. Root cause: a local `mcp-remote` connection in `~/Library/Application Support/Claude/claude_desktop_config.json` kept reconnecting nonstop, whether or not it was actively being used.
2. Separately, the GCP Global HTTPS Load Balancer routing `mcp.fluentlab.co` was costing ~$141/month in flat forwarding-rule fees — charged regardless of traffic volume.

**Fixes:**
- Removed the `sendgrid-ext` entry from the local Claude Desktop config → stopped the runaway reconnect loop.
- Replaced the GCP Load Balancer with **Firebase Hosting rewrites** (attached Firebase to the existing `ff-mcp-490817` project, no new project needed). Same domain, same URL paths (`mcp.fluentlab.co/<service>-mcp`), no client config changes required.
- Deleted all load balancer resources: forwarding rule (`mcp-forwarding-rule`), target proxy (`mcp-proxy`), URL map (`mcp-urlmap`), 5 backend services, SSL cert (`mcp-cert`).
- Moved `mcp.fluentlab.co`'s A record (in Cloud DNS project `vpc-production-349017`, zone `mcp-fluentlab-co`) from the LB's static IP to Firebase Hosting's fixed IP (`199.36.158.100`).

**Result:** ~$141/month load balancer cost eliminated, plus whatever the runaway Cloud Run traffic was adding on top. Full setup now documented in [`GCP_SETUP.md`](GCP_SETUP.md).

**Backups taken before deletion** (on the machine that did this, under `~/projects/backups/`):
- `ff-mcp-lb/` — full export of the load balancer's forwarding rules, proxies, URL maps, backend services, SSL certs
- `mcp-fluentlab-co-zone-backup.yaml` — full DNS zone export before the A record change
- Also backed up (separate, unrelated project): `ff-qa-backend-security-policy_2026-08-13.yaml` — a Cloud Armor policy deleted from the unused `ff-qa-env` project.

**Rollback if needed:** re-import the LB config from `ff-mcp-lb/` and point the DNS A record back at the old static IP (see zone backup for the exact original record).
