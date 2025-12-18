#!/bin/bash
# Post-deploy script - runs after git pull to rebuild and restart services
# This script is called by the post-merge git hook

set -e

# Get the root directory of the repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$ROOT_DIR"

echo "=================================================="
echo "POST-DEPLOY: Starting build process..."
echo "=================================================="

# ==================== SCRAPER (gpt) ====================
echo ""
echo "[1/2] Building scraper (gpt)..."
echo "--------------------------------------------------"

cd "$ROOT_DIR/gpt"

echo "  -> Installing dependencies..."
npm install --silent

echo "  -> Generating Prisma client..."
npx prisma generate

echo "  -> Applying database migrations..."
npx prisma migrate deploy

echo "  -> Building TypeScript..."
npm run build --silent 2>/dev/null || echo "  -> (No build script or build skipped)"

echo "  -> Scraper ready!"

# ==================== DASHBOARD ====================
echo ""
echo "[2/2] Building dashboard..."
echo "--------------------------------------------------"

cd "$ROOT_DIR/dashboard"

echo "  -> Installing dependencies..."
npm install --silent

echo "  -> Generating Prisma client..."
npx prisma generate

echo "  -> Building Next.js app..."
npm run build

echo "  -> Dashboard ready!"

# ==================== RESTART PM2 ====================
echo ""
echo "=================================================="
echo "Restarting PM2 services..."
echo "=================================================="

cd "$ROOT_DIR"

# Check if pm2 is available
if command -v pm2 &> /dev/null; then
    # Restart dashboard
    pm2 restart wp-dashboard --update-env 2>/dev/null || pm2 restart dashboard --update-env 2>/dev/null || echo "  -> Warning: Could not restart dashboard (may not be running)"

    echo ""
    pm2 status
else
    echo "  -> PM2 not found, skipping restart"
fi

echo ""
echo "=================================================="
echo "POST-DEPLOY: Complete!"
echo "=================================================="
