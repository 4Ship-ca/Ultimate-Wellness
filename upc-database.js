// ============================================================================
// UPC Database Module - Standalone
// Multi-source barcode lookup with intelligent caching
// ============================================================================

// Configuration
const UPC_CONFIG = {
    SMARTPOINTS: {
        CALORIES_MULTIPLIER: 0.0305,
        SATFAT_MULTIPLIER: 0.275,
        SUGAR_MULTIPLIER: 0.12,
        PROTEIN_MULTIPLIER: 0.098
    },
    DEFAULTS: {
        POINTS: 5,
        SERVING_SIZE: '1 serving',
        SERVING_AMOUNT: 100,
        SOURCE: 'manual',
        VERIFIED: false
    },
    APIS: {
        OPEN_FOOD_FACTS: 'https://world.openfoodfacts.org/api/v0/product',
        BARCODE_MONSTER: 'https://barcode.monster/api',
        UPCITEMDB: 'https://api.upcitemdb.com/prod/trial/lookup'
    }
};

// ============================================================================
// CORE DATABASE FUNCTIONS
// ============================================================================

async function getUPCProduct(upc) {
    try {
        const userId = getCurrentUserId();
        const allProducts = await dbGetAll('upc_database', userId);

        if (!allProducts) return null;

        const product = allProducts.find(p => p.upc === upc);
        return product || null;

    } catch (error) {
        console.error('Error getting UPC product from cache:', error);
        return null;
    }
}

async function saveUPCProduct(productData) {
    try {
        const userId = getCurrentUserId();
        const today = new Date().toISOString();
        
        productData.userId = userId;
        productData.id = `upc_${productData.upc}_${userId}`;
        productData.date_added = productData.date_added || today;
        productData.last_updated = today;
        productData.verified = productData.verified || false;
        
        if (!productData.points_per_serving && productData.points && productData.serving_size) {
            productData.points_per_serving = productData.points;
        }
        
        if (productData.nutrition && !productData.points_per_100g) {
            productData.points_per_100g = calculateSmartPoints(productData.nutrition);
        }

        await dbPut('upc_database', productData);
        console.log(`💾 Saved UPC ${productData.upc} to local database`);
        
    } catch (error) {
        console.error('Error saving UPC product:', error);
        throw error;
    }
}

async function deleteUPCProduct(upc) {
    try {
        const userId = getCurrentUserId();
        const id = `upc_${upc}_${userId}`;
        await dbDelete('upc_database', id);
        console.log(`🗑️ Deleted UPC ${upc}`);
    } catch (error) {
        console.error('Error deleting UPC product:', error);
        throw error;
    }
}

async function getAllUPCProducts() {
    try {
        const userId = getCurrentUserId();
        return await dbGetAll('upc_database', userId) || [];
    } catch (error) {
        console.error('Error getting all UPC products:', error);
        return [];
    }
}

async function getVerifiedUPCProducts() {
    try {
        const all = await getAllUPCProducts();
        return all.filter(p => p.verified);
    } catch (error) {
        console.error('Error getting verified UPC products:', error);
        return [];
    }
}

async function searchUPCProducts(query) {
    try {
        const all = await getAllUPCProducts();
        const lowerQuery = query.toLowerCase();
        return all.filter(p => 
            p.product_name?.toLowerCase().includes(lowerQuery) ||
            p.brand?.toLowerCase().includes(lowerQuery) ||
            p.upc?.includes(query)
        );
    } catch (error) {
        console.error('Error searching UPC products:', error);
        return [];
    }
}

// ============================================================================
// MULTI-SOURCE LOOKUP
// ============================================================================

async function lookupUPC(upc) {
    return await lookupUPCEnhanced(upc);
}

