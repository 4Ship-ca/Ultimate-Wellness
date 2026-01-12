// ============================================================================
// UPC System Integration
// Add this code to your existing app
// ============================================================================

// ============================================================================
// STEP 1: Add to Database Initialization (in initDB or onupgradeneeded)
// ============================================================================

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness', 3); // Increment version
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            const newVersion = event.newVersion;
            
            // ... existing stores ...
            
            // ADD THIS: Create UPC products store
            if (!db.objectStoreNames.contains('upc_products')) {
                const upcStore = db.createObjectStore('upc_products', {
                    keyPath: 'id',
                    autoIncrement: false
                });
                
                upcStore.createIndex('upc', 'upc', { unique: false });
                upcStore.createIndex('userId', 'userId', { unique: false });
                upcStore.createIndex('verified', 'verified', { unique: false });
                upcStore.createIndex('source', 'source', { unique: false });
                upcStore.createIndex('brand', 'brand', { unique: false });
                upcStore.createIndex('date_added', 'date_added', { unique: false });
                
                console.log('✅ Created upc_products store');
            }
        };
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
        };
        
        request.onerror = () => reject(request.error);
    });
}

// ============================================================================
// STEP 2: Add Script Tags to HTML (before closing </body>)
// ============================================================================

/*
<script src="upc-schema.js"></script>
<script src="upc-database.js"></script>
<script src="upc-ui.js"></script>
*/

// ============================================================================
// STEP 3: Integrate with Barcode Scanner
// ============================================================================

async function analyzeImage(imageDataUrl) {
    const useCase = document.getElementById('useCaseSelect').value;
    const resultDiv = document.getElementById('scanResult');
    
    resultDiv.innerHTML = '<div class="spinner"></div><p>Analyzing image with AI...</p>';
    
    // Extract media type and base64 data
    const mediaTypeMatch = imageDataUrl.match(/^data:(image\/[a-z]+);base64,/i);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';
    const base64Data = imageDataUrl.split(',')[1];
    
    try {
        if (useCase === 'barcode') {
            resultDiv.innerHTML = '<div class="spinner"></div><p>Reading barcode...</p>';
            
            // Extract UPC
            const upcPrompt = `Look at this image and extract any UPC, EAN, or barcode number you see. 
            Respond with ONLY the numeric code, nothing else. If you see multiple barcodes, return the longest one. If no barcode is visible, respond with "NONE".`;
            
            const upcResponse = await callClaudeVision(base64Data, upcPrompt, mediaType);
            const upcText = upcResponse.rawText || upcResponse.toString();
            const upcMatch = upcText.match(/\d{8,14}/);
            
            if (!upcMatch) {
                resultDiv.innerHTML = '<div class="spinner"></div><p>No barcode detected, analyzing product visually...</p>';
                const prompt = getAnalysisPrompt(useCase);
                const response = await callClaudeVision(base64Data, prompt, mediaType);
                displayScanResult(response, useCase);
                return;
            }
            
            const upc = upcMatch[0];
            console.log(`📊 Extracted UPC: ${upc}`);
            
            // CHANGED: Use enhanced multi-source lookup
            resultDiv.innerHTML = '<div class="spinner"></div><p>Looking up product database...</p>';
            const productData = await lookupUPC(upc); // This function now tries multiple sources
            
            // CHANGED: Use new UI function
            await showUPCProduct(productData, upc);
            return;
        }
        
        // ... rest of use cases ...
        
    } catch (error) {
        console.error('Analysis error:', error);
        resultDiv.innerHTML = `
            <div style="color: var(--danger); padding: 20px; text-align: center;">
                <p>⚠️ Error analyzing image</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

// ============================================================================
// STEP 4: Add Menu Items (in settings or navigation)
// ============================================================================

/*
Add to your settings menu:

<button class="btn" onclick="showUPCList()">
    📦 View Cached Products
</button>

<button class="btn" onclick="showUPCStatistics()">
    📊 UPC Statistics
</button>

<button class="btn" onclick="exportUPCDatabase()">
    💾 Export UPC Database
</button>

<input type="file" id="upcImportFile" accept=".json" style="display: none;" onchange="handleUPCImport(event)">
<button class="btn" onclick="document.getElementById('upcImportFile').click()">
    📥 Import UPC Database
</button>
*/

async function handleUPCImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const jsonData = JSON.parse(e.target.result);
            const count = await importUPCDatabase(jsonData);
            alert(`✅ Imported ${count} products`);
        };
        reader.readAsText(file);
    } catch (error) {
        alert('Error importing: ' + error.message);
    }
}

// ============================================================================
// STEP 5: Optional - Add to Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // ... existing initialization ...
    
    // Optional: Migrate legacy UPC data
    try {
        const migrated = await UPCSchema.migrate();
        if (migrated > 0) {
            console.log(`✅ Migrated ${migrated} legacy UPC products`);
        }
    } catch (error) {
        console.warn('UPC migration warning:', error);
    }
    
    // Optional: Pre-load common products
    try {
        await preloadCommonProducts();
    } catch (error) {
        console.warn('UPC preload warning:', error);
    }
});

async function preloadCommonProducts() {
    const commonUPCs = [
        // Add your most common product UPCs here
        // '057000010874', // Example: Heinz Beans
        // '041520893147', // Example: Chobani Greek Yogurt
    ];
    
    for (const upc of commonUPCs) {
        const cached = await getUPCProduct(upc);
        if (!cached) {
            await lookupUPC(upc);
            await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
        }
    }
}

// ============================================================================
// STEP 6: CSS Styles (add to your stylesheet)
// ============================================================================

/*
.upc-item {
    transition: all 0.2s ease;
}

.upc-item:hover {
    transform: translateX(5px);
}

.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
}

#upcSearchInput:focus {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
}

.modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.modal.active {
    opacity: 1;
    pointer-events: all;
}

.modal-content {
    background: var(--bg);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    max-width: 90%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-body {
    padding: 20px;
    overflow-y: auto;
    flex: 1;
}

.modal-footer {
    padding: 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.close-btn {
    background: none;
    border: none;
    font-size: 28px;
    color: var(--text-secondary);
    cursor: pointer;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    transition: all 0.2s ease;
}

.close-btn:hover {
    background: var(--bg-light);
    color: var(--text);
}
*/

// ============================================================================
// STEP 7: API Configuration (optional)
// ============================================================================

// If you want to customize the API endpoints or SmartPoints formula:

/*
// Add to beginning of file or config section
window.UPCDatabase.config.APIS.OPEN_FOOD_FACTS = 'https://world.openfoodfacts.org/api/v0/product';
window.UPCDatabase.config.SMARTPOINTS.CALORIES_MULTIPLIER = 0.0305;

// Or create a config file:
const UPC_USER_CONFIG = {
    // Override default point calculation
    customPointsFormula: (nutrition) => {
        // Your custom formula
        return Math.round((nutrition.calories * 0.03) + (nutrition.sugar * 0.1));
    },
    
    // Add custom data sources
    customAPIs: [
        {
            name: 'custom_api',
            lookup: async (upc) => {
                // Your custom lookup logic
                const response = await fetch(`https://api.example.com/product/${upc}`);
                return await response.json();
            }
        }
    ]
};
*/

