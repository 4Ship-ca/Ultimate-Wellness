// ============================================================================
// UPC System - TypeScript Definitions
// ============================================================================

declare namespace UPCDatabase {
    // ========================================================================
    // Types & Interfaces
    // ========================================================================
    
    interface Nutrition {
        calories: number;
        protein: number;
        carbs: number;
        sugar: number;
        fat: number;
        saturated_fat: number;
        fiber: number;
        sodium: number;
    }
    
    interface ProductData {
        // Required fields
        upc: string;
        id: string;
        userId: string;
        product_name: string;
        
        // Point calculations
        points: number;
        points_per_serving: number;
        points_per_100g: number;
        
        // Serving information
        serving_size: string;
        serving_amount: number | null;
        
        // Optional product info
        brand?: string;
        nutrition?: Nutrition;
        image_url?: string;
        categories?: string;
        ingredients?: string;
        
        // Metadata
        verified: boolean;
        source: 'openfoodfacts' | 'barcodemonster' | 'upcitemdb' | 'manual';
        date_added: string;
        last_updated: string;
    }
    
    interface LookupResult {
        upc: string;
        product_name: string;
        brand: string;
        points: number;
        points_per_serving: number;
        points_per_100g: number;
        nutrition: Nutrition | null;
        serving_size: string;
        serving_amount: number | null;
        image_url: string;
        verified: boolean;
        source: string;
        categories?: string;
        ingredients?: string;
    }
    
    interface BatchImportResults {
        success: string[];
        failed: string[];
        skipped: string[];
    }
    
    interface Statistics {
        total: number;
        verified: number;
        unverified: number;
        sources: {
            openfoodfacts: number;
            barcodemonster: number;
            upcitemdb: number;
            manual: number;
        };
        averagePoints: number;
        mostCommonBrands: Array<{
            brand: string;
            count: number;
        }>;
    }
    
    interface ValidationResult {
        isValid: boolean;
        errors: string[];
    }
    
    interface ExportData {
        export_date: string;
        user_id: string;
        total_products: number;
        products: ProductData[];
    }
    
    interface Config {
        SMARTPOINTS: {
            CALORIES_MULTIPLIER: number;
            SATFAT_MULTIPLIER: number;
            SUGAR_MULTIPLIER: number;
            PROTEIN_MULTIPLIER: number;
        };
        DEFAULTS: {
            POINTS: number;
            SERVING_SIZE: string;
            SERVING_AMOUNT: number;
            SOURCE: string;
            VERIFIED: boolean;
        };
        APIS: {
            OPEN_FOOD_FACTS: string;
            BARCODE_MONSTER: string;
            UPCITEMDB: string;
        };
    }
    
    // ========================================================================
    // Core Operations
    // ========================================================================
    
    function getProduct(upc: string): Promise<ProductData | null>;
    function saveProduct(productData: ProductData): Promise<void>;
    function deleteProduct(upc: string): Promise<void>;
    function getAllProducts(): Promise<ProductData[]>;
    function getVerifiedProducts(): Promise<ProductData[]>;
    function searchProducts(query: string): Promise<ProductData[]>;
    
    // ========================================================================
    // Lookup Functions
    // ========================================================================
    
    function lookup(upc: string): Promise<LookupResult | null>;
    function lookupEnhanced(upc: string): Promise<LookupResult | null>;
    function lookupOpenFoodFacts(upc: string): Promise<LookupResult | null>;
    function lookupBarcodeMonster(upc: string): Promise<LookupResult | null>;
    function lookupUPCitemdb(upc: string): Promise<LookupResult | null>;
    
    // ========================================================================
    // Calculations
    // ========================================================================
    
    function calculatePoints(nutrition: Nutrition): number;
    function parseServingSize(servingSizeStr: string): number | null;
    function calculatePointsForAmount(pointsPer100g: number, amountInGrams: number): number;
    
    // ========================================================================
    // Import/Export
    // ========================================================================
    
    function exportDatabase(): Promise<number>;
    function importDatabase(jsonData: ExportData | string): Promise<number>;
    function clear(): Promise<number>;
    
    // ========================================================================
    // Batch Operations
    // ========================================================================
    
    function batchImport(upcList: string[]): Promise<BatchImportResults>;
    function updateAllPoints(): Promise<number>;
    
    // ========================================================================
    // Statistics
    // ========================================================================
    
    function getStatistics(): Promise<Statistics | null>;
    
    // ========================================================================
    // Validation
    // ========================================================================
    
    function isValidUPC(upc: string): boolean;
    function normalizeUPC(upc: string): string;
    function validateProduct(product: Partial<ProductData>): ValidationResult;
    
    // ========================================================================
    // Configuration
    // ========================================================================
    
    const config: Config;
}

