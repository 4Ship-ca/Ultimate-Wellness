// Main App Logic
let cameraStream = null;
let currentUser = 'default';

// Initialize App
async function initializeApp() {
    try {
        await initDB();
        console.log('✅ Database initialized');
        
        // Load user
        currentUser = localStorage.getItem('currentUser') || 'default';
        
        // Load common UPCs
        await loadCommonUPCs();
        
        // Load today's data
        await loadTodayData();
        
        console.log('✅ App initialized');
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showToast('Error initializing app', 'error');
    }
}

// Load common UPC products
async function loadCommonUPCs() {
    try {
        const response = await fetch('data/common-upcs.json');
        if (!response.ok) return;
        
        const data = await response.json();
        let loaded = 0;
        
        for (const product of data.products) {
            const existing = await getUPCProduct(product.upc);
            if (!existing) {
                await saveUPCProduct(product);
                loaded++;
            }
        }
        
        if (loaded > 0) {
            console.log(`✅ Loaded ${loaded} common products`);
        }
    } catch (error) {
        console.log('No common products to load');
    }
}

// Load Today's Data
async function loadTodayData() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const foods = await dbGetAll('foods', 'userId', currentUser);
        const todayFoods = foods.filter(f => f.date && f.date.startsWith(today));
        
        const totalPoints = todayFoods.reduce((sum, food) => sum + (food.points || 0), 0);
        
        document.getElementById('dailyPoints').textContent = totalPoints;
        
        // Display food log
        const foodLog = document.getElementById('foodLog');
        if (todayFoods.length === 0) {
            foodLog.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No foods logged yet today</p>';
        } else {
            foodLog.innerHTML = todayFoods.map(food => `
                <div style="display: flex; justify-content: space-between; padding: 10px; margin-bottom: 5px; background: var(--bg); border-radius: 8px;">
                    <span>${food.name}</span>
                    <span style="font-weight: bold;">${food.points} pts</span>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading today data:', error);
    }
}

// Show/Hide UI Components
function showFoodEntry() {
    document.getElementById('foodEntry').classList.remove('hide');
}

function closeFoodEntry() {
    document.getElementById('foodEntry').classList.add('hide');
}

function showScanner() {
    document.getElementById('scannerView').classList.remove('hide');
}

function closeScan() {
    stopCamera();
    document.getElementById('scannerView').classList.add('hide');
    document.getElementById('scanResult').innerHTML = '';
    document.getElementById('preview').classList.add('hide');
}

// Log Manual Food
async function logManualFood() {
    const name = document.getElementById('foodName').value.trim();
    const points = parseInt(document.getElementById('foodPoints').value) || 0;
    
    if (!name) {
        showToast('Please enter food name', 'warning');
        return;
    }
    
    await logFood({
        name: name,
        points: points,
        date: new Date().toISOString(),
        userId: currentUser
    });
    
    document.getElementById('foodName').value = '';
    document.getElementById('foodPoints').value = '0';
    closeFoodEntry();
    showToast('✓ Food logged!');
    await loadTodayData();
}

// Log Food
async function logFood(foodData) {
    foodData.userId = currentUser;
    foodData.date = foodData.date || new Date().toISOString();
    await dbPut('foods', foodData);
}

// Camera Functions
async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        const video = document.getElementById('cameraView');
        video.srcObject = cameraStream;
        document.getElementById('cameraContainer').classList.remove('hide');
    } catch (error) {
        console.error('Camera error:', error);
        showToast('Camera access denied', 'error');
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
        document.getElementById('cameraContainer').classList.add('hide');
    }
}

function capturePhoto() {
    const video = document.getElementById('cameraView');
    const canvas = document.getElementById('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const imageDataUrl = canvas.toDataURL('image/jpeg');
    document.getElementById('preview').src = imageDataUrl;
    document.getElementById('preview').classList.remove('hide');
    
    stopCamera();
    analyzeImage(imageDataUrl);
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview').src = e.target.result;
        document.getElementById('preview').classList.remove('hide');
        analyzeImage(e.target.result);
    };
    reader.readAsDataURL(file);
}

// Analyze Image with Claude Vision
async function analyzeImage(imageDataUrl) {
    const useCase = document.getElementById('useCaseSelect').value;
    const resultDiv = document.getElementById('scanResult');
    
    if (useCase === 'barcode') {
        resultDiv.innerHTML = '<div class="spinner"></div><p>Reading barcode...</p>';
        
        try {
            // Extract UPC from image
            const upc = await extractUPCFromImage(imageDataUrl);
            
            if (!upc) {
                resultDiv.innerHTML = '<p style="color: var(--danger);">⚠️ No barcode detected. Please try again with better lighting.</p>';
                return;
            }
            
            resultDiv.innerHTML = `
                <div class="spinner"></div>
                <p>Looking up UPC: ${upc}</p>
                <p style="font-size: 12px; color: var(--text-secondary);">Searching all databases...</p>
            `;
            
            // Run full cascade lookup
            const cascadeResults = await lookupUPCWithFullCascade(upc, imageDataUrl);
            
            if (cascadeResults.product) {
                // Save to cache if not already there
                const cached = await getUPCProduct(upc);
                if (!cached) {
                    await saveUPCProduct(cascadeResults.product);
                }
                
                // Show product
                await showUPCProduct(cascadeResults.product, upc);
                
                // Add source info
                const sourceInfo = document.createElement('div');
                sourceInfo.style.cssText = 'margin-top: 10px; padding: 10px; background: var(--bg-light); border-radius: 8px; font-size: 11px; color: var(--text-secondary);';
                sourceInfo.innerHTML = `📡 Source: ${cascadeResults.finalSource} (${cascadeResults.attempts.length} attempts)`;
                resultDiv.appendChild(sourceInfo);
            } else {
                // All methods failed
                showManualUPCEntry(upc, cascadeResults.attempts);
            }
            
        } catch (error) {
            console.error('Analysis error:', error);
            resultDiv.innerHTML = `
                <div style="color: var(--danger); padding: 20px; text-align: center;">
                    <p>⚠️ Error analyzing image</p>
                    <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                    <button class="btn" style="margin-top: 15px;" onclick="showManualUPCEntry('UNKNOWN')">
                        Enter Manually
                    </button>
                </div>
            `;
        }
    }
}

// Extract UPC and Nutrition from image using Claude Vision
async function extractUPCFromImage(imageDataUrl) {
    // This is a placeholder - integrate with your Claude Vision API
    
    try {
        // PRODUCTION: Uncomment and configure this section
        /*
        const base64Data = imageDataUrl.split(',')[1];
        const response = await fetch('YOUR_API_ENDPOINT/vision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: base64Data,
                prompt: window.NUTRITION_LABEL_PROMPT // Uses comprehensive extraction
            })
        });
        
        const data = await response.json();
        const extracted = JSON.parse(data.result);
        
        return {
            upc: extracted.upc || null,
            nutritionData: extracted
        };
        */
        
        // DEMO MODE: Prompt user for UPC
        // Replace this with actual API call above
        const testUPC = prompt(
            'DEMO MODE: Enter UPC to test lookup\n\n' +
            'Try these:\n' +
            '• 057000010874 (Heinz Beans)\n' +
            '• 012000001314 (Coca-Cola)\n' +
            '• 028400047968 (Lay\'s Chips)\n\n' +
            'Or enter any UPC:',
            '057000010874'
        );
        
        return testUPC;
        
    } catch (error) {
        console.error('UPC extraction error:', error);
        return null;
    }
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    
    if (type === 'error') {
        toast.style.background = 'var(--danger)';
    } else if (type === 'warning') {
        toast.style.background = 'var(--warning)';
    }
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Theme toggle (bonus feature)
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// Load theme preference
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
