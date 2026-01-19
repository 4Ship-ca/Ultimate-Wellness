// Cloudflare Worker to download and process OpenFoodFacts data
// Deploy this to: https://ultimate-wellness.your4ship.workers.dev/api/download-openfoodfacts

export default {
  async fetch(request) {
    // Stream download and process in chunks
    const response = await fetch('https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const canadaProducts = {};
    let count = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const product = JSON.parse(line);

          // Filter Canada products with nutrition
          if (product.countries_tags?.includes('en:canada') &&
              product.nutriments?.['energy-kcal_100g']) {

            // Calculate SmartPoints
            const nutrition = {
              calories: product.nutriments['energy-kcal_100g'] || 0,
              protein: product.nutriments.proteins_100g || 0,
              carbs: product.nutriments.carbohydrates_100g || 0,
              sugar: product.nutriments.sugars_100g || 0,
              fat: product.nutriments.fat_100g || 0,
              saturated_fat: product.nutriments['saturated-fat_100g'] || 0,
              fiber: product.nutriments.fiber_100g || 0,
              sodium: product.nutriments.sodium_100g || 0,
              water: product.nutriments.water_100g || 0
            };

            const points = calculateSmartPoints(nutrition);

            canadaProducts[product.code] = {
              upc: product.code,
              product_name: product.product_name || product.product_name_en || 'Unknown',
              brand: product.brands || '',
              points_per_100g: points,
              nutrition: nutrition,
              serving_size: product.serving_size || '100g',
              categories: product.categories || '',
              image_url: product.image_url || '',
              source: 'openfoodfacts',
              last_modified: product.last_modified_t
            };

            count++;

            // Limit to prevent timeout (process in batches)
            if (count >= 1000) break;
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }

      if (count >= 1000) break;
    }

    return new Response(JSON.stringify({
      total: count,
      products: canadaProducts
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

function calculateSmartPoints(nutrition) {
  const points = (nutrition.calories * 0.0305) +
                 (nutrition.saturated_fat * 0.275) +
                 (nutrition.sugar * 0.12) -
                 (nutrition.protein * 0.098);
  return Math.max(0, Math.round(points));
}
