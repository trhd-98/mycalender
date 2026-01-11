#!/usr/bin/env bash
# exit on error
set -o errexit

# Install project dependencies
npm install

# Manually install Chrome for Puppeteer to ensure it exists in the cache
npx puppeteer browsers install chrome
