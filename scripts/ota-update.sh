#!/bin/bash
# Meet Witma — OTA Update (JS-only changes, no native build needed)
# Use this for app.js, screens/, lib/ changes — instant delivery

set -e
cd "$(dirname "$0")/.."

MSG="${1:-"JS update $(date '+%Y-%m-%d %H:%M')"}"

echo "=== Meet Witma OTA Update ==="
echo "Message: $MSG"

npx eas update --branch production --message "$MSG" --environment production

echo ""
echo "OTA update pushed. Users will receive the update on next app launch."
