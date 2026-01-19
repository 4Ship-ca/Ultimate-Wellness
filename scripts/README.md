# OpenFoodFacts Database Scripts

Complete system for downloading, processing, and maintaining a local Canadian product database with pre-calculated SmartPoints.

## Overview

This system downloads the entire OpenFoodFacts database (~7GB), filters for Canadian products with nutrition data (~104K products), calculates SmartPoints per 100g/100ml, and maintains it with 14-day differential updates.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      UPC Lookup Cascade                       │
├──────────────────────────────────────────────────────────────┤
│ 1. User Cache (IndexedDB)         - User-verified products   │
│ 2. Local Git Database              - 104K+ Canada products ← │
│ 3. OpenFoodFacts Live API          - 2.8M+ global products   │
│ 4. Barcode Monster API             - Fallback source         │
│ 5. UPCitemdb API                   - Fallback source         │
│ 6. Claude API (Cloudflare)         - Web scraping fallback   │
│ 7. Manual Entry                    - User input              │
└──────────────────────────────────────────────────────────────┘
```

## Prerequisites

- **curl** - For downloading database
- **jq** - For JSON processing (`brew install jq` or `apt-get install jq`)
- **Node.js** - For processing scripts
- **~10GB disk space** - For temp files during processing
- **Good internet connection** - 7GB download

## Quick Start

### Step 1: Initial Download & Processing

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Download full OpenFoodFacts database (10-30 minutes)
./scripts/download-openfoodfacts.sh

# Process and calculate SmartPoints (5-10 minutes)
node ./scripts/process-products.js

# Check results
ls -lh data/
```

**Output:**
- `data/products-canada.json` - Full product database (104K+ products)
- `data/products-index.json` - Fast lookup index
- `data/products-stats.json` - Statistics
- `data/download-metadata.json` - Download tracking

### Step 2: Commit to Git

```bash
# Add data directory to git
git add data/

# Commit with descriptive message
git commit -m "Add OpenFoodFacts Canada database with pre-calculated SmartPoints

- 104,000+ Canadian products
- Pre-calculated points per 100g/100ml
- Includes macros, micros, ingredients, hydration
- Ready for offline lookup"

# Push to repository
git push
```

### Step 3: Set Up Differential Updates

```bash
# Add to crontab (run every 14 days)
crontab -e

# Add line (runs at 2am on 1st and 15th of month):
0 2 1,15 * * cd /path/to/Ultimate-Wellness && ./scripts/update-differential.sh && node ./scripts/merge-updates.js && git add data/ && git commit -m "Update product database (differential)" && git push
```

## Scripts

### 1. `download-openfoodfacts.sh`

Downloads full OpenFoodFacts database and filters for Canadian products.

```bash
./scripts/download-openfoodfacts.sh
```

**What it does:**
- Downloads 7GB compressed database
- Filters for Canada products (`countries_tags` contains "en:canada")
- Requires nutrition data (`energy-kcal_100g` not null)
- Extracts: UPC, name, brand, nutrition per 100g, serving size, categories, ingredients
- Outputs: `data/products-canada-raw.jsonl`

**Time:** 10-30 minutes depending on connection

### 2. `process-products.js`

Calculates SmartPoints and creates optimized database.

```bash
node ./scripts/process-products.js
```

**What it does:**
- Reads `products-canada-raw.jsonl`
- Calculates SmartPoints per 100g/100ml using formula:
  ```
  Points = (cal × 0.0305) + (sat_fat × 0.275) + (sugar × 0.12) - (protein × 0.098)
  ```
- Calculates points per serving (scaled from 100g)
- Extracts hydration (water content per 100g)
- Creates fast lookup index (by UPC, brand, category)
- Outputs:
  - `data/products-canada.json` - Main database
  - `data/products-index.json` - Lookup index
  - `data/products-stats.json` - Statistics

**Time:** 5-10 minutes

### 3. `update-differential.sh`

Downloads only products modified in last 14 days.

```bash
./scripts/update-differential.sh
```

**What it does:**
- Downloads daily delta files for last 14 days
- Filters for Canadian products
- Outputs: `data/products-updates.jsonl`
- Updates metadata with last update timestamp

**Time:** 2-5 minutes

### 4. `merge-updates.js` (To be created)

