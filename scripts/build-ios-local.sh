#!/bin/bash
# Meet Witma — Local iOS Build (no EAS cloud credits needed)
# Prereqs: fastlane installed (brew install fastlane), valid Distribution Certificate

set -e
cd "$(dirname "$0")/.."

echo "=== Meet Witma — Local iOS Build ==="

# 1. Set up credentials (one-time, interactive)
echo "Step 1: Credentials setup (skip if already done)"
echo "  Run manually once: npx eas credentials --platform ios"
echo ""

# 2. Prebuild native project
echo "Step 2: Generating native project..."
npx expo prebuild --platform ios --clean

# 3. Install pods
echo "Step 3: Installing CocoaPods..."
cd ios
if command -v pod &>/dev/null; then
  pod install
elif [ -f ~/.gem/ruby/2.6.0/bin/pod ]; then
  ~/.gem/ruby/2.6.0/bin/pod install
else
  echo "pod not found. Run: gem install --user-install cocoapods"
  exit 1
fi
cd ..

# 4. Build with EAS local (uses Fastlane for signing)
echo "Step 4: Building IPA..."
npx eas build --platform ios --profile production --local --non-interactive

echo ""
echo "=== Build complete! ==="
echo "IPA is in the project root. Submit to TestFlight:"
echo "  npx eas submit --platform ios --profile production"
