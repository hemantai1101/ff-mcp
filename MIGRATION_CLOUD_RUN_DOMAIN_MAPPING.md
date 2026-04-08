# Migration Plan: Replace GCP Load Balancer with Cloud Run Domain Mappings

> **Status: On Hold** — Cloud Run domain mappings are still in Preview/Beta (not GA). Revisit when the feature reaches GA.

## Why

The GCP Global HTTPS Load Balancer costs ~5 HKD/day (~$1,700 HKD/year). Cloud Run domain mappings are free.

---

## Fact-Check

| Check | Result |
|---|---|
| Cost of domain mappings | Free — no GCP charge |
| asia-east1 supported | ✅ Yes |
| Path-based routing supported | ❌ No — subdomain-level only |
| SSL auto-provisioned | ✅ Yes, 15 min – 24 h |
| GA status | ⚠️ Still in Preview/Beta (not GA) |
| Domain ownership verification | Required (TXT record or Search Console) |

---

## New URL Scheme

| Service | Old (LB) | New (Domain Mapping) |
|---|---|---|
| sendgrid | `mcp.fluentlab.co/sendgrid-mcp` | `sendgrid.mcp.fluentlab.co` |
| google-search-console | `mcp.fluentlab.co/google-search-console-mcp` | `gsc.mcp.fluentlab.co` |
| notion | `mcp.fluentlab.co/notion-mcp` | `notion.mcp.fluentlab.co` |

---

## Pros & Cons

### Pros
- Free — eliminates ~1,700 HKD/year
- No code changes — Cloud Functions untouched; only DNS + config
- GCP-native — no third-party dependency
- SSL auto-managed by Google
- Simpler architecture — no LB, NEGs, backend services

### Cons
- URL structure changes — path → subdomain; all clients update `.mcp.json`
- Beta/Preview — not GA; Google doesn't recommend for production
- No path routing — locked into one subdomain per service
- Hard to roll back — re-provisioning LB takes ~30 min
- Regional (asia-east1) vs old global Anycast LB — minor latency increase for non-Asia traffic
- Domain ownership verification required upfront

---

## Steps (when ready)

### 1. Verify Domain Ownership
```bash
gcloud domains verify mcp.fluentlab.co
```

### 2. Create Domain Mappings
```bash
PROJECT=ff-mcp-490817
REGION=asia-east1

gcloud beta run domain-mappings create \
  --service=sendgrid-mcp \
  --domain=sendgrid.mcp.fluentlab.co \
  --region=$REGION --project=$PROJECT

gcloud beta run domain-mappings create \
  --service=google-search-console-mcp \
  --domain=gsc.mcp.fluentlab.co \
  --region=$REGION --project=$PROJECT

gcloud beta run domain-mappings create \
  --service=notion-mcp \
  --domain=notion.mcp.fluentlab.co \
  --region=$REGION --project=$PROJECT
```

### 3. Update DNS
Add CNAME records (targets output by step 2):
```
sendgrid.mcp.fluentlab.co   CNAME  <from gcloud output>
gsc.mcp.fluentlab.co        CNAME  <from gcloud output>
notion.mcp.fluentlab.co     CNAME  <from gcloud output>
```

Check SSL status:
```bash
gcloud beta run domain-mappings describe \
  --domain=sendgrid.mcp.fluentlab.co \
  --region=$REGION --project=$PROJECT
```

### 4. Update `.mcp.json`
| Key | Old URL | New URL |
|---|---|---|
| `sendgrid-ext` | `https://mcp.fluentlab.co/sendgrid-mcp` | `https://sendgrid.mcp.fluentlab.co` |
| `google-search-console-ext` | `https://mcp.fluentlab.co/google-search-console-mcp` | `https://gsc.mcp.fluentlab.co` |
| `notion-ext` | `https://mcp.fluentlab.co/notion-mcp` | `https://notion.mcp.fluentlab.co` |

### 5. Update Docs
- `GCP_SETUP.md` — rewrite for subdomain-mapping architecture
- `CLAUDE.md` — update architecture table

### 6. Tear Down LB (after SSL confirmed on all new domains)
```bash
gcloud compute forwarding-rules delete mcp-forwarding-rule --global --project=$PROJECT
gcloud compute target-https-proxies delete mcp-proxy --global --project=$PROJECT
gcloud compute ssl-certificates delete mcp-cert --global --project=$PROJECT
gcloud compute url-maps delete mcp-urlmap --global --project=$PROJECT
gcloud compute backend-services delete backend-sendgrid-mcp --global --project=$PROJECT
gcloud compute backend-services delete backend-google-search-console-mcp --global --project=$PROJECT
gcloud compute backend-services delete backend-not-found --global --project=$PROJECT
gcloud compute network-endpoint-groups delete neg-sendgrid --region=$REGION --project=$PROJECT
gcloud compute network-endpoint-groups delete neg-google-search-console --region=$REGION --project=$PROJECT
gcloud compute network-endpoint-groups delete neg-not-found --region=$REGION --project=$PROJECT
gcloud compute addresses delete mcp-ip --global --project=$PROJECT
```

---

## Verification
1. `curl -I https://sendgrid.mcp.fluentlab.co` → expect 401 (not 404/406)
2. Test each `-ext` MCP in Claude Code with a tool call
3. Confirm all 3 subdomains before running teardown