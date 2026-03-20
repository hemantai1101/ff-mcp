#!/bin/bash
# Usage:
#   ./scripts/build.sh           # build all packages
#   ./scripts/build.sh sendgrid  # build one package

set -e

PACKAGE=$1

if [ -z "$PACKAGE" ]; then
  echo "Building all MCP servers..."
  pnpm --filter "@mcp/*" --filter "!@mcp/shared" run build
else
  echo "Building @mcp/$PACKAGE..."
  pnpm --filter "@mcp/$PACKAGE" run build
fi

echo "Done."
