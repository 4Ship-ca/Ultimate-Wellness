/**
 * CORS-Safe UPC Lookup System
 * Works on static sites (GitHub Pages, Netlify, etc.)
 * No backend required!
 * 
 * 3-Level Cascade:
 * 1. Local Cache (IndexedDB)
 * 2. OpenFoodFacts API (CORS-friendly)
 * 3. Manual Entry Fallback
 */

// ============ Level 1: LOCAL CACHE ============

async function getFromCache(upc) {
    try {
        const cached = await getProductByUPC(upc); // Your existing IndexedDB function
        if (cached) {
            console.log('✅ Found in cache:', cached.product_name);
            return cached;
        }
    } catch (error) {
        console.error('Cache error:', error);
    }
    return null;
}

// ============ Level 2: OPENFOODFACTS API ============

async function searchOpenFoodFacts(upc) {
    try {
        console.log(`🔍 Searching OpenFoodFacts for UPC: ${upc}`);
        
        const url = `https://world.openfoodfacts.org/api/v2/product/${upc}.json`;
        
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'UltimateWellness/1.0'
            }
        });
        
        if (!response.ok) {
            console.log(`OpenFoodFacts returned ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        if (data.status === 0 || !data.product) {
            console.log('❌ Not found in OpenFoodFacts');
            return null;
        }
        
        const product = data.product;
        
        // Calculate SmartPoints from nutrition data
        let points = 5; // default
        
        if (product.nutriments) {
            const calories = product.nutriments['energy-kcal_100g'] || 
                           product.nutriments['energy-kcal'] || 0;
            const protein = product.nutriments.proteins_100g || 
                          product.nutriments.proteins || 0;
            const fat = product.nutriments.fat_100g || 
                       product.nutriments.fat || 0;
            const sugar = product.nutriments.sugars_100g || 
                         product.nutriments.sugars || 0;
            
            // Simple SmartPoints calculation
            // Rough formula: (Calories/50) + (Fat/4) - (Protein/10)
            if (calories > 0) {
                points = Math.max(0, Math.round(
                    (calories / 50) + 
                    (fat / 4) + 
                    (sugar / 10) - 
                    (protein / 10)
                ));
            }
        }
        
        const result = {
            upc: upc,
            product_name: product.product_name || 
                         product.product_name_en || 
                         'Unknown Product',
            brand: product.brands || 'Unknown Brand',
            points: points,
            serving_size: product.serving_size || '',
            nutrition: product.nutriments || {},
            image: product.image_url || product.image_front_url || '',
            source: 'openfoodfacts',
            verified: true,
            categories: product.categories || '',
            ingredients: product.ingredients_text || ''
        };
        
        console.log('✅ Found in OpenFoodFacts:', result.product_name);
        
        // Save to cache for next time
        try {
            await saveProductToDB(result);
        } catch (error) {
            console.error('Error caching product:', error);
        }
        
        return result;
        
    } catch (error) {
        console.error('OpenFoodFacts error:', error);
        return null;
    }
}

// ============ Level 3: MANUAL ENTRY FALLBACK ============

function showManualEntryForm(upc) {
    console.log('📝 Showing manual entry form');
    
    // Update modal content
    const scanResult = document.getElementById('scanResult');
    if (!scanResult) return;
    
    scanResult.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        ">
            <div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>
            <h3 style="margin: 0 0 10px 0; font-size: 20px;">Product Not Found</h3>
            <p style="margin: 0; opacity: 0.9; font-size: 14px;">
                UPC: <strong>${upc}</strong><br>
                This barcode isn't in our database yet. Please enter the details:
            </p>
        </div>
        
        <div style="
            background: #f8f9fa;
            border: 2px dashed #dee2e6;
            border-radius: 12px;
            padding: 20px;
        ">
            <div style="margin-bottom: 15px;">
                <label style="
                    display: block;
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #495057;
                ">Product Name *</label>
                <input 
                    type="text" 
                    id="manualProductName" 
                    placeholder="e.g., Organic Milk"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 16px;
                    "
                    required
                />
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="
                    display: block;
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #495057;
                ">Brand (optional)</label>
                <input 
                    type="text" 
                    id="manualBrand" 
                    placeholder="e.g., Organic Valley"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 16px;
                    "
                />
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="
                    display: block;
                    font-weight: 600;
                    margin-bottom: 5px;
                    color: #495057;
                ">SmartPoints *</label>
                <input 
                    type="number" 
                    id="manualPoints" 
                    placeholder="0"
                    value="5"
                    min="0"
                    style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ced4da;
                        border-radius: 8px;
                        font-size: 16px;
                    "
                    required
                />
                <small style="color: #6c757d; display: block; margin-top: 5px;">
                    💡 Tip: Check the nutrition label or use an online calculator
                </small>
            </div>
            
            <button 
                onclick="saveManualEntry('${upc}')"
                style="
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s;
                "
                onmouseover="this.style.transform='scale(1.02)'"
                onmouseout="this.style.transform='scale(1)'"
            >
                💾 Save Product
            </button>
        </div>
    `;
    
    // Focus on first input
    setTimeout(() => {
        document.getElementById('manualProductName')?.focus();
    }, 100);
}

async function saveManualEntry(upc) {
    const name = document.getElementById('manualProductName')?.value.trim();
    const brand = document.getElementById('manualBrand')?.value.trim();
    const points = parseInt(document.getElementById('manualPoints')?.value) || 0;
    
    if (!name) {
        alert('⚠️ Please enter a product name');
        return;
    }
    
    const product = {
        upc: upc,
        product_name: name,
        brand: brand || 'Unknown Brand',
        points: points,
        source: 'manual_entry',
        verified: false,
        dateAdded: new Date().toISOString()
    };
    
    try {
        // Save to database
        await saveProductToDB(product);
        
        // Show success and add to food log
        alert(`✅ Product saved!\n\n${name}\n${brand}\n${points} points`);
        
        // Add to today's log
        await logFood({
            ...product,
            date: getTodayKey(),
            servings: 1
        });
        
        // Close modal
        closeScan();
        
        // Refresh displays
        await updateTodayLog();
        await updatePointsDisplay();
        
    } catch (error) {
        console.error('Error saving manual entry:', error);
        alert('❌ Error saving product. Please try again.');
    }
}

// ============ MAIN CASCADE FUNCTION ============

async function lookupProductCascade(upc) {
    console.log(`🔄 Starting cascade lookup for UPC: ${upc}`);
    
    // Show loading
    const scanResult = document.getElementById('scanResult');
    if (scanResult) {
        scanResult.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="
                    width: 60px;
                    height: 60px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #667eea;
                    border-radius: 50%;
                    margin: 0 auto 20px;
                    animation: spin 1s linear infinite;
                "></div>
                <p style="color: #495057; font-size: 16px;">
                    🔍 Looking up product...<br>
                    <small style="color: #6c757d;">UPC: ${upc}</small>
                </p>
            </div>
            <style>
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
    }
    
    // Level 1: Check cache
    let product = await getFromCache(upc);
    if (product) {
        displayProduct(product);
        return product;
    }
    
    // Level 2: OpenFoodFacts (CORS-safe)
    product = await searchOpenFoodFacts(upc);
    if (product) {
        displayProduct(product);
        return product;
    }
    
    // Level 3: Manual entry
    console.log('❌ Product not found in any database');
    showManualEntryForm(upc);
    return null;
}

// ============ DISPLAY PRODUCT ============

function displayProduct(product) {
    const scanResult = document.getElementById('scanResult');
    if (!scanResult) return;
    
    const sourceEmoji = {
        'cache': '💾',
        'openfoodfacts': '🌍',
        'manual_entry': '✍️'
    }[product.source] || '📦';
    
    const sourceLabel = {
        'cache': 'From Your History',
        'openfoodfacts': 'OpenFoodFacts Database',
        'manual_entry': 'Your Manual Entry'
    }[product.source] || 'Unknown Source';
    
    scanResult.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 20px;
        ">
            <div style="font-size: 48px; margin-bottom: 10px;">✅</div>
            <h3 style="margin: 0 0 5px 0; font-size: 22px;">${product.product_name}</h3>
            <p style="margin: 0; opacity: 0.9;">${product.brand}</p>
            <div style="
                display: inline-block;
                background: rgba(255,255,255,0.2);
                padding: 4px 12px;
                border-radius: 20px;
                margin-top: 10px;
                font-size: 12px;
            ">
                ${sourceEmoji} ${sourceLabel}
            </div>
        </div>
        
        <div style="
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
        ">
            <div style="
                font-size: 48px;
                font-weight: 700;
                color: #667eea;
                text-align: center;
            ">
                ${product.points}
                <div style="
                    font-size: 14px;
                    color: #6c757d;
                    font-weight: 400;
                    margin-top: 5px;
                ">SmartPoints</div>
            </div>
        </div>
        
        ${product.image ? `
        <div style="margin-bottom: 15px;">
            <img 
                src="${product.image}" 
                alt="${product.product_name}"
                style="
                    width: 100%;
                    max-height: 200px;
                    object-fit: contain;
                    border-radius: 8px;
                    background: white;
                "
            />
        </div>
        ` : ''}
        
        ${product.serving_size ? `
        <div style="
            background: #e7f3ff;
            padding: 10px 15px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 14px;
            color: #004085;
        ">
            📏 Serving Size: ${product.serving_size}
        </div>
        ` : ''}
        
        <div style="display: flex; gap: 10px;">
            <button 
                onclick="addProductToLog('${product.upc}')"
                style="
                    flex: 1;
                    padding: 15px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                "
            >
                ➕ Add to Today
            </button>
            
            <button 
                onclick="closeScan()"
                style="
                    flex: 1;
                    padding: 15px;
                    background: #6c757d;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                "
            >
                ✖ Close
            </button>
        </div>
    `;
}

async function addProductToLog(upc) {
    try {
        const product = await getProductByUPC(upc);
        if (!product) {
            alert('❌ Product not found');
            return;
        }
        
        await logFood({
            ...product,
            date: getTodayKey(),
            servings: 1
        });
        
        closeScan();
        await updateTodayLog();
        await updatePointsDisplay();
        
        alert(`✅ Added ${product.product_name}!`);
        
    } catch (error) {
        console.error('Error adding to log:', error);
        alert('❌ Error adding product. Please try again.');
    }
}

// ============ EXPORT FOR USE IN APP ============

// Make functions globally available
window.lookupProductCascade = lookupProductCascade;
window.saveManualEntry = saveManualEntry;
window.addProductToLog = addProductToLog;

console.log('✅ CORS-Safe UPC Lookup System loaded');
console.log('📋 Available levels:');
console.log('  1️⃣ Local Cache (IndexedDB)');
console.log('  2️⃣ OpenFoodFacts API (CORS-friendly)');
console.log('  3️⃣ Manual Entry Fallback');
