// ============================================================================
// UPC UI Components
// ============================================================================

async function showUPCProduct(productData, upc) {
    const resultDiv = document.getElementById('scanResult');
    
    if (!productData) {
        showManualUPCEntry(upc);
        return;
    }
    
    const pointsStatus = productData.verified ? '✓ Verified' : '⚠️ Unverified';
    const statusColor = productData.verified ? 'var(--success)' : 'var(--warning)';
    const dataSource = productData.source ? ` (${productData.source})` : '';
    
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px;">
            <h3>${escapeHtml(productData.product_name)}</h3>
            ${productData.brand ? `<p style="color: var(--text-secondary);">${escapeHtml(productData.brand)}</p>` : ''}
            <p style="font-size: 12px; color: var(--text-secondary);">
                UPC: ${upc}${dataSource}
            </p>
            
            ${productData.image_url ? `
                <img src="${productData.image_url}" alt="${escapeHtml(productData.product_name)}" 
                     style="max-width: 200px; max-height: 200px; margin: 15px 0; border-radius: 8px;"
                     onerror="this.style.display='none'">
            ` : ''}
            
            <div style="margin: 15px 0;">
                <div style="font-size: 14px; color: ${statusColor}; margin-bottom: 10px;">
                    ${pointsStatus}
                </div>
                
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    <div style="flex: 1; padding: 15px; background: var(--bg-light); border-radius: 8px; border: 2px solid var(--primary);">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">Per Serving</div>
                        <input type="number" id="upcPointsServing" value="${productData.points_per_serving || productData.points}" min="0" 
                            onchange="highlightPointsChange('${upc}', ${productData.points_per_serving || productData.points})"
                            style="width: 80px; padding: 8px; font-size: 28px; font-weight: bold; border: none; background: transparent; color: var(--primary); text-align: center;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">${escapeHtml(productData.serving_size || '1 serving')}</div>
                    </div>
                    
                    ${productData.points_per_100g ? `
                    <div style="flex: 1; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">Per 100g</div>
                        <div style="font-size: 28px; font-weight: bold; color: var(--text-secondary); text-align: center;">
                            ${productData.points_per_100g}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">standardized</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            ${productData.nutrition ? `
                <div style="font-size: 14px; color: var(--text-secondary); margin: 15px 0; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                    <strong>Nutrition per 100g:</strong><br>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
                        <div>🔥 ${Math.round(productData.nutrition.calories)} cal</div>
                        <div>🥩 ${Math.round(productData.nutrition.protein)}g protein</div>
                        <div>🍞 ${Math.round(productData.nutrition.carbs)}g carbs</div>
                        <div>🧈 ${Math.round(productData.nutrition.fat)}g fat</div>
                        ${productData.nutrition.sugar ? `<div>🍬 ${Math.round(productData.nutrition.sugar)}g sugar</div>` : ''}
                        ${productData.nutrition.fiber ? `<div>🌾 ${Math.round(productData.nutrition.fiber)}g fiber</div>` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div id="pointsChangeWarning" style="display: none; margin: 15px 0; padding: 15px; background: var(--warning); color: #000; border-radius: 8px; font-weight: bold;">
                ⚠️ Points changed from ${productData.points_per_serving || productData.points} to <span id="newPoints"></span>
            </div>
            
            <button class="btn" onclick="confirmUPCProduct('${upc}', ${JSON.stringify(productData).replace(/"/g, '&quot;')})">
                ✓ Confirm & Log Food
            </button>
            <button class="btn btn-secondary" style="margin-left: 10px;" onclick="closeScan()">
                Cancel
            </button>
        </div>
    `;
}

function showManualUPCEntry(upc) {
    const resultDiv = document.getElementById('scanResult');
    
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px; border: 2px solid var(--warning);">
            <h3>⚠️ UPC Not Found</h3>
            <p style="color: var(--text-secondary);">UPC: ${upc}</p>
            <p style="margin: 15px 0;">This barcode is not in our database. Please enter product details:</p>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Product Name:</label>
                <input type="text" id="manualProductName" placeholder="e.g., Organic Milk" 
                       style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Brand (optional):</label>
                <input type="text" id="manualBrand" placeholder="e.g., Organic Valley" 
                       style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
            </div>
            
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">SmartPoints:</label>
                <input type="number" id="manualPoints" value="0" min="0" 
                       style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
            </div>
            
            <button class="btn" onclick="saveManualUPC('${upc}')">
                💾 Save to Local Database
            </button>
            <button class="btn btn-secondary" style="margin-left: 10px;" onclick="closeScan()">
                Cancel
            </button>
        </div>
    `;
}