async function lookupUPCEnhanced(upc) {
    try {
        console.log(`🔍 Looking up UPC: ${upc}`);
        
        const cached = await getUPCProduct(upc);
        if (cached) {
            console.log('✅ Found in local cache (verified by user)');
            return cached;
        }
        
        console.log('🌐 Querying Open Food Facts...');
        let productData = await lookupOpenFoodFacts(upc);
        if (productData) {
            console.log('✅ Found in Open Food Facts');
            return productData;
        }
        
        console.log('🌐 Querying Barcode Monster...');
        productData = await lookupBarcodeMonster(upc);
        if (productData) {
            console.log('✅ Found in Barcode Monster');
            return productData;
        }
        
        console.log('🌐 Querying UPCitemdb...');
        productData = await lookupUPCitemdb(upc);
        if (productData) {
            console.log('✅ Found in UPCitemdb');
            return productData;
        }
        
        console.log('❌ Product not found in any database');
        return null;
        
    } catch (error) {
        console.error('UPC lookup error:', error);
        return null;
    }
}

async function lookupOpenFoodFacts(upc) {
    try {
        const response = await fetch(`${UPC_CONFIG.APIS.OPEN_FOOD_FACTS}/${upc}.json`);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (data.status === 0 || !data.product) return null;
        
        const product = data.product;
        
        const nutrition = {
            calories: product.nutriments?.['energy-kcal_100g'] || 0,
            protein: product.nutriments?.proteins_100g || 0,
            carbs: product.nutriments?.carbohydrates_100g || 0,
            sugar: product.nutriments?.sugars_100g || 0,
            fat: product.nutriments?.fat_100g || 0,
            saturated_fat: product.nutriments?.['saturated-fat_100g'] || 0,
            fiber: product.nutriments?.fiber_100g || 0,
            sodium: product.nutriments?.sodium_100g || 0
        };
        
        const pointsPer100g = calculateSmartPoints(nutrition);
        
        const servingSize = product.serving_size || '100g';
        const servingAmount = parseServingSize(servingSize);
        
        let pointsPerServing = pointsPer100g;
        if (servingAmount && servingAmount !== 100) {
            pointsPerServing = Math.round((pointsPer100g * servingAmount) / 100);
        }
        
        return {
            upc: upc,
            product_name: product.product_name || 'Unknown Product',
            brand: product.brands || '',
            points: pointsPerServing,
            points_per_serving: pointsPerServing,
            points_per_100g: pointsPer100g,
            nutrition: nutrition,
            serving_size: servingSize,
            serving_amount: servingAmount,
            image_url: product.image_url || product.image_front_url || '',
            verified: false,
            source: 'openfoodfacts',
            categories: product.categories || '',
            ingredients: product.ingredients_text || ''
        };
        
    } catch (error) {
        console.error('Open Food Facts lookup error:', error);
        return null;
    }
}

async function lookupBarcodeMonster(upc) {
    try {
        const response = await fetch(`${UPC_CONFIG.APIS.BARCODE_MONSTER}/${upc}`);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (!data || !data.company) return null;
        
        return {
            upc: upc,
            product_name: data.description || data.product || 'Unknown Product',
            brand: data.company || '',
            points: UPC_CONFIG.DEFAULTS.POINTS,
            points_per_serving: UPC_CONFIG.DEFAULTS.POINTS,
            points_per_100g: UPC_CONFIG.DEFAULTS.POINTS,
            nutrition: null,
            serving_size: UPC_CONFIG.DEFAULTS.SERVING_SIZE,
            serving_amount: null,
            image_url: '',
            verified: false,
            source: 'barcodemonster',
            categories: data.category || ''
        };
        
    } catch (error) {
        console.error('Barcode Monster lookup error:', error);
        return null;
    }
}

async function lookupUPCitemdb(upc) {
    try {
        const response = await fetch(`${UPC_CONFIG.APIS.UPCITEMDB}?upc=${upc}`);
        
        if (!response.ok) return null;
        
        const data = await response.json();
        
        if (!data || !data.items || data.items.length === 0) return null;
        
        const item = data.items[0];
        
        return {
            upc: upc,
            product_name: item.title || 'Unknown Product',
            brand: item.brand || '',
            points: UPC_CONFIG.DEFAULTS.POINTS,
            points_per_serving: UPC_CONFIG.DEFAULTS.POINTS,
            points_per_100g: UPC_CONFIG.DEFAULTS.POINTS,
            nutrition: null,
            serving_size: UPC_CONFIG.DEFAULTS.SERVING_SIZE,
            serving_amount: null,
            image_url: item.images && item.images.length > 0 ? item.images[0] : '',
            verified: false,
            source: 'upcitemdb',
            categories: item.category || ''
        };
        
    } catch (error) {
        console.error('UPCitemdb lookup error:', error);
        return null;
    }
}

