// ============ RECIPE PDF EXPORT & WEB SCRAPER ============

// ============ PDF EXPORT ============

/**
 * Export recipe to formatted PDF
 * @param {Number} recipeId - Recipe to export
 * @returns {Blob} PDF blob
 */
async function exportRecipeToPDF(recipeId) {
    const recipe = await dbGet('recipes', recipeId);
    if (!recipe) throw new Error('Recipe not found');
    
    // Generate PDF-friendly HTML
    const html = generateRecipePDFHTML(recipe);
    
    // Use browser print to PDF (modern approach)
    // Or use jsPDF library if available
    
    if (typeof jsPDF !== 'undefined') {
        return generatePDFWithLibrary(recipe);
    } else {
        return generatePDFViaPrint(html);
    }
}

/**
 * Generate recipe HTML for PDF
 */
function generateRecipePDFHTML(recipe) {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${recipe.name}</title>
        <style>
            @page {
                size: letter;
                margin: 0.5in;
            }
            
            body {
                font-family: 'Georgia', serif;
                line-height: 1.6;
                color: #333;
                max-width: 7.5in;
                margin: 0 auto;
            }
            
            .header {
                border-bottom: 3px solid #4CAF50;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            
            h1 {
                font-size: 32px;
                color: #4CAF50;
                margin: 0 0 10px 0;
            }
            
            .recipe-meta {
                display: flex;
                gap: 20px;
                font-size: 14px;
                color: #666;
            }
            
            .meta-item {
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .photo {
                width: 100%;
                height: 300px;
                object-fit: cover;
                border-radius: 8px;
                margin-bottom: 30px;
            }
            
            .section {
                margin-bottom: 30px;
            }
            
            h2 {
                font-size: 20px;
                color: #4CAF50;
                border-bottom: 1px solid #ddd;
                padding-bottom: 5px;
                margin-bottom: 15px;
            }
            
            .ingredients {
                list-style: none;
                padding: 0;
            }
            
            .ingredients li {
                padding: 8px 0;
                border-bottom: 1px dotted #ddd;
            }
            
            .ingredients li:last-child {
                border-bottom: none;
            }
            
            .ingredient-qty {
                font-weight: bold;
                color: #4CAF50;
                min-width: 80px;
                display: inline-block;
            }
            
            .zero-point {
                color: #4CAF50;
                font-size: 12px;
                margin-left: 5px;
            }
            
            .instructions {
                counter-reset: step-counter;
                list-style: none;
                padding: 0;
            }
            
            .instructions li {
                counter-increment: step-counter;
                padding: 15px 0 15px 50px;
                position: relative;
                border-left: 2px solid #4CAF50;
                margin-left: 20px;
            }
            
            .instructions li:before {
                content: counter(step-counter);
                position: absolute;
                left: -20px;
                top: 15px;
                background: #4CAF50;
                color: white;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            }
            
            .nutrition-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 15px;
                margin-top: 20px;
            }
            
            .nutrition-item {
                text-align: center;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 8px;
            }
            
            .nutrition-value {
                font-size: 24px;
                font-weight: bold;
                color: #4CAF50;
            }
            
            .nutrition-label {
                font-size: 12px;
                color: #666;
                text-transform: uppercase;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #ddd;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
            
            .rating {
                color: #FFD700;
                font-size: 18px;
            }
            
            @media print {
                .no-print { display: none; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${recipe.name}</h1>
            <div class="recipe-meta">
                <div class="meta-item">
                    ⏱️ <strong>${recipe.prepTime + recipe.cookTime} min</strong> total
                </div>
                <div class="meta-item">
                    🍽️ <strong>${recipe.servings}</strong> servings
                </div>
                <div class="meta-item">
                    📊 <strong>${recipe.pointsPerServing}</strong> pts/serving
                </div>
                ${recipe.userRating ? `
                <div class="meta-item rating">
                    ${'⭐'.repeat(recipe.userRating)}
                </div>
                ` : ''}
            </div>
        </div>
        
        ${recipe.photoUrl ? `
        <img src="${recipe.photoUrl}" alt="${recipe.name}" class="photo">
        ` : ''}
        
        <div class="section">
            <h2>📋 Ingredients</h2>
            <ul class="ingredients">
                ${recipe.ingredients.map(ing => `
                    <li>
                        <span class="ingredient-qty">${ing.quantity} ${ing.unit}</span>
                        ${ing.name}
                        ${ing.isZeroPoint ? '<span class="zero-point">✨ Zero-Point</span>' : `<span style="color: #666;">(${ing.points} pts)</span>`}
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="section">
            <h2>👨‍🍳 Instructions</h2>
            <ol class="instructions">
                ${recipe.instructions.map(step => `
                    <li>${step}</li>
                `).join('')}
            </ol>
        </div>
        
        <div class="section">
            <h2>📊 Nutrition Per Serving</h2>
            <div class="nutrition-grid">
                <div class="nutrition-item">
                    <div class="nutrition-value">${recipe.pointsPerServing}</div>
                    <div class="nutrition-label">Points</div>
                </div>
                <div class="nutrition-item">
                    <div class="nutrition-value">${recipe.calories || '—'}</div>
                    <div class="nutrition-label">Calories</div>
                </div>
                <div class="nutrition-item">
                    <div class="nutrition-value">${recipe.prepTime} + ${recipe.cookTime}</div>
                    <div class="nutrition-label">Prep + Cook</div>
                </div>
            </div>
        </div>
        
        ${recipe.modifications ? `
        <div class="section">
            <h2>💡 Notes</h2>
            <p>${recipe.modifications}</p>
        </div>
        ` : ''}
        
        ${recipe.tags && recipe.tags.length > 0 ? `
        <div class="section">
            <h2>🏷️ Tags</h2>
            <p>${recipe.tags.join(' • ')}</p>
        </div>
        ` : ''}
        
        <div class="footer">
            <p><strong>Ultimate Wellness</strong> • Recipe printed on ${new Date().toLocaleDateString()}</p>
            ${recipe.url ? `<p>Original recipe: ${recipe.url}</p>` : ''}
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
            <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">
                🖨️ Print Recipe
            </button>
        </div>
    </body>
    </html>
    `;
}

/**
 * Generate PDF via browser print
 */
function generatePDFViaPrint(html) {
    // Open in new window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Trigger print dialog
    printWindow.onload = () => {
        printWindow.print();
    };
}

/**
 * Download recipe as PDF file
 */
async function downloadRecipePDF(recipeId) {
    const recipe = await dbGet('recipes', recipeId);
    if (!recipe) throw new Error('Recipe not found');
    
    const html = generateRecipePDFHTML(recipe);
    
    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recipe.name.replace(/[^a-z0-9]/gi, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log(`📥 Downloaded recipe: ${recipe.name}`);
}

// ============ WEB RECIPE SCRAPER ============

/**
 * Scrape recipe from URL
 * @param {String} url - Recipe URL
 * @returns {Object} Scraped recipe data
 */
async function scrapeRecipe(url) {
    // Validate URL (only trusted sources)
    const trustedDomains = [
        'weightwatchers.com',
        'ww.com',
        'myfitnesspal.com',
        'eatingwell.com',
        'cooking.nytimes.com',
        'bonappetit.com',
        'seriouseats.com',
        'allrecipes.com'
    ];
    
    const urlObj = new URL(url);
    const isTrusted = trustedDomains.some(domain => 
        urlObj.hostname.includes(domain)
    );
    
    if (!isTrusted) {
        throw new Error('Source not trusted. Only scraping from verified recipe sites to avoid spam/influencer sites.');
    }
    
    try {
        // Use web_fetch tool to get page
        const response = await fetch(url);
        const html = await response.text();
        
        // Parse recipe (look for schema.org/Recipe structured data)
        const recipe = parseRecipeFromHTML(html, url);
        
        return recipe;
        
    } catch (error) {
        console.error('Scrape error:', error);
        throw new Error('Failed to scrape recipe. Please try a different URL.');
    }
}

/**
 * Parse recipe from HTML
 */
function parseRecipeFromHTML(html, url) {
    // Create temporary DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Look for JSON-LD structured data (schema.org/Recipe)
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    
    for (const script of scripts) {
        try {
            const data = JSON.parse(script.textContent);
            
            // Check if it's a recipe
            if (data['@type'] === 'Recipe' || (Array.isArray(data['@graph']) && data['@graph'].some(item => item['@type'] === 'Recipe'))) {
                const recipeData = data['@type'] === 'Recipe' ? data : data['@graph'].find(item => item['@type'] === 'Recipe');
                
                return {
                    name: recipeData.name,
                    description: recipeData.description,
                    
                    // Timing
                    prepTime: parseISO8601Duration(recipeData.prepTime) || 0,
                    cookTime: parseISO8601Duration(recipeData.cookTime) || 0,
                    totalTime: parseISO8601Duration(recipeData.totalTime) || 0,
                    
                    // Servings
                    servings: parseInt(recipeData.recipeYield) || 4,
                    
                    // Ingredients
                    ingredients: (recipeData.recipeIngredient || []).map(ing => ({
                        name: ing,
                        quantity: 1,
                        unit: 'serving',
                        points: 0, // User will need to calculate
                        isZeroPoint: false
                    })),
                    
                    // Instructions
                    instructions: parseInstructions(recipeData.recipeInstructions),
                    
                    // Nutrition (if available)
                    calories: recipeData.nutrition?.calories ? parseInt(recipeData.nutrition.calories) : null,
                    
                    // Metadata
                    source: 'web_scraped',
                    url: url,
                    scrapedFrom: new URL(url).hostname,
                    scrapedDate: new Date().toISOString(),
                    
                    // Image
                    photoUrl: recipeData.image?.url || recipeData.image || null,
                    
                    // Initial values
                    totalPoints: 0, // User calculates
                    pointsPerServing: 0,
                    userRating: null,
                    timesMade: 0
                };
            }
        } catch (e) {
            console.warn('Failed to parse JSON-LD:', e);
        }
    }
    
    // Fallback: try to parse manually (less reliable)
    return parseRecipeManually(doc, url);
}

/**
 * Parse ISO 8601 duration (PT15M = 15 minutes)
 */
function parseISO8601Duration(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    
    return hours * 60 + minutes;
}

/**
 * Parse instructions from various formats
 */
function parseInstructions(instructions) {
    if (!instructions) return [];
    
    // Array of strings
    if (Array.isArray(instructions) && typeof instructions[0] === 'string') {
        return instructions;
    }
    
    // Array of HowToStep objects
    if (Array.isArray(instructions) && instructions[0]?.['@type'] === 'HowToStep') {
        return instructions.map(step => step.text);
    }
    
    // Single string with newlines
    if (typeof instructions === 'string') {
        return instructions.split('\n').filter(s => s.trim());
    }
    
    return [];
}

/**
 * Manual parsing fallback (less reliable)
 */
function parseRecipeManually(doc, url) {
    // This is domain-specific and less reliable
    // Better to require structured data
    
    return {
        name: doc.querySelector('h1')?.textContent || 'Imported Recipe',
        description: '',
        ingredients: [],
        instructions: [],
        prepTime: 0,
        cookTime: 0,
        servings: 4,
        source: 'web_scraped',
        url: url,
        scrapedFrom: new URL(url).hostname,
        scrapedDate: new Date().toISOString()
    };
}

/**
 * Search Weight Watchers recipes
 */
async function searchWWRecipes(query, options = {}) {
    // This would require WW API access or web scraping
    // Placeholder for now
    
    console.log('🔍 Searching WW recipes for:', query);
    
    // Would return array of recipe URLs
    return [];
}

/**
 * Import recipe from URL
 */
async function importRecipeFromURL(url) {
    try {
        const recipe = await scrapeRecipe(url);
        
        // Save to database
        recipe.id = Date.now();
        recipe.createdDate = new Date().toISOString();
        recipe.createdBy = 'user';
        
        await dbPut('recipes', recipe);
        
        console.log('✅ Imported recipe:', recipe.name);
        
        return recipe;
        
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
}

// ============ RECIPE URL INPUT UI ============

/**
 * Show import recipe dialog
 */
function showImportRecipeDialog() {
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    dialog.innerHTML = `
        <div style="background: var(--bg-light); padding: 30px; border-radius: 8px; max-width: 500px; width: 90%;">
            <h2 style="margin-bottom: 15px;">Import Recipe from Web</h2>
            <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 20px;">
                Paste a recipe URL from Weight Watchers or other trusted recipe sites.
            </p>
            
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px;">Recipe URL</label>
                <input type="url" id="importRecipeURL" placeholder="https://www.weightwatchers.com/..." style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text);">
            </div>
            
            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 20px;">
                ✅ Trusted sources: Weight Watchers, AllRecipes, Eating Well, Serious Eats, NYT Cooking
            </div>
            
            <div style="display: flex; gap: 10px;">
                <button onclick="confirmImportRecipe()" style="flex: 1; padding: 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📥 Import Recipe
                </button>
                <button onclick="this.closest('[style*=fixed]').remove()" style="flex: 1; padding: 12px; background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
            </div>
            
            <div id="importStatus" style="margin-top: 15px; display: none;"></div>
        </div>
    `;
    
    document.body.appendChild(dialog);
}

/**
 * Confirm recipe import
 */
async function confirmImportRecipe() {
    const url = document.getElementById('importRecipeURL').value.trim();
    const status = document.getElementById('importStatus');
    
    if (!url) {
        status.style.display = 'block';
        status.style.color = 'var(--danger)';
        status.textContent = '⚠️ Please enter a URL';
        return;
    }
    
    status.style.display = 'block';
    status.style.color = 'var(--info)';
    status.textContent = '⏳ Importing recipe...';
    
    try {
        const recipe = await importRecipeFromURL(url);
        
        status.style.color = 'var(--primary)';
        status.textContent = `✅ Imported: ${recipe.name}`;
        
        // Close dialog after 2s
        setTimeout(() => {
            document.querySelector('[style*=fixed]').remove();
            // Reload recipes tab
            if (typeof loadRecipes === 'function') loadRecipes();
        }, 2000);
        
    } catch (error) {
        status.style.color = 'var(--danger)';
        status.textContent = `❌ ${error.message}`;
    }
}

// ============ EXPORT ============
window.RecipePDF = {
    exportRecipeToPDF,
    downloadRecipePDF,
    generateRecipePDFHTML
};

window.RecipeScraper = {
    scrapeRecipe,
    importRecipeFromURL,
    searchWWRecipes,
    showImportRecipeDialog
};

console.log('📄 Recipe PDF Export & Web Scraper loaded');