declare namespace UPCUI {
    function showProduct(productData: UPCDatabase.ProductData | null, upc: string): Promise<void>;
    function showManualEntry(upc: string): void;
    function confirmProduct(upc: string, productData: UPCDatabase.ProductData): Promise<void>;
    function saveManual(upc: string): Promise<void>;
    function showList(): void;
    function showStatistics(): Promise<void>;
    function highlightChange(upc: string, originalPoints: number): void;
}

declare namespace UPCSchema {
    interface StoreConfig {
        name: string;
        keyPath: string;
        autoIncrement: boolean;
        indexes: Array<{
            name: string;
            keyPath: string;
            unique: boolean;
        }>;
    }
    
    const config: StoreConfig;
    
    function createStore(db: IDBDatabase, version: number): void;
    function upgradeStore(db: IDBDatabase, oldVersion: number, newVersion: number): void;
    function init(db: IDBDatabase): Promise<void>;
    function migrate(): Promise<number>;
}

declare namespace dbUPC {
    function get(storeName: string, id: string): Promise<any>;
    function put(storeName: string, data: any): Promise<any>;
    function deleteRecord(storeName: string, id: string): Promise<boolean>;
    function getAll(storeName: string, userId?: string | null): Promise<any[]>;
    function getByIndex(storeName: string, indexName: string, value: any): Promise<any[]>;
    function clear(storeName: string): Promise<boolean>;
    function count(storeName: string, userId?: string | null): Promise<number>;
}

// ========================================================================
// Window/Global Declarations
// ========================================================================

interface Window {
    UPCDatabase: typeof UPCDatabase;
    UPCUI: typeof UPCUI;
    UPCSchema: typeof UPCSchema;
    dbUPC: typeof dbUPC;
}

// ========================================================================
// Usage Examples (for IDE intellisense)
// ========================================================================

/*
// Lookup a product
const product: UPCDatabase.LookupResult | null = await UPCDatabase.lookup('057000010874');

if (product) {
    console.log(product.product_name);
    console.log(product.points_per_serving);
}

// Save a product
await UPCDatabase.saveProduct({
    upc: '057000010874',
    id: 'upc_057000010874_j',
    userId: 'j',
    product_name: 'Organic Milk',
    brand: 'Organic Valley',
    points: 3,
    points_per_serving: 3,
    points_per_100g: 2,
    serving_size: '1 cup (240ml)',
    serving_amount: 240,
    verified: true,
    source: 'openfoodfacts',
    date_added: new Date().toISOString(),
    last_updated: new Date().toISOString()
});

// Get all cached products
const allProducts: UPCDatabase.ProductData[] = await UPCDatabase.getAllProducts();

// Calculate points
const nutrition: UPCDatabase.Nutrition = {
    calories: 150,
    protein: 8,
    carbs: 12,
    sugar: 10,
    fat: 8,
    saturated_fat: 5,
    fiber: 2,
    sodium: 0.1
};

const points: number = UPCDatabase.calculatePoints(nutrition);

// Batch import
const results: UPCDatabase.BatchImportResults = await UPCDatabase.batchImport([
    '057000010874',
    '041520893147'
]);

console.log(`Success: ${results.success.length}`);
console.log(`Failed: ${results.failed.length}`);

// Show UI
await UPCUI.showProduct(product, '057000010874');

// Get statistics
const stats: UPCDatabase.Statistics | null = await UPCDatabase.getStatistics();
if (stats) {
    console.log(`Total products: ${stats.total}`);
    console.log(`Verified: ${stats.verified}`);
}
*/

// ========================================================================
// OpenFoodFacts API Response Types
// ========================================================================

declare namespace OpenFoodFacts {
    interface Nutriments {
        'energy-kcal_100g'?: number;
        proteins_100g?: number;
        carbohydrates_100g?: number;
        sugars_100g?: number;
        fat_100g?: number;
        'saturated-fat_100g'?: number;
        fiber_100g?: number;
        sodium_100g?: number;
    }
    
    interface Product {
        product_name: string;
        brands?: string;
        serving_size?: string;
        nutriments?: Nutriments;
        image_url?: string;
        image_front_url?: string;
        categories?: string;
        ingredients_text?: string;
    }
    
    interface Response {
        status: 0 | 1;
        product?: Product;
    }
}

// ========================================================================
// BarcodeMonster API Response Types
// ========================================================================

declare namespace BarcodeMonster {
    interface Response {
        company?: string;
        description?: string;
        product?: string;
        category?: string;
    }
}

// ========================================================================
// UPCitemdb API Response Types
// ========================================================================

declare namespace UPCitemdb {
    interface Item {
        title: string;
        brand?: string;
        category?: string;
        images?: string[];
    }
    
    interface Response {
        items?: Item[];
    }
}

export {
    UPCDatabase,
    UPCUI,
    UPCSchema,
    dbUPC,
    OpenFoodFacts,
    BarcodeMonster,
    UPCitemdb
};
