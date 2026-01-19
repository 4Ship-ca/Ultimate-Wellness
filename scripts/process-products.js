#!/usr/bin/env node
/**
 * ==============================================================================
 * OpenFoodFacts Product Processor
 * Calculates SmartPoints per 100g/100ml for all Canada products
 * ==============================================================================
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

const PROJECT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(PROJECT_DIR, 'data');
const INPUT_FILE = path.join(DATA_DIR, 'products-canada-raw.jsonl');
const OUTPUT_FILE = path.join(DATA_DIR, 'products-canada.json');
const INDEX_FILE = path.join(DATA_DIR, 'products-index.json');

// SmartPoints formula (WW algorithm)
const SMARTPOINTS = {
    CALORIES_MULTIPLIER: 0.0305,
    SATFAT_MULTIPLIER: 0.275,
    SUGAR_MULTIPLIER: 0.12,
    PROTEIN_MULTIPLIER: 0.098
};

/**
 * Calculate SmartPoints from nutrition data (per 100g/100ml)
 */
function calculateSmartPoints(nutrition) {
    if (!nutrition) return 5; // Default if no nutrition

    const calories = nutrition.calories || 0;
    const protein = nutrition.protein || 0;
    const sugar = nutrition.sugar || 0;
    const saturated_fat = nutrition.saturated_fat || 0;

    let points = (calories * SMARTPOINTS.CALORIES_MULTIPLIER) +
                 (saturated_fat * SMARTPOINTS.SATFAT_MULTIPLIER) +
                 (sugar * SMARTPOINTS.SUGAR_MULTIPLIER) -
                 (protein * SMARTPOINTS.PROTEIN_MULTIPLIER);

    points = Math.max(0, points);

    return Math.round(points);
}

/**
 * Parse serving size to grams/ml
 */
function parseServingSize(servingSizeStr) {
    if (!servingSizeStr) return 100;

    const gramsMatch = servingSizeStr.match(/(\d+\.?\d*)\s*g/i);
    if (gramsMatch) {
        return parseFloat(gramsMatch[1]);
    }

    const mlMatch = servingSizeStr.match(/(\d+\.?\d*)\s*ml/i);
    if (mlMatch) {
        return parseFloat(mlMatch[1]);
    }

    return 100; // Default
}

/**
 * Process products and calculate points
 */
async function processProducts() {
    console.log('======================================');
    console.log('OpenFoodFacts Product Processor');
    console.log('======================================\n');

    const products = {};
    const index = {
        upc: {},
        brand: {},
        category: {},
        lastUpdated: new Date().toISOString(),
        totalProducts: 0
    };

    let processed = 0;
    let skipped = 0;

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    console.log('📊 Processing products...\n');

    for await (const line of rl) {
        try {
            const product = JSON.parse(line);

            // Skip if no UPC
            if (!product.upc) {
                skipped++;
                continue;
            }

            // Calculate points per 100g
            const points_per_100g = calculateSmartPoints(product.nutrition);

            // Parse serving size
            const serving_amount = product.serving_quantity || parseServingSize(product.serving_size);

            // Calculate points per serving
            let points_per_serving = points_per_100g;
            if (serving_amount && serving_amount !== 100) {
                points_per_serving = Math.round((points_per_100g * serving_amount) / 100);
            }

            // Calculate hydration contribution (water content)
            const hydration_ml = product.nutrition?.water || 0;

            // Build final product object
            const processedProduct = {
                upc: product.upc,
                product_name: product.product_name || 'Unknown Product',
                brand: product.brand || '',
                points_per_100g: points_per_100g,
                points_per_serving: points_per_serving,
                serving_size: product.serving_size || '100g',
                serving_amount: serving_amount,
                hydration_ml_per_100g: hydration_ml,
                nutrition: product.nutrition,
                categories: product.categories || '',
                ingredients: product.ingredients_text || '',
                image_url: product.image_url || '',
                source: 'openfoodfacts',
                verified: false,
                last_modified: product.last_modified
            };

            // Store product
            products[product.upc] = processedProduct;

            // Update index
            index.upc[product.upc] = {
                name: processedProduct.product_name,
                brand: processedProduct.brand,
                points: points_per_100g
            };

            // Brand index
            if (product.brand) {
                if (!index.brand[product.brand]) {
                    index.brand[product.brand] = [];
                }
                index.brand[product.brand].push(product.upc);
            }

            // Category index
            if (product.categories) {
                const categories = product.categories.split(',').map(c => c.trim());
                categories.forEach(cat => {
                    if (cat) {
                        if (!index.category[cat]) {
                            index.category[cat] = [];
                        }
                        index.category[cat].push(product.upc);
                    }
                });
            }

            processed++;

            // Progress update every 1000 products
            if (processed % 1000 === 0) {
                process.stdout.write(`\r✓ Processed: ${processed.toLocaleString()} products`);
            }

        } catch (error) {
            skipped++;
        }
    }

    console.log(`\n\n✓ Processing complete!`);
    console.log(`  Processed: ${processed.toLocaleString()}`);
    console.log(`  Skipped: ${skipped.toLocaleString()}`);

    // Update index metadata
    index.totalProducts = processed;

    // Save products database
    console.log('\n💾 Saving products database...');
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(products, null, 2));
    console.log(`✓ Saved: ${OUTPUT_FILE}`);

    // Save index
    console.log('💾 Saving product index...');
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));
    console.log(`✓ Saved: ${INDEX_FILE}`);

    // Calculate statistics
    const pointsDistribution = {};
    Object.values(products).forEach(p => {
        const points = p.points_per_100g;
        pointsDistribution[points] = (pointsDistribution[points] || 0) + 1;
    });

    console.log('\n📊 SmartPoints Distribution:');
    Object.entries(pointsDistribution)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .slice(0, 15)
        .forEach(([points, count]) => {
            const bar = '█'.repeat(Math.ceil(count / 100));
            console.log(`  ${points.toString().padStart(3)} pts: ${count.toString().padStart(6)} products ${bar}`);
        });

    // Save statistics
    const stats = {
        total_products: processed,
        date_processed: new Date().toISOString(),
        points_distribution: pointsDistribution,
        brands_count: Object.keys(index.brand).length,
        categories_count: Object.keys(index.category).length
    };

    fs.writeFileSync(
        path.join(DATA_DIR, 'products-stats.json'),
        JSON.stringify(stats, null, 2)
    );

    console.log('\n======================================');
    console.log('✓ All done!');
    console.log('======================================');
    console.log(`Database: ${OUTPUT_FILE}`);
    console.log(`Index: ${INDEX_FILE}`);
    console.log(`Stats: ${path.join(DATA_DIR, 'products-stats.json')}`);
    console.log(`\nNext: Commit to git and update lookup cascade`);
}

// Run processor
processProducts().catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
});
