#!/bin/bash
# Usage:
#   ./scripts/deploy.sh sendgrid            # deploy sendgrid to GCP
#   ./scripts/deploy.sh sendgrid production # deploy to production region

set -e

PACKAGE=$1
ENV=${2:-staging}
PROJECT_ID=$(gcloud config get-value project)
REGION="asia-east1"

if [ -z "$PACKAGE" ]; then
  echo "Error: specify a package name. Usage: ./scripts/deploy.sh <package> [env]"
  exit 1
fi

FUNCTION_NAME="mcp-${PACKAGE}-${ENV}"
SOURCE_DIR="packages/${PACKAGE}/dist"

echo "Deploying $FUNCTION_NAME from $SOURCE_DIR..."

# Build first
./scripts/build.sh "$PACKAGE"

# Deploy to Cloud Function Gen 2
gcloud functions deploy "$FUNCTION_NAME" \
  --gen2 \
  --runtime=nodejs20 \
  --region="$REGION" \
  --source="$SOURCE_DIR" \
  --entry-point="${PACKAGE//-/}Mcp" \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets="SENDGRID_API_KEY=SENDGRID_API_KEY:latest" \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
  --memory=256MB \
  --timeout=60s

echo "Deployed: https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME"
