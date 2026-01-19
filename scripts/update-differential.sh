#!/bin/bash
# ==============================================================================
# OpenFoodFacts Differential Update Script
# Downloads only products modified in last 14 days
# Run this script every 14 days to keep database updated
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
TEMP_DIR="$DATA_DIR/temp"

mkdir -p "$DATA_DIR"
mkdir -p "$TEMP_DIR"

echo "======================================"
echo "OpenFoodFacts Differential Update"
echo "======================================"
echo ""

# Check last update date
if [ -f "$DATA_DIR/download-metadata.json" ]; then
    LAST_UPDATE=$(jq -r '.download_date' "$DATA_DIR/download-metadata.json")
    echo "Last full download: $LAST_UPDATE"
else
    echo "❌ No previous download found. Run download-openfoodfacts.sh first."
    exit 1
fi

# Calculate 14 days ago timestamp
FOURTEEN_DAYS_AGO=$(date -u -d '14 days ago' +%s)
echo "Fetching products modified since: $(date -u -d '14 days ago' +%Y-%m-%d)"
echo ""

cd "$TEMP_DIR"

echo "📦 Downloading delta export..."
echo "⏳ This may take 5-10 minutes..."
echo ""

# Download the delta (recent changes)
# OpenFoodFacts provides daily delta files
curl -# -L -o delta-products.jsonl.gz \
    https://static.openfoodfacts.org/data/delta/index.txt

# Extract and get recent daily deltas
for i in {0..13}; do
    DATE=$(date -u -d "$i days ago" +%Y-%m-%d)
    DELTA_FILE="delta-${DATE}.jsonl.gz"

    echo "Downloading delta for $DATE..."
    curl -s -L -o "$DELTA_FILE" \
        "https://static.openfoodfacts.org/data/delta/${DELTA_FILE}" || echo "  (No delta for $DATE)"
done

echo ""
echo "📊 Processing differential updates..."
echo ""

# Combine all delta files and filter for Canada
for delta in delta-*.jsonl.gz; do
    if [ -f "$delta" ]; then
        gunzip -c "$delta" | \
            jq -c 'select(.countries_tags[] | contains("en:canada")) |
            select(.nutriments."energy-kcal_100g" != null)' \
            >> updates-combined.jsonl || true
    fi
done

if [ ! -f "updates-combined.jsonl" ]; then
    echo "✓ No updates found in last 14 days"
    exit 0
fi

# Move to data directory
mv updates-combined.jsonl "$DATA_DIR/products-updates.jsonl"

UPDATE_COUNT=$(wc -l < "$DATA_DIR/products-updates.jsonl")
echo "✓ Found $UPDATE_COUNT updated products"
echo ""

# Update metadata
jq ".last_differential_update = \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\" | .differential_updates += $UPDATE_COUNT" \
    "$DATA_DIR/download-metadata.json" > "$DATA_DIR/download-metadata.tmp"
mv "$DATA_DIR/download-metadata.tmp" "$DATA_DIR/download-metadata.json"

echo "======================================"
echo "Differential Update Complete!"
echo "======================================"
echo "Updates: $DATA_DIR/products-updates.jsonl"
echo "Count: $UPDATE_COUNT products"
echo ""
echo "Next: Run node ./scripts/merge-updates.js to merge into main database"