// ============================================================================
// CALCULATIONS
// ============================================================================

function calculateSmartPoints(nutrition) {
    const calories = nutrition.calories || 0;
    const protein = nutrition.protein || 0;
    const sugar = nutrition.sugar || 0;
    const saturated_fat = nutrition.saturated_fat || 0;
    
    let points = (calories * UPC_CONFIG.SMARTPOINTS.CALORIES_MULTIPLIER) +
                 (saturated_fat * UPC_CONFIG.SMARTPOINTS.SATFAT_MULTIPLIER) +
                 (sugar * UPC_CONFIG.SMARTPOINTS.SUGAR_MULTIPLIER) -
                 (protein * UPC_CONFIG.SMARTPOINTS.PROTEIN_MULTIPLIER);
    
    points = Math.max(0, points);
    
    return Math.round(points);
}

function parseServingSize(servingSizeStr) {
    if (!servingSizeStr) return null;
    
    const gramsMatch = servingSizeStr.match(/(\d+\.?\d*)\s*g/i);
    if (gramsMatch) {
        return parseFloat(gramsMatch[1]);
    }
    
    const mlMatch = servingSizeStr.match(/(\d+\.?\d*)\s*ml/i);
    if (mlMatch) {
        return parseFloat(mlMatch[1]);
    }
    
    return 100;
}

function calculatePointsForAmount(pointsPer100g, amountInGrams) {
    return Math.round((pointsPer100g * amountInGrams) / 100);
}

// ============================================================================
// IMPORT/EXPORT
// ============================================================================

