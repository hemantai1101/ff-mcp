# Playwright MCP Server on Cloud Run

This directory contains the configuration to deploy the `@playwright/mcp` server to Google Cloud Run as a persistent, stateless browser instance accessible via SSE transport.

## Architecture

*   **Container:** Uses the official `mcr.microsoft.com/playwright:v1.49.0-noble` base image.
*   **Hosting:** Google Cloud Run (Memory: 2Gi, CPU: 1, Concurrency: 20).
*   **Transport:** SSE Endpoint (`/sse`).
*   **Artifacts (Screenshots & Video):** A Cloud Storage (GCS) bucket is mounted via FUSE to `/app/artifacts`. The Playwright server is configured to write all outputs here. This solves the ephemeral filesystem issue of Cloud Run, allowing you to access generated media.

## Artifact Access

The server runs with `--output-dir /app/artifacts`. When the MCP tool returns a file path (e.g., after taking a screenshot or stopping a video), it will return a local container path. 

You must map this path to access the file:

1.  **Local Path Returned:** `/app/artifacts/<filename>`
2.  **Public URL:** `https://storage.googleapis.com/[BUCKET_NAME]/<filename>`
3.  **GCS Path:** `gs://[BUCKET_NAME]/<filename>`

*Note: The bucket is configured with a 1-day lifecycle policy to automatically delete old artifacts.*

## Deployment Commands

To deploy this service manually:

1.  **Build the Image:**
    ```bash
    gcloud builds submit --tag gcr.io/[PROJECT_ID]/playwright-mcp --project [PROJECT_ID]
    ```

2.  **Create the GCS Artifact Bucket (One-time setup):**
    ```bash
    gcloud storage buckets create gs://[BUCKET_NAME] --project [PROJECT_ID] --location us-central1
    # Make bucket publicly readable for easy link access
    gcloud storage buckets add-iam-policy-binding gs://[BUCKET_NAME] --member="allUsers" --role="roles/storage.objectViewer"
    # Set 1-day retention policy (create a lifecycle.json first)
    gcloud storage buckets update gs://[BUCKET_NAME] --lifecycle-file=lifecycle.json
    ```

3.  **Deploy to Cloud Run:**
    ```bash
    gcloud run deploy playwright-mcp \
      --image gcr.io/[PROJECT_ID]/playwright-mcp \
      --platform managed \
      --memory 2Gi \
      --cpu 1 \
      --concurrency 20 \
      --allow-unauthenticated \
      --region us-central1 \
      --project [PROJECT_ID] \
      --add-volume=name=artifacts,type=cloud-storage,bucket=[BUCKET_NAME] \
      --add-volume-mount=volume=artifacts,mount-path=/app/artifacts
    ```

## Usage (Claude / Gemini CLI Config)

Update your `mcpServers` configuration (`claude_desktop_config.json` or `settings.json`):

```json
{
  "mcpServers": {
    "playwright-remote": {
      "type": "sse",
      "url": "https://[CLOUD_RUN_SERVICE_URL]/sse"
    }
  }
}
```
