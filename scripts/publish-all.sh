#!/bin/bash
set -e

if [ -z "$GH_TOKEN" ]; then
  echo "Error: GH_TOKEN environment variable is not set."
  echo "Please run: GH_TOKEN=your_token pnpm electron:publish"
  exit 1
fi

echo "🚀 Starting Full Multi-Platform Publish Process..."

# 1. Build the web standalone once
echo "📦 Building Web Standalone..."
pnpm web:build

# 2. Prepare Electron directory
echo "🔧 Preparing Electron Standalone Build..."
cd apps/electron
pnpm prebuild

# 3. Publish Mac natively (best for Universal/Apple Silicon builds)
echo "🍎 Publishing Mac binaries..."
pnpm exec electron-builder build --mac --publish always

# 4. Publish Windows & Linux via Docker (best for x64 cross-compilation)
echo "🐳 Publishing Windows & Linux binaries via Docker..."
cd ../..
docker run --rm \
  -e GH_TOKEN=$GH_TOKEN \
  --env-file <(env | grep -v ' ') \
  -v ${PWD}:/project \
  -v ~/.cache/electron:/root/.cache/electron \
  -v ~/.cache/electron-builder:/root/.cache/electron-builder \
  electronuserland/builder:wine \
  /bin/bash -c "cd apps/electron && pnpm install && pnpm exec electron-builder build --linux --win --publish always"

echo "✅ All platforms published to GitHub Releases!"