function highlightPointsChange(upc, originalPoints) {
    const pointsInput = document.getElementById('upcPointsServing') || document.getElementById('upcPoints');
    if (!pointsInput) return;
    
    const newPoints = parseInt(pointsInput.value);
    const warning = document.getElementById('pointsChangeWarning');
    const newPointsSpan = document.getElementById('newPoints');
    
    if (warning && newPointsSpan && newPoints !== originalPoints) {
        warning.style.display = 'block';
        newPointsSpan.textContent = newPoints;
    } else if (warning) {
        warning.style.display = 'none';
    }
}

async function confirmUPCProduct(upc, productData) {
    const pointsInput = document.getElementById('upcPointsServing') || document.getElementById('upcPoints');
    if (!pointsInput) {
        console.error('Points input field not found');
        return;
    }
    
    const points = parseInt(pointsInput.value);
    const originalPoints = productData.points_per_serving || productData.points;
    
    if (points !== originalPoints) {
        const confirmed = confirm(`UPC ${upc}: Change points from ${originalPoints} to ${points}?\n\nThis will be saved for future scans.`);
        if (!confirmed) {
            return;
        }
    }
    
    productData.points = points;
    productData.points_per_serving = points;
    productData.verified = true;
    
    await saveUPCProduct(productData);
    console.log(`✅ Saved UPC ${upc} with ${points} points per serving to local cache`);
    
    await logFood(productData.product_name, points, null);
    
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px; text-align: center;">
            <h3 style="color: var(--success);">✅ Logged Successfully!</h3>
            <p>${escapeHtml(productData.product_name)}</p>
            <p style="font-size: 32px; font-weight: bold; color: var(--primary);">${points} pts</p>
            <p style="font-size: 14px; color: var(--text-secondary);">per ${escapeHtml(productData.serving_size || 'serving')}</p>
            ${productData.points_per_100g ? `
                <p style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">
                    (${productData.points_per_100g} pts per 100g)
                </p>
            ` : ''}
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 10px;">
                UPC ${upc} saved to local database<br>
                ✓ Verified and ready for quick scans
            </p>
            <button class="btn" style="margin-top: 20px;" onclick="closeScan()">
                Done
            </button>
        </div>
    `;
    
    await updateAllUI();
}

async function saveManualUPC(upc) {
    const productName = document.getElementById('manualProductName').value.trim();
    const brand = document.getElementById('manualBrand').value.trim();
    const points = parseInt(document.getElementById('manualPoints').value);
    
    if (!productName) {
        alert('Please enter a product name');
        return;
    }
    
    if (points < 0) {
        alert('Points must be 0 or greater');
        return;
    }
    
    const productData = {
        upc: upc,
        product_name: productName,
        brand: brand,
        points: points,
        points_per_serving: points,
        points_per_100g: points,
        nutrition: null,
        serving_size: '1 serving',
        serving_amount: null,
        verified: true,
        source: 'manual',
        image_url: ''
    };
    
    await saveUPCProduct(productData);
    console.log(`✅ Saved manual UPC ${upc} to local cache`);
    
    await logFood(productName, points, null);
    
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px; text-align: center;">
            <h3 style="color: var(--success);">✅ Saved & Logged!</h3>
            <p>${escapeHtml(productName)}</p>
            <p style="font-size: 32px; font-weight: bold; color: var(--primary);">${points} pts</p>
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 10px;">
                UPC ${upc} saved to local database<br>
                Next time you scan this, it will use ${points} points
            </p>
            <button class="btn" style="margin-top: 20px;" onclick="closeScan()">
                Done
            </button>
        </div>
    `;
    
    await updateAllUI();
}

function showUPCList() {
    const modal = document.createElement('div');
    modal.id = 'upcListModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10000';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px; max-height: 80vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>📦 Cached UPC Products</h2>
                <button class="close-btn" onclick="closeUPCList()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 15px;">
                    <input type="text" id="upcSearchInput" placeholder="Search products..." 
                           onkeyup="filterUPCList()"
                           style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
                </div>
                <div id="upcListContent" style="min-height: 200px;">
                    <div class="spinner"></div>
                    <p style="text-align: center;">Loading products...</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="closeUPCList()">Close</button>
                <button class="btn" onclick="exportUPCDatabase()">📦 Export</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    loadUPCList();
}

