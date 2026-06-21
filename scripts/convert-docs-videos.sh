#!/usr/bin/env bash
# Convert Playwright .webm recordings to .mp4 for YouTube upload
# Usage: bash scripts/convert-docs-videos.sh
# Requires: ffmpeg

set -e

SRC="test-results"
DEST="docs-videos"

mkdir -p "$DEST"

if ! command -v ffmpeg &>/dev/null; then
  echo "Error: ffmpeg not found. Install with: brew install ffmpeg"
  exit 1
fi

count=0
while IFS= read -r -d '' webm; do
  # Extract spec name from path: test-results/absensi-capture-absensi.../video.webm
  dir=$(dirname "$webm")
  spec=$(basename "$dir" | sed 's/-chromium$//' | sed 's/docs-capture-//')
  outfile="$DEST/${spec}.mp4"

  echo "Converting: $webm → $outfile"
  ffmpeg -y -i "$webm" \
    -c:v libx264 -preset fast -crf 22 \
    -c:a aac -b:a 128k \
    -movflags +faststart \
    "$outfile" 2>/dev/null

  count=$((count + 1))
done < <(find "$SRC" -name "*.webm" -print0 2>/dev/null)

if [ $count -eq 0 ]; then
  echo "No .webm files found in $SRC — run npm run test:docs-capture first"
else
  echo "Done: $count video(s) converted to $DEST/"
fi
