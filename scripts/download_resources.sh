#!/bin/bash
# Download DELF binary resources from GitHub Release
# Use this script when setting up development on a new machine
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DELF_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RESOURCES_DIR="$DELF_DIR/resources/data"
RELEASE_TAG="delf-resources"

cd "$DELF_DIR"

echo "=== DELF Binary Resources Download ==="
echo "Target directory: $RESOURCES_DIR"

# Check gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: gh CLI not installed. Install with: brew install gh"
    exit 1
fi

# Check gh auth
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub. Run: gh auth login"
    exit 1
fi

# Check if JSON files exist (should be in git)
if [ ! -f "$RESOURCES_DIR/part-a/index.json" ]; then
    echo "Error: JSON files not found. Make sure you've cloned the repo correctly."
    exit 1
fi

# Download binary resources
echo ""
echo "Downloading binary resources from GitHub Release..."
gh release download "$RELEASE_TAG" -p "part-a-binary.zip" -p "part-b-binary.zip"

# Extract to resources directory (merges with existing JSON files)
echo ""
echo "Extracting..."
unzip -o part-a-binary.zip -d "$RESOURCES_DIR"
unzip -o part-b-binary.zip -d "$RESOURCES_DIR"

# Cleanup
rm -f part-a-binary.zip part-b-binary.zip

echo ""
echo "=== Done ==="
echo "Resources ready at: $RESOURCES_DIR"
ls -la "$RESOURCES_DIR/part-a/"
ls -la "$RESOURCES_DIR/part-b/"
