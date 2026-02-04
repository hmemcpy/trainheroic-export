#!/bin/bash
BUNDLE="/tmp/bundle.hbc"
OUTPUT="/tmp/trainheroic-api-strings.txt"

if [ ! -f "$BUNDLE" ]; then
    echo "Bundle not found at $BUNDLE, copying from APK extract..."
    cp /private/tmp/claude-501/-Users-hmemcpy-git-trainheroic-export/110ef20c-cc64-406a-8a6c-cc09785ad9f0/scratchpad/assets/index.android.bundle "$BUNDLE"
fi

python3 "$(dirname "$0")/extract-hermes-strings.py" "$BUNDLE" --api-analysis --output "$OUTPUT"

echo ""
echo "Results written to $OUTPUT"
echo "Lines: $(wc -l < "$OUTPUT")"
