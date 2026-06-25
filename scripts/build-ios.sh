#!/bin/bash
# Meet Witma — iOS Production Build Script
# Runs EAS cloud build if credits available, falls back to local build

set -e

echo "=== Meet Witma iOS Build ==="

# Check EAS login
npx eas whoami || { echo "Login first: npx eas login"; exit 1; }

# Try cloud build first
echo "Attempting cloud build..."
if npx eas build --platform ios --profile production --non-interactive 2>&1 | grep -q "100% of your included build credits"; then
  echo ""
  echo "⚠️  EAS cloud build credits exhausted."
  echo "Options:"
  echo "  1. Upgrade plan: https://expo.dev/accounts/a.el/settings/billing"
  echo "  2. Run local build: ./scripts/build-ios-local.sh"
  echo "  3. Wait for next monthly reset"
  exit 1
fi