async function exportUPCDatabase() {
    try {
        const userId = getCurrentUserId();
        const allProducts = await dbGetAll('upc_database', userId);

        const exportData = {
            export_date: new Date().toISOString(),
            user_id: userId,
            total_products: allProducts ? allProducts.length : 0,
            products: allProducts || []
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `upc_database_${userId}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        console.log(`📦 Exported ${exportData.total_products} UPC products`);
        return exportData.total_products;
        
    } catch (error) {
        console.error('Error exporting UPC database:', error);
        throw error;
    }
}

async function importUPCDatabase(jsonData) {
    try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
        
        if (!data.products || !Array.isArray(data.products)) {
            throw new Error('Invalid UPC database format');
        }
        
        let imported = 0;
        for (const product of data.products) {
            await saveUPCProduct(product);
            imported++;
        }
        
        console.log(`📥 Imported ${imported} UPC products`);
        return imported;
        
    } catch (error) {
        console.error('Error importing UPC database:', error);
        throw error;
    }
}

async function clearUPCDatabase() {
    try {
        const all = await getAllUPCProducts();
        for (const product of all) {
            await deleteUPCProduct(product.upc);
        }
        console.log(`🗑️ Cleared ${all.length} UPC products`);
        return all.length;
    } catch (error) {
        console.error('Error clearing UPC database:', error);
        throw error;
    }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

async function batchImportUPCs(upcList) {
    const results = {
        success: [],
        failed: [],
        skipped: []
    };
    
    for (const upc of upcList) {
        try {
            const existing = await getUPCProduct(upc);
            if (existing) {
                results.skipped.push(upc);
                continue;
            }
            
            const product = await lookupUPC(upc);
            if (product) {
                await saveUPCProduct(product);
                results.success.push(upc);
            } else {
                results.failed.push(upc);
            }
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
        } catch (error) {
            console.error(`Error importing UPC ${upc}:`, error);
            results.failed.push(upc);
        }
    }
    
    return results;
}

async function updateAllProductPoints() {
    try {
        const all = await getAllUPCProducts();
        let updated = 0;
        
        for (const product of all) {
            if (product.nutrition && !product.verified) {
                const newPoints = calculateSmartPoints(product.nutrition);
                if (newPoints !== product.points_per_100g) {
                    product.points_per_100g = newPoints;
                    
                    if (product.serving_amount) {
                        product.points_per_serving = calculatePointsForAmount(
                            newPoints,
                            product.serving_amount
                        );
                        product.points = product.points_per_serving;
                    }
                    
                    await saveUPCProduct(product);
                    updated++;
                }
            }
        }
        
        console.log(`♻️ Updated ${updated} product points`);
        return updated;
        
    } catch (error) {
        console.error('Error updating product points:', error);
        throw error;
    }
}

// ============================================================================
// STATISTICS & ANALYTICS
// ============================================================================

async function getUPCStatistics() {
    try {
        const all = await getAllUPCProducts();
        
        const verified = all.filter(p => p.verified).length;
        const unverified = all.filter(p => !p.verified).length;
        
        const sources = {
            openfoodfacts: all.filter(p => p.source === 'openfoodfacts').length,
            barcodemonster: all.filter(p => p.source === 'barcodemonster').length,
            upcitemdb: all.filter(p => p.source === 'upcitemdb').length,
            manual: all.filter(p => p.source === 'manual').length
        };
        
        const avgPoints = all.length > 0 
            ? Math.round(all.reduce((sum, p) => sum + (p.points || 0), 0) / all.length)
            : 0;
        
        return {
            total: all.length,
            verified: verified,
            unverified: unverified,
            sources: sources,
            averagePoints: avgPoints,
            mostCommonBrands: getMostCommonBrands(all, 5)
        };
        
    } catch (error) {
        console.error('Error getting UPC statistics:', error);
        return null;
    }
}

function getMostCommonBrands(products, limit = 5) {
    const brandCounts = {};
    products.forEach(p => {
        if (p.brand) {
            brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
        }
    });
    
    return Object.entries(brandCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([brand, count]) => ({ brand, count }));
}

// ============================================================================
// VALIDATION & UTILITIES
// ============================================================================

function isValidUPC(upc) {
    return /^\d{8}$|^\d{12,14}$/.test(upc);
}

function normalizeUPC(upc) {
    return upc.trim().replace(/[^0-9]/g, '');
}

function validateProductData(product) {
    const errors = [];
    
    if (!product.upc || !isValidUPC(product.upc)) {
        errors.push('Invalid UPC format');
    }
    
    if (!product.product_name || product.product_name.trim() === '') {
        errors.push('Product name is required');
    }
    
    if (product.points !== undefined && (isNaN(product.points) || product.points < 0)) {
        errors.push('Points must be a non-negative number');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

// ============================================================================
// EXPORT MODULE
// ============================================================================

if (typeof window !== 'undefined') {
    window.UPCDatabase = {
        // Core operations
        getProduct: getUPCProduct,
        saveProduct: saveUPCProduct,
        deleteProduct: deleteUPCProduct,
        getAllProducts: getAllUPCProducts,
        getVerifiedProducts: getVerifiedUPCProducts,
        searchProducts: searchUPCProducts,
        
        // Lookup
        lookup: lookupUPC,
        lookupEnhanced: lookupUPCEnhanced,
        lookupOpenFoodFacts: lookupOpenFoodFacts,
        lookupBarcodeMonster: lookupBarcodeMonster,
        lookupUPCitemdb: lookupUPCitemdb,
        
        // Calculations
        calculatePoints: calculateSmartPoints,
        parseServingSize: parseServingSize,
        calculatePointsForAmount: calculatePointsForAmount,
        
        // Import/Export
        export: exportUPCDatabase,
        import: importUPCDatabase,
        clear: clearUPCDatabase,
        
        // Batch operations
        batchImport: batchImportUPCs,
        updateAllPoints: updateAllProductPoints,
        
        // Statistics
        getStatistics: getUPCStatistics,
        
        // Validation
        isValidUPC: isValidUPC,
        normalizeUPC: normalizeUPC,
        validateProduct: validateProductData,
        
        // Config
        config: UPC_CONFIG
    };
}
