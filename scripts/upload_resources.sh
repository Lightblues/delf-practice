#!/bin/bash
# Upload DELF binary resources (PDF/MP3) to GitHub Release
# JSON files are committed to git, only binaries need uploading
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DATA_DIR="$PROJECT_ROOT/.ea/delf/data/extracted"
RELEASE_TAG="delf-resources"
TMP_DIR="$PROJECT_ROOT/.tmp-delf-upload"

cd "$PROJECT_ROOT"

echo "=== DELF Binary Resources Upload ==="
echo "Data directory: $DATA_DIR"

# Check if data directories exist
for part in part-a part-b; do
    if [ ! -d "$DATA_DIR/$part" ]; then
        echo "Error: Data directory not found: $DATA_DIR/$part"
        exit 1
    fi
done

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

# Create temp directory for zipping
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR/part-a" "$TMP_DIR/part-b"

# Copy only binary files (PDF, MP3)
echo ""
echo "Preparing binary files..."

# Part A: Audio, Transcripts, Exercice PDFs
cp -r "$DATA_DIR/part-a/Audio" "$TMP_DIR/part-a/"
cp -r "$DATA_DIR/part-a/Transcripts" "$TMP_DIR/part-a/"
cp -r "$DATA_DIR/part-a/Exercice_I" "$TMP_DIR/part-a/"
cp -r "$DATA_DIR/part-a/Exercice_II" "$TMP_DIR/part-a/"
cp -r "$DATA_DIR/part-a/Exercice_III" "$TMP_DIR/part-a/"

# Part B: Exercice PDFs only
cp -r "$DATA_DIR/part-b/Exercice_I" "$TMP_DIR/part-b/"
cp -r "$DATA_DIR/part-b/Exercice_II" "$TMP_DIR/part-b/"
cp -r "$DATA_DIR/part-b/Exercice_III" "$TMP_DIR/part-b/"

# Remove .DS_Store files
find "$TMP_DIR" -name ".DS_Store" -delete

# Create zip files
echo ""
echo "Creating zip files..."
ZIP_PART_A="$PROJECT_ROOT/part-a-binary.zip"
ZIP_PART_B="$PROJECT_ROOT/part-b-binary.zip"

rm -f "$ZIP_PART_A" "$ZIP_PART_B"
(cd "$TMP_DIR" && zip -r "$ZIP_PART_A" part-a/)
(cd "$TMP_DIR" && zip -r "$ZIP_PART_B" part-b/)

echo "Created: $ZIP_PART_A ($(du -h "$ZIP_PART_A" | cut -f1))"
echo "Created: $ZIP_PART_B ($(du -h "$ZIP_PART_B" | cut -f1))"

# Upload to GitHub Release
echo ""
if gh release view "$RELEASE_TAG" &> /dev/null; then
    echo "Release '$RELEASE_TAG' exists, uploading..."
    gh release upload "$RELEASE_TAG" "$ZIP_PART_A" "$ZIP_PART_B" --clobber
else
    echo "Creating release '$RELEASE_TAG'..."
    gh release create "$RELEASE_TAG" "$ZIP_PART_A" "$ZIP_PART_B" \
        --title "DELF Resources (Binary)" \
        --notes "Binary resources (PDF/MP3) for DELF Practice app.
JSON metadata files (index.json, answer.json) are committed to git.

**Part A - Listening (part-a-binary.zip):**
- Exercise PDFs (46 files)
- Audio files (58 MP3)
- Transcripts (58 PDF)

**Part B - Reading (part-b-binary.zip):**
- Exercise PDFs (46 files)

**Note:** Used by delf-build.yml to bundle resources."
fi

# Cleanup
rm -rf "$TMP_DIR"
rm -f "$ZIP_PART_A" "$ZIP_PART_B"

echo ""
echo "=== Done ==="
echo "View release: gh release view $RELEASE_TAG"
