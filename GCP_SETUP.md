# GCP Load Balancer Setup

Custom domain `mcp.fluentlab.co` with path-based routing to MCP servers deployed as Cloud Functions (gen2 / Cloud Run).

**Project:** `ff-mcp-490817`
**Region:** `asia-east1`
**Domain:** `mcp.fluentlab.co`
**Static IP:** `35.244.199.141`

---

## Architecture

```
mcp.fluentlab.co
       │
  (DNS A record → 35.244.199.141)
       │
  Forwarding Rule (mcp-forwarding-rule) :443
       │
  Target HTTPS Proxy (mcp-proxy)
       │
  SSL Certificate (mcp-cert) — mcp.fluentlab.co
       │
  URL Map (mcp-urlmap)
       ├── /sendgrid, /sendgrid/*  → backend-sendgrid-mcp
       └── (future paths)         → backend-{service}-mcp
              │
    Serverless NEG (neg-{service})
              │
    Cloud Run service ({service}-mcp)
```

---

## Resources

| Resource | Name | Notes |
|---|---|---|
| Static IP | `mcp-ip` | Global, `35.244.199.141` |
| SSL Certificate | `mcp-cert` | Managed, ACTIVE for `mcp.fluentlab.co` |
| NEG | `neg-sendgrid` | Serverless, `asia-east1`, Cloud Run service `sendgrid-mcp` |
| Backend Service | `backend-sendgrid-mcp` | Global, HTTP |
| URL Map | `mcp-urlmap` | Paths: `/sendgrid`, `/sendgrid/*` |
| Target HTTPS Proxy | `mcp-proxy` | Uses `mcp-cert` |
| Forwarding Rule | `mcp-forwarding-rule` | `35.244.199.141:443` → `mcp-proxy` |

---

## Setup Commands

Set variables:
```bash
PROJECT=ff-mcp-490817
REGION=asia-east1
DOMAIN=mcp.fluentlab.co
```

### 1. Static IP
```bash
gcloud compute addresses create mcp-ip \
  --network-tier=PREMIUM --global \
  --project=$PROJECT
```

### 2. SSL Certificate
```bash
gcloud compute ssl-certificates create mcp-cert \
  --domains=$DOMAIN \
  --global --project=$PROJECT
```

### 3. Serverless NEG (one per MCP service)
```bash
# sendgrid
gcloud compute network-endpoint-groups create neg-sendgrid \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=sendgrid-mcp \
  --project=$PROJECT
```

### 4. Backend Service (one per MCP service)
```bash
# sendgrid
gcloud compute backend-services create backend-sendgrid-mcp \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --global --project=$PROJECT

gcloud compute backend-services add-backend backend-sendgrid-mcp \
  --network-endpoint-group=neg-sendgrid \
  --network-endpoint-group-region=$REGION \
  --global --project=$PROJECT
```

### 5. URL Map
```bash
gcloud compute url-maps create mcp-urlmap \
  --default-service=backend-sendgrid-mcp \
  --project=$PROJECT

gcloud compute url-maps import mcp-urlmap \
  --global --project=$PROJECT << 'EOF'
name: mcp-urlmap
defaultService: projects/ff-mcp-490817/global/backendServices/backend-sendgrid-mcp
hostRules:
  - hosts: ["mcp.fluentlab.co"]
    pathMatcher: mcp-paths
pathMatchers:
  - name: mcp-paths
    defaultService: projects/ff-mcp-490817/global/backendServices/backend-sendgrid-mcp
    pathRules:
      - paths: ["/sendgrid", "/sendgrid/*"]
        service: projects/ff-mcp-490817/global/backendServices/backend-sendgrid-mcp
EOF
```

### 6. Target HTTPS Proxy
```bash
gcloud compute target-https-proxies create mcp-proxy \
  --url-map=mcp-urlmap \
  --ssl-certificates=mcp-cert \
  --global --project=$PROJECT
```

### 7. Forwarding Rule
```bash
gcloud compute forwarding-rules create mcp-forwarding-rule \
  --address=mcp-ip \
  --target-https-proxy=mcp-proxy \
  --ports=443 \
  --global --project=$PROJECT
```

### 8. DNS
Point an A record at your domain registrar:
```
mcp.fluentlab.co  A  35.244.199.141
```

> SSL cert provisioning takes ~10–15 minutes after DNS propagates.
> Check status: `gcloud compute ssl-certificates describe mcp-cert --global --project=$PROJECT`

---

## Adding a New MCP Service

Example: adding `notion-mcp` at `/notion`.

```bash
# 1. Deploy the Cloud Function (gen2) named notion-mcp

# 2. Create NEG
gcloud compute network-endpoint-groups create neg-notion \
  --region=$REGION \
  --network-endpoint-type=serverless \
  --cloud-run-service=notion-mcp \
  --project=$PROJECT

# 3. Create backend service
gcloud compute backend-services create backend-notion-mcp \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --global --project=$PROJECT

gcloud compute backend-services add-backend backend-notion-mcp \
  --network-endpoint-group=neg-notion \
  --network-endpoint-group-region=$REGION \
  --global --project=$PROJECT

# 4. Add path rule to URL map
gcloud compute url-maps import mcp-urlmap \
  --global --project=$PROJECT << 'EOF'
name: mcp-urlmap
defaultService: projects/ff-mcp-490817/global/backendServices/backend-sendgrid-mcp
hostRules:
  - hosts: ["mcp.fluentlab.co"]
    pathMatcher: mcp-paths
pathMatchers:
  - name: mcp-paths
    defaultService: projects/ff-mcp-490817/global/backendServices/backend-sendgrid-mcp
    pathRules:
      - paths: ["/sendgrid", "/sendgrid/*"]
        service: projects/ff-mcp-490817/global/backendServices/backend-sendgrid-mcp
      - paths: ["/notion", "/notion/*"]
        service: projects/ff-mcp-490817/global/backendServices/backend-notion-mcp
EOF
```

---

## MCP Client Configuration

```json
{
  "mcpServers": {
    "sendgrid": {
      "type": "http",
      "url": "https://mcp.fluentlab.co/sendgrid"
    }
  }
}
```