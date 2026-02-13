#!/bin/bash
set -e

# Build the web application first (needed for standalone)
pnpm web:build

# Move to electron app
cd apps/electron

# Determine command based on argument
BUILD_CMD="pnpm build:linux && pnpm build:win"
if [ "$1" == "--publish" ]; then
  BUILD_CMD="pnpm publish:linux && pnpm publish:win"
fi

echo "Running build command in Docker: $BUILD_CMD"

# Run docker build
# We use electronuserland/builder:wine to support Windows builds from Linux environment
docker run --rm \
  --env-file <(env | grep -v ' ') \
  -v ${PWD}/../..:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd apps/electron && pnpm install && $BUILD_CMD"

# Run postbuild locally to copy files to site app (optional fallback)
pnpm postbuild