async function loadUPCList() {
    const content = document.getElementById('upcListContent');
    
    try {
        const products = await getAllUPCProducts();
        
        if (products.length === 0) {
            content.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <p>No cached products yet.</p>
                    <p style="font-size: 14px; margin-top: 10px;">Scan some barcodes to build your database!</p>
                </div>
            `;
            return;
        }
        
        products.sort((a, b) => {
            const dateA = new Date(a.last_updated || a.date_added);
            const dateB = new Date(b.last_updated || b.date_added);
            return dateB - dateA;
        });
        
        content.innerHTML = products.map(p => `
            <div class="upc-item" data-name="${escapeHtml(p.product_name.toLowerCase())}" data-brand="${escapeHtml((p.brand || '').toLowerCase())}" data-upc="${p.upc}">
                <div style="display: flex; justify-content: space-between; align-items: start; padding: 12px; margin-bottom: 10px; background: var(--bg-light); border-radius: 8px; border-left: 3px solid ${p.verified ? 'var(--success)' : 'var(--warning)'};">
                    <div style="flex: 1;">
                        <div style="font-weight: bold;">${escapeHtml(p.product_name)}</div>
                        ${p.brand ? `<div style="font-size: 12px; color: var(--text-secondary);">${escapeHtml(p.brand)}</div>` : ''}
                        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 5px;">
                            UPC: ${p.upc} | ${p.source || 'unknown'}
                        </div>
                    </div>
                    <div style="text-align: right; margin-left: 15px;">
                        <div style="font-size: 20px; font-weight: bold; color: var(--primary);">${p.points_per_serving || p.points} pts</div>
                        <div style="font-size: 10px; color: var(--text-secondary);">${p.verified ? '✓ verified' : '⚠️ unverified'}</div>
                        <button class="btn btn-sm" style="margin-top: 5px; font-size: 11px; padding: 4px 8px;" onclick="deleteUPCFromList('${p.upc}')">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading UPC list:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--danger);">
                <p>⚠️ Error loading products</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
            </div>
        `;
    }
}

function filterUPCList() {
    const input = document.getElementById('upcSearchInput');
    const filter = input.value.toLowerCase();
    const items = document.querySelectorAll('.upc-item');
    
    items.forEach(item => {
        const name = item.dataset.name;
        const brand = item.dataset.brand;
        const upc = item.dataset.upc;
        
        if (name.includes(filter) || brand.includes(filter) || upc.includes(filter)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

async function deleteUPCFromList(upc) {
    if (!confirm(`Delete UPC ${upc} from cache?`)) {
        return;
    }
    
    try {
        await deleteUPCProduct(upc);
        await loadUPCList();
    } catch (error) {
        alert('Error deleting product: ' + error.message);
    }
}

function closeUPCList() {
    const modal = document.getElementById('upcListModal');
    if (modal) {
        modal.remove();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function showUPCStatistics() {
    const stats = await getUPCStatistics();
    
    if (!stats) {
        alert('Error loading statistics');
        return;
    }
    
    const modal = document.createElement('div');
    modal.id = 'upcStatsModal';
    modal.className = 'modal active';
    modal.style.zIndex = '10000';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>📊 UPC Database Statistics</h2>
                <button class="close-btn" onclick="closeUPCStats()">&times;</button>
            </div>
            <div class="modal-body">
                <div style="padding: 20px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                        <div style="text-align: center; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--primary);">${stats.total}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Total Products</div>
                        </div>
                        <div style="text-align: center; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                            <div style="font-size: 32px; font-weight: bold; color: var(--success);">${stats.verified}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">Verified</div>
                        </div>
                    </div>
                    
                    <h3 style="margin-top: 20px; margin-bottom: 10px;">Data Sources</h3>
                    <div style="background: var(--bg-light); padding: 15px; border-radius: 8px;">
                        ${Object.entries(stats.sources).map(([source, count]) => `
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span>${source}</span>
                                <span style="font-weight: bold;">${count}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    ${stats.mostCommonBrands.length > 0 ? `
                        <h3 style="margin-top: 20px; margin-bottom: 10px;">Top Brands</h3>
                        <div style="background: var(--bg-light); padding: 15px; border-radius: 8px;">
                            ${stats.mostCommonBrands.map(({brand, count}) => `
                                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                    <span>${escapeHtml(brand)}</span>
                                    <span style="font-weight: bold;">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    
                    <div style="text-align: center; margin-top: 20px; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                        <div style="font-size: 14px; color: var(--text-secondary);">Average Points</div>
                        <div style="font-size: 24px; font-weight: bold; color: var(--primary);">${stats.averagePoints} pts</div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn" onclick="closeUPCStats()">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeUPCStats() {
    const modal = document.getElementById('upcStatsModal');
    if (modal) {
        modal.remove();
    }
}

if (typeof window !== 'undefined') {
    window.UPCUI = {
        showProduct: showUPCProduct,
        showManualEntry: showManualUPCEntry,
        confirmProduct: confirmUPCProduct,
        saveManual: saveManualUPC,
        showList: showUPCList,
        showStatistics: showUPCStatistics,
        highlightChange: highlightPointsChange
    };
}