Merges differential updates into main database.

```bash
node ./scripts/merge-updates.js
```

**What it does:**
- Reads `products-updates.jsonl`
- Merges into `products-canada.json`
- Recalculates SmartPoints for updated products
- Updates index
- Archives old version

**Time:** 1-2 minutes

## Data Structure

### products-canada.json

```json
{
  "057000008174": {
    "upc": "057000008174",
    "product_name": "Organic Milk",
    "brand": "Organic Valley",
    "points_per_100g": 2,
    "points_per_serving": 4,
    "serving_size": "240ml",
    "serving_amount": 240,
    "hydration_ml_per_100g": 87.5,
    "nutrition": {
      "calories": 62,
      "protein": 3.3,
      "carbs": 4.8,
      "sugar": 4.8,
      "fat": 3.25,
      "saturated_fat": 1.95,
      "fiber": 0,
      "sodium": 0.05,
      "water": 87.5
    },
    "categories": "Dairy, Milk, Organic",
    "ingredients": "Organic whole milk, vitamin D3",
    "image_url": "https://...",
    "source": "openfoodfacts",
    "verified": false,
    "last_modified": 1704067200
  }
}
```

### products-index.json

```json
{
  "upc": {
    "057000008174": {
      "name": "Organic Milk",
      "brand": "Organic Valley",
      "points": 2
    }
  },
  "brand": {
    "Organic Valley": ["057000008174", "057000008175", ...]
  },
  "category": {
    "Dairy": ["057000008174", "049000050103", ...]
  },
  "totalProducts": 104849,
  "lastUpdated": "2026-01-19T..."
}
```

## SmartPoints Formula

All products have SmartPoints pre-calculated per 100g/100ml:

```javascript
points_per_100g = (calories × 0.0305) +
                  (saturated_fat × 0.275) +
                  (sugar × 0.12) -
                  (protein × 0.098)

points_per_100g = Math.max(0, Math.round(points_per_100g))
```

**Serving points calculated on-the-fly:**
```javascript
points_per_serving = Math.round((points_per_100g × serving_amount) / 100)
```

## Hydration Tracking

Water content extracted from nutrition data:
- `hydration_ml_per_100g` - Milliliters of water per 100g/100ml
- Used for daily water intake tracking
- Example: Coca-Cola = ~89ml water per 100ml

## Maintenance Schedule

**Full Download:** Every 6 months
- Complete database refresh
- Catches products removed from differentials
- Run: `./scripts/download-openfoodfacts.sh && node ./scripts/process-products.js`

**Differential Updates:** Every 14 days (automated via cron)
- Downloads only changed products
- Keeps database current
- Run: `./scripts/update-differential.sh && node ./scripts/merge-updates.js`

## Disk Space

- **Temporary download:** ~7GB (deleted after processing)
- **Raw products:** ~500MB (`products-canada-raw.jsonl`)
- **Processed database:** ~200MB (`products-canada.json`)
- **Index:** ~50MB (`products-index.json`)
- **Total in git:** ~250MB

## Performance

**Lookup times:**
1. User cache: <1ms (IndexedDB)
2. Local git database: ~5ms (loaded into memory)
3. OpenFoodFacts API: ~200-500ms (network call)
4. Claude API: ~1000-2000ms (AI processing)

**Database load:**
- First load: ~500ms (fetches JSON from git)
- Subsequent: ~0ms (cached in memory)

## Contributing Photos

Future feature: Upload product photos back to OpenFoodFacts

```javascript
// Planned implementation
async function contributePhoto(upc, photoDataUrl) {
    // Upload to OpenFoodFacts via API
    // Requires OpenFoodFacts account
    // Improves community database
}
```

## Troubleshooting

**Download fails:**
```bash
# Check internet connection
curl -I https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz

# Resume partial download
curl -C - -L -o openfoodfacts-products.jsonl.gz https://...
```

**Out of disk space:**
```bash
# Clean temp files
rm -rf data/temp/

# Process in streaming mode (lower memory)
gunzip -c data/temp/openfoodfacts-products.jsonl.gz | node process-streaming.js
```

**jq not found:**
```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq

# CentOS/RHEL
sudo yum install jq
```

## License

Product data from OpenFoodFacts: Open Database License (ODbL)
Scripts: MIT License
