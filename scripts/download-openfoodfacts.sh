#!/bin/bash
# ==============================================================================
# OpenFoodFacts Database Download Script
# Downloads full database and extracts Canada products with nutrition data
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$PROJECT_DIR/data"
TEMP_DIR="$DATA_DIR/temp"

# Create directories
mkdir -p "$DATA_DIR"
mkdir -p "$TEMP_DIR"

echo "======================================"
echo "OpenFoodFacts Database Download"
echo "======================================"
echo ""

# Download full database (7GB compressed, ~43GB uncompressed)
echo "📦 Downloading OpenFoodFacts database..."
echo "URL: https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz"
echo "Size: ~7GB compressed"
echo ""

cd "$TEMP_DIR"

# Check if already downloaded
if [ -f "openfoodfacts-products.jsonl.gz" ]; then
    echo "✓ Database already downloaded"
else
    echo "⏳ Downloading (this will take 10-30 minutes depending on connection)..."
    curl -# -L -o openfoodfacts-products.jsonl.gz \
        https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz
    echo "✓ Download complete"
fi

echo ""
echo "📊 Processing database..."
echo "⏳ Filtering Canada products with nutrition data..."
echo ""

# Process JSONL and filter for Canada products
# Extract: UPC, name, brand, nutrition per 100g, serving size, categories, ingredients
gunzip -c openfoodfacts-products.jsonl.gz | \
    jq -c 'select(.countries_tags[] | contains("en:canada")) |
    select(.nutriments."energy-kcal_100g" != null) |
    {
        upc: .code,
        product_name: (.product_name // .product_name_en),
        brand: .brands,
        nutrition: {
            calories: .nutriments."energy-kcal_100g",
            protein: .nutriments.proteins_100g,
            carbs: .nutriments.carbohydrates_100g,
            sugar: .nutriments.sugars_100g,
            fat: .nutriments.fat_100g,
            saturated_fat: .nutriments."saturated-fat_100g",
            fiber: .nutriments.fiber_100g,
            sodium: .nutriments.sodium_100g,
            salt: .nutriments.salt_100g,
            water: .nutriments.water_100g
        },
        serving_size: .serving_size,
        serving_quantity: .serving_quantity,
        categories: .categories,
        ingredients_text: .ingredients_text,
        image_url: .image_url,
        source: "openfoodfacts",
        countries: .countries_tags,
        last_modified: .last_modified_t
    }' > "$DATA_DIR/products-canada-raw.jsonl"

echo "✓ Canada products extracted"
echo ""

# Count products
TOTAL_PRODUCTS=$(wc -l < "$DATA_DIR/products-canada-raw.jsonl")
echo "📈 Total Canada products with nutrition: $TOTAL_PRODUCTS"
echo ""

# Save metadata
cat > "$DATA_DIR/download-metadata.json" <<EOF
{
    "download_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "source": "https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz",
    "total_products": $TOTAL_PRODUCTS,
    "filter": "Canada products with nutrition data",
    "next_update_due": "$(date -u -d '+14 days' +%Y-%m-%d)"
}
EOF

echo "✓ Metadata saved"
echo ""
echo "======================================"
echo "Download Complete!"
echo "======================================"
echo "Output: $DATA_DIR/products-canada-raw.jsonl"
echo "Products: $TOTAL_PRODUCTS"
echo ""
echo "Next: Run ./scripts/process-products.js to calculate SmartPoints"