// ============================================================================
// STEP 8: Testing
// ============================================================================

/*
// In browser console:

// Test lookup
await lookupUPC('057000010874');

// Test cache
await getUPCProduct('057000010874');

// Test save
await saveUPCProduct({
    upc: '999999999999',
    product_name: 'Test Product',
    points: 5,
    verified: true
});

// View all cached
const all = await getAllUPCProducts();
console.table(all);

// Export database
await exportUPCDatabase();

// Get statistics
const stats = await getUPCStatistics();
console.log(stats);
*/

// ============================================================================
// TROUBLESHOOTING
// ============================================================================

/*
If you encounter issues:

1. Check IndexedDB version was incremented
2. Verify all 3 script files are loaded (check network tab)
3. Check console for errors
4. Verify database store exists: indexedDB.databases()
5. Check if functions are available: typeof lookupUPC
6. Clear IndexedDB if corrupted: await clearUPCDatabase()
7. Re-import from backup if needed
*/

// ============================================================================
// COMPLETE MINIMAL INTEGRATION EXAMPLE
// ============================================================================

/*
<!DOCTYPE html>
<html>
<head>
    <title>UPC Scanner</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div id="app">
        <button onclick="document.getElementById('fileInput').click()">Scan Product</button>
        <input type="file" id="fileInput" accept="image/*" onchange="handleScan(event)" style="display: none;">
        <div id="result"></div>
    </div>
    
    <!-- UPC System Scripts -->
    <script src="upc-schema.js"></script>
    <script src="upc-database.js"></script>
    <script src="upc-ui.js"></script>
    
    <!-- Your App Script -->
    <script>
        // Initialize database
        async function initApp() {
            await initDB();
            console.log('✅ App initialized');
        }
        
        // Handle barcode scan
        async function handleScan(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageData = e.target.result;
                
                // Extract UPC (use your AI/vision API)
                const upc = await extractUPCFromImage(imageData);
                
                if (upc) {
                    // Lookup product
                    const product = await lookupUPC(upc);
                    
                    // Show UI
                    document.getElementById('result').innerHTML = '';
                    await showUPCProduct(product, upc);
                }
            };
            reader.readAsDataURL(file);
        }
        
        // Mock UPC extraction (replace with your AI implementation)
        async function extractUPCFromImage(imageData) {
            // Your vision AI logic here
            return '057000010874'; // Example UPC
        }
        
        // Start app
        initApp();
    </script>
</body>
</html>
*/
