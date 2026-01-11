#!/usr/bin/env bash
# exit on error
set -o errexit
set -x # Exact command tracing

echo "--- STARTING BUILD SCRIPT ---"

echo "Checking environment..."
node -v
npm -v

echo "Cleaning up old cache if exists..."
rm -rf .cache/puppeteer

echo "Creating cache directory..."
mkdir -p .cache/puppeteer

echo "Installing NPM dependencies (skipping automatic Puppeteer browser download)..."
export PUPPETEER_SKIP_DOWNLOAD=true
npm install --no-audit --no-fund --verbose

echo "Installing Chrome for Puppeteer (manual step)..."
# Using verbose to see download progress
npx puppeteer browsers install chrome --verbose

echo "Build script completed successfully!"
