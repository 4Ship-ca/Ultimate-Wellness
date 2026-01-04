// ============ MAIN APPLICATION LOGIC ============
// Ultimate Wellness System v1.0

// ============ SECURE API CONFIGURATION ============
// Cloudflare Worker proxy - API key is now 100% hidden and secure!
const USE_PROXY = true; // ✅ PROXY ENABLED
const PROXY_URL = 'https://ultimate-wellness.your4ship.workers.dev'; // ✅ YOUR WORKER URL
const CLAUDE_API_KEY = ''; // ✅ EMPTY - Key stored securely in Cloudflare!

// Your API key is now stored as an encrypted environment variable in Cloudflare Workers
// Nobody can see it in your code, git history, or browser - completely secure! 🔒

// ============ CONSTANTS ============
const EXERCISES = ['Walk', 'Run', 'Bike', 'Swim', 'Yoga', 'Weights', 'Sports', 'Dance'];
const EXERCISE_POINTS_PER_15MIN = 1;

// High-water foods database
const HYDRATING_FOODS = {
    // Beverages
    'milk': 250, 'coffee': 250, 'tea': 250, 'juice': 250,
    'smoothie': 300, 'shake': 300, 'latte': 250,
    
    // Soups & Broths
    'soup': 200, 'broth': 250, 'stew': 150, 'chili': 100,
    
    // Fruits
    'watermelon': 200, 'melon': 200, 'cantaloupe': 200,
    'strawberries': 150, 'strawberry': 150,
    'orange': 125, 'oranges': 125, 'grapefruit': 150,
    'peach': 125, 'peaches': 125, 'pineapple': 125,
    'apple': 100, 'apples': 100, 'grapes': 150,
    
    // Vegetables
    'cucumber': 150, 'lettuce': 125, 'salad': 100,
    'celery': 150, 'tomato': 125, 'tomatoes': 125,
    'zucchini': 125, 'spinach': 100,
    
    // Yogurt & Dairy
    'yogurt': 150, 'cottage cheese': 125,
    
    // Other
    'popsicle': 100, 'jello': 100, 'ice cream': 75
};

// ============ STATE ============
let stream = null;
let currentScanType = null;
let processingInterval = null;
let userSettings = null;
let cameraStream = null;
let cameraMode = 'photo';
let mediaRecorder = null;
let recordedChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let napTimerMinutes = 0;
let napTimerSeconds = 0;
let napTimerInterval = null;
let napTimerRunning = false;
let napAlarmAudio = null;

// ============ INITIALIZATION ============
async function init() {
    try {
        // Check IndexedDB support
        if (!window.indexedDB) {
            alert('⚠️ Your browser does not support offline storage (IndexedDB).\n\nPlease use a modern browser like Chrome, Firefox, or Edge.');
            return;
        }
        
        console.log('🚀 Starting Ultimate Wellness initialization...');
        
        // Check if we need to refresh (past 4am)
        checkDailyReset();
        
        // Initialize database with timeout
        console.log('📦 Initializing database...');
        const dbPromise = initDatabase();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
        );
        
        try {
            await Promise.race([dbPromise, timeoutPromise]);
            console.log('✅ Database ready');
        } catch (dbErr) {
            console.error('❌ Database initialization failed:', dbErr);
            alert('Database initialization failed.\n\n' + 
                  'Error: ' + dbErr.message + '\n\n' +
                  'Please try:\n' +
                  '1. Refresh the page\n' +
                  '2. Clear browser cache\n' +
                  '3. Use Chrome/Firefox/Edge\n' +
                  '4. Check if storage is enabled');
            throw dbErr;
        }
        
        // Perform daily maintenance
        await performDailyMaintenance();
        
        // Load user settings
        userSettings = await getSettings();
        
        if (!userSettings) {
            // Show setup screen
            document.getElementById('setupScreen').classList.add('active');
            console.log('👋 New user - showing setup screen');
        } else {
            // Hide setup screen
            document.getElementById('setupScreen').classList.remove('active');
            
            // Check if points recalculation is needed (every 4 weeks)
            await checkPointsRecalculation();
            
            // Load UI
            await updateAllUI();
            
            console.log('👤 Existing user loaded:', userSettings.name);
        }
        
        setupExerciseGrid();
        
        // Set up automatic daily reset check (every 5 minutes)
        setInterval(checkDailyReset, 5 * 60 * 1000);
        
        console.log('✅ Initialization complete!');
        
    } catch (err) {
        console.error('💥 Initialization error:', err);
        document.body.innerHTML = `
            <div style="padding: 40px; text-align: center; font-family: system-ui;">
                <h1 style="color: #ff6b6b;">⚠️ Initialization Failed</h1>
                <p style="font-size: 18px; margin: 20px 0;">The app failed to start.</p>
                <p style="color: #666;">${err.message}</p>
                <button onclick="location.reload()" style="
                    margin-top: 30px;
                    padding: 15px 30px;
                    font-size: 16px;
                    background: #ff6b6b;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                ">🔄 Refresh Page</button>
                <div style="margin-top: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px; text-align: left;">
                    <h3>Troubleshooting:</h3>
                    <ol style="line-height: 2;">
                        <li>Clear your browser cache</li>
                        <li>Use Chrome, Firefox, or Edge</li>
                        <li>Check if cookies/storage are enabled</li>
                        <li>Try incognito/private mode</li>
                        <li>Disable browser extensions</li>
                    </ol>
                </div>
            </div>
        `;
    }
}

// ============ SETUP & SETTINGS ============
async function completeSetup() {
    const setupButton = document.getElementById('setupButton');
    const originalText = setupButton.innerHTML;
    
    try {
        // Show loading state
        setupButton.disabled = true;
        setupButton.innerHTML = 'Setting up... ⏳';
        
        console.log('🔧 Starting setup...');
        console.log('📊 Database status:', db ? 'Ready' : 'Not ready');
        
        // Wait for database to be ready (max 5 seconds)
        let attempts = 0;
        while (!db && attempts < 50) {
            console.log(`⏳ Waiting for database... attempt ${attempts + 1}/50`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!db) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            
            console.error('❌ Database never initialized after 5 seconds');
            
            alert('❌ Database failed to initialize.\n\n' +
                  'The app cannot start without storage.\n\n' +
                  'Please:\n' +
                  '1. Refresh the page (Ctrl+Shift+R)\n' +
                  '2. Check console (F12) for errors\n' +
                  '3. Try a different browser\n' +
                  '4. Clear site data and try again');
            return;
        }
        
        console.log('✅ Database ready, proceeding with setup');
        
        const name = document.getElementById('setupName').value.trim();
        const email = document.getElementById('setupEmail').value.trim();
        const birthday = document.getElementById('setupBirthday').value;
        const gender = document.getElementById('setupGender').value;
        const weight = parseFloat(document.getElementById('setupWeight').value);
        const goalWeight = parseFloat(document.getElementById('setupGoalWeight').value);
        const heightFeet = parseInt(document.getElementById('setupHeightFeet').value);
        const heightInches = parseInt(document.getElementById('setupHeightInches').value);
        const activity = document.getElementById('setupActivity').value;

        if (!name || !email || !birthday || !weight || !goalWeight || !heightFeet) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('Please fill in all fields');
            return;
        }

        // Validate email
        if (!email.includes('@') || !email.includes('.')) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('Please enter a valid email address');
            return;
        }

        const heightInInches = (heightFeet * 12) + heightInches;
        const age = calculateAge(birthday);
        
        // Calculate initial daily points
        const dailyPoints = calculateDailyPoints(gender, age, weight, heightInInches, activity);

        userSettings = {
            id: 'user', // REQUIRED for IndexedDB
            name,
            email,
            birthday,
            gender,
            currentWeight: weight,
            goalWeight,
            heightInInches,
            activity,
            dailyPoints,
            lastPointsUpdate: new Date().toISOString().split('T')[0],
            lastWeighIn: new Date().toISOString().split('T')[0],
            joinDate: new Date().toISOString().split('T')[0]
        };

        console.log('💾 Saving settings...', userSettings);
        await dbPut('settings', userSettings);
    
        // Log initial weight
        await addWeightLog({
            date: new Date().toISOString().split('T')[0],
            weight: weight,
            notes: 'Starting weight'
        });

        document.getElementById('setupScreen').classList.remove('active');
        await updateAllUI();
        
        // Send welcome email
        sendWelcomeEmail();
        
    } catch (err) {
        console.error('Setup error:', err);
        
        // Reset button
        const setupButton = document.getElementById('setupButton');
        if (setupButton) {
            setupButton.disabled = false;
            setupButton.innerHTML = 'Start My Journey! 🔥';
        }
        
        alert('Error saving settings: ' + err.message + '\n\nPlease refresh the page and try again.');
    }
}

function calculateAge(birthday) {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function calculateDailyPoints(gender, age, weight, heightInInches, activity) {
    // Weight Watchers-style points calculation
    // Base points: Gender + Age + Weight + Height + Activity
    
    let points = 0;
    
    // Gender base
    points += gender === 'female' ? 2 : 8;
    
    // Age
    if (age >= 18 && age <= 20) points += 5;
    else if (age >= 21 && age <= 35) points += 4;
    else if (age >= 36 && age <= 50) points += 3;
    else if (age >= 51 && age <= 65) points += 2;
    else points += 1;
    
    // Weight (simplified: 1 point per 10 lbs over 100 lbs)
    points += Math.floor((weight - 100) / 10);
    
    // Height bonus
    if (heightInInches < 61) points += 1;
    else points += 2;
    
    // Activity level
    const activityPoints = {
        'sedentary': 0,
        'light': 1,
        'moderate': 2,
        'active': 4,
        'very_active': 6
    };
    points += activityPoints[activity] || 0;
    
    // Enforce guardrails: 22-28 points per day
    points = Math.max(22, Math.min(28, points));
    
    return points;
}

async function checkPointsRecalculation() {
    if (!userSettings) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastUpdate = new Date(userSettings.lastPointsUpdate);
    const daysSinceUpdate = Math.floor((new Date(today) - lastUpdate) / (1000 * 60 * 60 * 24));
    
    // Recalculate every 28 days (4 weeks)
    if (daysSinceUpdate >= 28) {
        const age = calculateAge(userSettings.birthday);
        const newPoints = calculateDailyPoints(
            userSettings.gender,
            age,
            userSettings.currentWeight,
            userSettings.heightInInches,
            userSettings.activity
        );
        
        userSettings.dailyPoints = newPoints;
        userSettings.lastPointsUpdate = today;
        await dbPut('settings', userSettings);
        
        console.log(`📊 Points recalculated: ${newPoints} (every 4 weeks)`);
    }
}

async function saveSettings() {
    const name = document.getElementById('settingsName').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const goalWeight = parseFloat(document.getElementById('settingsGoalWeight').value);
    const heightFeet = parseInt(document.getElementById('settingsHeightFeet').value);
    const heightInches = parseInt(document.getElementById('settingsHeightInches').value);
    const activity = document.getElementById('settingsActivity').value;

    if (!name || !email || !goalWeight || !heightFeet) {
        alert('Please fill in all fields');
        return;
    }

    // Validate email
    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email address');
        return;
    }

    const heightInInches = (heightFeet * 12) + heightInches;
    
    userSettings.name = name;
    userSettings.email = email;
    userSettings.goalWeight = goalWeight;
    userSettings.heightInInches = heightInInches;
    userSettings.activity = activity;
    
    // Recalculate points with new settings
    const age = calculateAge(userSettings.birthday);
    userSettings.dailyPoints = calculateDailyPoints(
        userSettings.gender,
        age,
        userSettings.currentWeight,
        heightInInches,
        activity
    );

    await dbPut('settings', userSettings);
    await updateAllUI();
    alert('Settings saved!');
}

async function updateWeight() {
    const weight = parseFloat(document.getElementById('settingsWeight').value);
    
    if (!weight || weight <= 0) {
        alert('Please enter a valid weight');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already weighed in today
    const todayLogs = await getAllWeightLogs();
    const existingToday = todayLogs.find(log => log.date === today);
    
    if (existingToday) {
        if (!confirm('You already logged weight today. Update?')) {
            return;
        }
    }

    // Log weight
    await addWeightLog({
        date: today,
        weight: weight,
        notes: ''
    });

    // Update current weight in settings
    userSettings.currentWeight = weight;
    userSettings.lastWeighIn = today;
    
    // Recalculate points based on new weight
    const age = calculateAge(userSettings.birthday);
    userSettings.dailyPoints = calculateDailyPoints(
        userSettings.gender,
        age,
        weight,
        userSettings.heightInInches,
        userSettings.activity
    );

    await dbPut('settings', userSettings);
    await updateAllUI();
    
    const weightChange = existingToday ? weight - existingToday.weight : 0;
    const weeklyGoal = calculateWeeklyGoal();
    
    let message = `Weight updated to ${weight} lbs! Daily points adjusted to ${userSettings.dailyPoints}.`;
    
    if (weightChange !== 0) {
        message += `\n\nChange: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`;
    }
    
    message += `\nWeekly goal: ${weeklyGoal.toFixed(1)} lbs/week`;
    message += `\nTo go: ${(weight - userSettings.goalWeight).toFixed(1)} lbs`;
    
    alert(message);
}

// Test API Connection
async function testAPIConnection() {
    const btn = document.getElementById('apiTestBtn');
    const result = document.getElementById('apiTestResult');
    
    btn.disabled = true;
    btn.textContent = '🔄 Testing...';
    result.innerHTML = '<div style="color: var(--text-secondary);">⏳ Sending test request...</div>';
    
    try {
        const testMessage = "Hello! Just testing the API connection.";
        
        const requestBody = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 50,
            messages: [
                { role: 'user', content: testMessage }
            ]
        };
        
        let response;
        const startTime = Date.now();
        
        if (USE_PROXY) {
            response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            if (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE') {
                throw new Error('API key not configured');
            }
            
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
        }
        
        const elapsed = Date.now() - startTime;
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const aiResponse = data.content[0].text;
        
        result.innerHTML = `
            <div style="color: var(--success); padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px; border-left: 3px solid var(--success);">
                <strong>✅ API Connection Successful!</strong><br>
                <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">
                    • Response time: ${elapsed}ms<br>
                    • Model: claude-sonnet-4-20250514<br>
                    • Proxy: ${USE_PROXY ? 'Enabled (Cloudflare Worker)' : 'Disabled (Direct API)'}<br>
                    • Test response: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('API Test Error:', error);
        
        let helpText = '';
        if (error.message.includes('CORS') || error.message.includes('blocked')) {
            helpText = 'Fix: Update Cloudflare Worker CORS settings to allow your GitHub Pages domain.';
        } else if (error.message.includes('API key')) {
            helpText = 'Fix: Add your Claude API key to the Cloudflare Worker environment variables.';
        } else if (error.message.includes('Failed to fetch')) {
            helpText = 'Fix: Check your internet connection and Cloudflare Worker URL.';
        }
        
        result.innerHTML = `
            <div style="color: var(--danger); padding: 10px; background: rgba(244, 67, 54, 0.1); border-radius: 8px; border-left: 3px solid var(--danger);">
                <strong>❌ API Connection Failed</strong><br>
                <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">
                    Error: ${error.message}<br>
                    ${helpText ? `<br><strong>${helpText}</strong>` : ''}
                </div>
            </div>
        `;
    } finally {
        btn.disabled = false;
        btn.textContent = '🧪 Test API Connection';
    }
}

function calculateWeeklyGoal() {
    if (!userSettings) return 0;
    
    const delta = userSettings.currentWeight - userSettings.goalWeight;
    // Always 12 weeks away from goal
    const weeklyGoal = Math.max(0, delta / 12);
    return Math.round(weeklyGoal * 10) / 10; // Round to 1 decimal
}

function calculateWeightProgress() {
    if (!userSettings) return 0;
    
    // Assuming starting weight from join date weight log
    // For now, use a simple calculation
    const totalToLose = userSettings.currentWeight - userSettings.goalWeight;
    const alreadyLost = 0; // This would be calculated from weight logs
    
    if (totalToLose <= 0) return 100;
    
    const progress = (alreadyLost / totalToLose) * 100;
    return Math.min(100, Math.max(0, progress));
}

function getNextWeighinDate() {
    // Weigh-in every Sunday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============ FOOD LOGGING ============
function getTodayKey() {
    // Get current date/time
    const now = new Date();
    
    // If before 4am, use yesterday's date
    // (day doesn't "change" until 4am)
    if (now.getHours() < 4) {
        now.setDate(now.getDate() - 1);
    }
    
    return now.toISOString().split('T')[0];
}

// Check if we need to refresh page (past 4am on new day)
function checkDailyReset() {
    const lastCheck = localStorage.getItem('lastDailyCheck');
    const currentDay = getTodayKey();
    
    if (lastCheck && lastCheck !== currentDay) {
        // New day has started (past 4am)!
        console.log('🔄 New day detected - refreshing...');
        
        // Update last check
        localStorage.setItem('lastDailyCheck', currentDay);
        
        // Show message and reload
        alert('Good morning! Starting a new day... 🌅');
        location.reload();
    } else if (!lastCheck) {
        // First time - set it
        localStorage.setItem('lastDailyCheck', currentDay);
    }
}

async function logFood(name, points, imageData = null) {
    const today = getTodayKey();
    
    const food = {
        date: today,
        name: name,
        points: points,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    await addFood(food);
    
    // Save photo if provided
    if (imageData) {
        await addPhoto({
            date: today,
            type: 'food',
            data: imageData,
            foodName: name
        });
    }

    await updateAllUI();
    
    // Check for hydrating foods
    checkAndPromptFoodWater(name);
}

function checkAndPromptFoodWater(foodName) {
    const nameLower = foodName.toLowerCase();
    let waterContent = 0;
    let matchedFood = '';
    
    for (const [food, ml] of Object.entries(HYDRATING_FOODS)) {
        if (nameLower.includes(food)) {
            if (ml > waterContent) {
                waterContent = ml;
                matchedFood = food;
            }
        }
    }
    
    if (waterContent > 0) {
        const message = `This ${matchedFood} contains about ${waterContent}ml of water!\n\nAdd to your daily water intake?`;
        
        if (confirm(message)) {
            addFoodWaterML(waterContent);
        }
    }
}

async function logFoodWithWater(name, points, waterMl, imageData = null) {
    const today = getTodayKey();
    
    const food = {
        date: today,
        name: name,
        points: points,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    await addFood(food);
    
    if (imageData) {
        await addPhoto({
            date: today,
            type: 'food',
            data: imageData,
            foodName: name
        });
    }

    if (waterMl > 0) {
        await addFoodWaterML(waterMl);
    }

    await updateAllUI();
}

function calculatePoints(calories, protein, sugar, saturatedFat) {
    // SmartPoints formula
    const points = (calories * 0.0305) + (saturatedFat * 0.275) + (sugar * 0.12) - (protein * 0.098);
    return Math.max(0, Math.round(points));
}

// ============ WATER TRACKING ============
async function fillWaterDrop(dropNum) {
    const today = getTodayKey();
    const currentWater = await getWaterByDate(today);
    
    let newDrops = currentWater.drops || 0;
    
    // Toggle: if clicking already filled, unfill
    if (newDrops >= dropNum) {
        newDrops = dropNum - 1;
    } else {
        newDrops = dropNum;
    }
    
    await updateWater(today, newDrops, currentWater.foodWater || 0);
    await updateWaterDisplay();
}

async function updateWaterDisplay() {
    const today = getTodayKey();
    const water = await getWaterByDate(today);
    const filled = water.drops || 0;
    const foodWaterMl = water.foodWater || 0;
    
    for (let i = 1; i <= 8; i++) {
        const drop = document.getElementById(`drop${i}`);
        if (drop) {
            if (i <= filled) {
                drop.classList.add('filled');
            } else {
                drop.classList.remove('filled');
            }
        }
    }

    const directMl = filled * 250;
    const totalMl = directMl + foodWaterMl;
    
    const totalDiv = document.getElementById('waterTotal');
    if (foodWaterMl > 0) {
        totalDiv.innerHTML = `
            <div style="font-weight: 600;">${totalMl}ml / 2000ml</div>
            <div style="font-size: 10px; opacity: 0.7;">
                Drinks: ${directMl}ml (${filled}/8) + Food: ${foodWaterMl}ml
            </div>
        `;
    } else {
        totalDiv.textContent = `${totalMl}ml / 2000ml (${filled}/8 cups)`;
    }
}

async function addFoodWaterML(ml) {
    const today = getTodayKey();
    await addFoodWaterToDate(today, ml);
    await updateWaterDisplay();
    
    // Visual feedback
    const waterTotal = document.getElementById('waterTotal');
    waterTotal.style.transform = 'scale(1.1)';
    waterTotal.style.color = 'var(--success)';
    setTimeout(() => {
        waterTotal.style.transform = 'scale(1)';
        waterTotal.style.color = '';
    }, 500);
}

function manualAddFoodWater() {
    const examples = [
        'Smoothie: 300ml',
        'Bowl of soup: 200ml', 
        'Coffee/Tea: 250ml',
        'Milk (1 cup): 250ml',
        'Watermelon: 200ml',
        'Orange: 125ml',
        'Salad: 100ml'
    ];
    
    const amount = prompt(
        'How much water did your food/drink contain?\n\n' +
        'Common amounts:\n' +
        examples.join('\n') +
        '\n\nEnter amount in ml (e.g., 250):'
    );
    
    if (amount) {
        const ml = parseInt(amount);
        if (ml > 0 && ml <= 1000) {
            addFoodWaterML(ml);
            alert(`Added ${ml}ml from food! 💧`);
        } else {
            alert('Please enter a valid amount between 1-1000ml');
        }
    }
}

// ============ EXERCISE TRACKING ============
function setupExerciseGrid() {
    updateExerciseGrid();
}

async function updateExerciseGrid() {
    const today = getTodayKey();
    const todayExercise = await getExerciseByDate(today);
    
    const grid = document.getElementById('exerciseGrid');
    if (!grid) return;
    
    grid.innerHTML = EXERCISES.map(exercise => {
        const exerciseLogs = todayExercise.filter(e => e.activity === exercise);
        const totalMinutes = exerciseLogs.reduce((sum, e) => sum + e.minutes, 0);
        const breakdown = exerciseLogs.map(e => e.minutes).join(' + ');
        
        return `
            <div class="exercise-card">
                <div class="exercise-name">
                    ${exercise}
                    ${totalMinutes > 0 ? `<button class="reset-btn" onclick="resetExercise('${exercise}')">↺</button>` : ''}
                </div>
                ${totalMinutes > 0 ? `<div class="exercise-total">${breakdown} = ${totalMinutes} min</div>` : ''}
                <div class="time-buttons">
                    <button class="time-btn" onclick="logExercise('${exercise}', 15)">15m</button>
                    <button class="time-btn" onclick="logExercise('${exercise}', 30)">30m</button>
                    <button class="time-btn" onclick="logExercise('${exercise}', 45)">45m</button>
                    <button class="time-btn" onclick="logExercise('${exercise}', 60)">60m</button>
                </div>
            </div>
        `;
    }).join('');
}

async function logExercise(activity, minutes) {
    const today = getTodayKey();
    const points = (minutes / 15) * EXERCISE_POINTS_PER_15MIN;
    
    const exercise = {
        date: today,
        activity: activity,
        minutes: minutes,
        points: points,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    await addExercise(exercise);
    await updateAllUI();
    await updateExerciseGrid();
    
    // Visual feedback
    if (event && event.target) {
        const btn = event.target;
        const originalBg = btn.style.background;
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.style.background = originalBg;
        }, 500);
    }
}

async function resetExercise(activity) {
    if (confirm(`Reset all ${activity} entries for today?`)) {
        const today = getTodayKey();
        await deleteExerciseByActivity(today, activity);
        await updateAllUI();
        await updateExerciseGrid();
    }
}

// ============ SLEEP TRACKING ============
async function logSleep(type) {
    const today = getTodayKey();
    
    if (type === 'night') {
        let sleep = await getSleepByDate(today);
        if (!sleep) {
            await addSleep({
                date: today,
                bedtime: new Date().toISOString()
            });
        } else {
            sleep.bedtime = new Date().toISOString();
            await updateSleep(sleep.id, { bedtime: sleep.bedtime });
        }
        alert('Good night! Sleep well! 😴');
        
    } else if (type === 'morning') {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let sleep = await getSleepByDate(yesterday);
        
        if (sleep && sleep.bedtime && !sleep.wakeup) {
            await updateSleep(sleep.id, { wakeup: new Date().toISOString() });
            document.getElementById('sleepQuality').style.display = 'block';
        } else {
            alert('Good morning! ☀️');
        }
    }
    
    await updateAllUI();
}

async function setSleepQuality(quality) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sleep = await getSleepByDate(yesterday);
    
    if (sleep) {
        await updateSleep(sleep.id, { quality });
        await updateAllUI();
        document.getElementById('sleepQuality').style.display = 'none';
        
        // Visual feedback
        document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('selected'));
        if (event && event.target) {
            event.target.classList.add('selected');
        }
        
        setTimeout(() => {
            document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('selected'));
        }, 2000);
    }
}

// ============ NAP TIMER ============
// ============ NAP TIMER ============

function setNapTimer(minutes) {
    napTimerMinutes = minutes;
    napTimerSeconds = minutes * 60;
    document.getElementById('napTimerDisplay').style.display = 'block';
    document.getElementById('napAlarm').style.display = 'none';
    updateNapTimerDisplay();
    
    // Calculate end time
    const endTime = new Date(Date.now() + minutes * 60 * 1000);
    document.getElementById('napEndTime').textContent = 
        `Ends at ${endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function setCustomNapTimer() {
    const minutes = parseInt(document.getElementById('customNapMinutes').value);
    if (minutes && minutes > 0 && minutes <= 180) {
        setNapTimer(minutes);
        document.getElementById('customNapMinutes').value = '';
    } else {
        alert('Please enter a valid time between 1-180 minutes');
    }
}

function updateNapTimerDisplay() {
    const mins = Math.floor(napTimerSeconds / 60);
    const secs = napTimerSeconds % 60;
    document.getElementById('napTimeLeft').textContent = 
        `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function toggleNapTimer() {
    if (napTimerRunning) {
        // Pause
        napTimerRunning = false;
        clearInterval(napTimerInterval);
        document.getElementById('napStartStop').innerHTML = '▶️ Resume';
    } else {
        // Start/Resume
        napTimerRunning = true;
        document.getElementById('napStartStop').innerHTML = '⏸️ Pause';
        
        napTimerInterval = setInterval(() => {
            if (napTimerSeconds > 0) {
                napTimerSeconds--;
                updateNapTimerDisplay();
            } else {
                // Timer finished - trigger alarm
                triggerNapAlarm();
            }
        }, 1000);
    }
}

function resetNapTimer() {
    napTimerRunning = false;
    napTimerSeconds = napTimerMinutes * 60;
    clearInterval(napTimerInterval);
    updateNapTimerDisplay();
    document.getElementById('napStartStop').innerHTML = '▶️ Start';
}

function triggerNapAlarm() {
    napTimerRunning = false;
    clearInterval(napTimerInterval);
    
    // Hide timer, show alarm
    document.getElementById('napTimerDisplay').style.display = 'none';
    document.getElementById('napAlarm').style.display = 'block';
    
    // Play alarm sound
    playNapAlarm();
}

function playNapAlarm() {
    const soundType = document.getElementById('napAlarmSound').value;
    
    // Create audio context for generating tones
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Different melodies for each alarm type
    const melodies = {
        gentle: [
            { freq: 523.25, duration: 0.3 }, // C5
            { freq: 659.25, duration: 0.3 }, // E5
            { freq: 783.99, duration: 0.3 }, // G5
            { freq: 1046.50, duration: 0.6 } // C6
        ],
        birds: [
            { freq: 1000, duration: 0.1 },
            { freq: 1200, duration: 0.1 },
            { freq: 800, duration: 0.1 },
            { freq: 1100, duration: 0.1 },
            { freq: 900, duration: 0.1 },
            { freq: 1300, duration: 0.2 }
        ],
        bells: [
            { freq: 880, duration: 0.4 },  // A5
            { freq: 880, duration: 0.4 },
            { freq: 880, duration: 0.4 },
            { freq: 1046.50, duration: 0.8 } // C6
        ]
    };
    
    const melody = melodies[soundType] || melodies.gentle;
    let time = audioContext.currentTime;
    
    // Play melody 3 times
    for (let repeat = 0; repeat < 3; repeat++) {
        melody.forEach(note => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = note.freq;
            oscillator.type = soundType === 'birds' ? 'sine' : 'triangle';
            
            // Envelope
            gainNode.gain.setValueAtTime(0, time);
            gainNode.gain.linearRampToValueAtTime(0.3, time + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, time + note.duration);
            
            oscillator.start(time);
            oscillator.stop(time + note.duration);
            
            time += note.duration + 0.05; // Small gap between notes
        });
        
        time += 0.3; // Gap between repetitions
    }
    
    // Vibrate if supported
    if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
    }
}

function stopNapAlarm() {
    // Stop any playing audio
    if (napAlarmAudio) {
        napAlarmAudio.pause();
        napAlarmAudio = null;
    }
    
    // Hide alarm, show timer display
    document.getElementById('napAlarm').style.display = 'none';
    document.getElementById('napTimerDisplay').style.display = 'block';
    
    // Reset timer
    napTimerSeconds = 0;
    updateNapTimerDisplay();
}

async function logNap(quality) {
    const today = getTodayKey();
    
    // Log as a nap entry
    await dbAdd('naps', {
        date: today,
        duration: napTimerMinutes,
        quality: quality,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    });
    
    // Also add to daily sleep notes
    const sleep = await getSleepByDate(today);
    if (sleep) {
        const napNote = `Nap: ${napTimerMinutes}min (${quality})`;
        const existingNotes = sleep.notes || '';
        await updateSleep(sleep.id, { 
            notes: existingNotes ? `${existingNotes}\n${napNote}` : napNote 
        });
    } else {
        // Create new sleep entry for nap
        await addSleep({
            date: today,
            notes: `Nap: ${napTimerMinutes}min (${quality})`
        });
    }
    
    stopNapAlarm();
    await updateAllUI();
    
    // Show success message
    const qualityMessages = {
        'refreshed': '😊 Great nap! Feeling refreshed!',
        'okay': '😐 Decent nap. Hope it helped!',
        'groggy': '😴 Feeling groggy? Maybe next time try a shorter nap!',
        'didnt-sleep': '😞 Couldn\'t sleep? That\'s okay, rest is still beneficial!'
    };
    
    alert(qualityMessages[quality] || 'Nap logged!');
}

async function updateNapLog() {
    const container = document.getElementById('napLog');
    const allNaps = await dbGetAll('naps');
    
    if (!allNaps || allNaps.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    // Group by date, show last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const recentNaps = allNaps.filter(nap => new Date(nap.date) >= weekAgo)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (recentNaps.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<h4 style="margin: 20px 0 10px;">Recent Naps</h4>';
    
    recentNaps.slice(0, 5).forEach(nap => {
        const qualityIcon = {
            'refreshed': '😊',
            'okay': '😐',
            'groggy': '😴',
            'didnt-sleep': '😞'
        }[nap.quality] || '💤';
        
        const date = new Date(nap.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        html += `
            <div style="padding: 10px; background: var(--bg-light); border-radius: 8px; margin-bottom: 8px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${qualityIcon} ${nap.duration} min</strong>
                        <span style="color: var(--text-secondary); margin-left: 10px;">${nap.time}</span>
                    </div>
                    <div style="color: var(--text-secondary); font-size: 12px;">${date}</div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============ TASKS ============
async function addTask(type) {
    const input = document.getElementById(type + 'Input');
    const text = input.value.trim();
    
    if (text) {
        await dbAdd('tasks', {
            date: getTodayKey(),
            type: type,
            text: text,
            status: 'active'
        });
        
        input.value = '';
        await updateAllUI();
    }
}

async function updateTaskStatus(type, id, status) {
    await updateTask(id, { status });
    await updateAllUI();
}

// Defer a task
async function deferTask(id) {
    await updateTask(id, { status: 'deferred', deferredDate: getTodayKey() });
    await updateAllUI();
}

// Reactivate a deferred task
async function reactivateTask(id) {
    await updateTask(id, { status: 'active', deferredDate: null });
    await updateAllUI();
}

// Delete a deferred task
async function deleteDeferredTask(id) {
    if (confirm('Permanently delete this task?')) {
        await deleteTask(id);
        await updateAllUI();
    }
}

// Calculate weekly accomplishments
async function refreshWeeklyWins() {
    await updateWeeklyWins();
}

async function updateWeeklyWins() {
    const container = document.getElementById('weeklyAccomplishments');
    
    // Get date 7 days ago
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    // Get all completed tasks from the past week
    const allTasks = await getAllTasks();
    const completedThisWeek = allTasks.filter(task => {
        if (task.status !== 'complete') return false;
        const taskDate = new Date(task.date);
        return taskDate >= weekAgo && taskDate <= today;
    });
    
    if (completedThisWeek.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                <p style="font-size: 14px;">No completed tasks this week yet.</p>
                <p style="font-size: 12px; margin-top: 5px;">Keep going - you've got this! 💪</p>
            </div>
        `;
        return;
    }
    
    // Group by type
    const byType = {
        want: completedThisWeek.filter(t => t.type === 'want').length,
        need: completedThisWeek.filter(t => t.type === 'need').length,
        grateful: completedThisWeek.filter(t => t.type === 'grateful').length
    };
    
    let html = `
        <div style="background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div style="font-size: 24px; font-weight: bold; color: var(--success);">
                    ${completedThisWeek.length}
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600;">Total Wins</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">This Week</div>
                </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 13px;">
                <div style="text-align: center; padding: 8px; background: var(--bg-light); border-radius: 6px;">
                    <div style="font-weight: bold;">${byType.want}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Wants</div>
                </div>
                <div style="text-align: center; padding: 8px; background: var(--bg-light); border-radius: 6px;">
                    <div style="font-weight: bold;">${byType.need}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Needs</div>
                </div>
                <div style="text-align: center; padding: 8px; background: var(--bg-light); border-radius: 6px;">
                    <div style="font-weight: bold;">${byType.grateful}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Grateful</div>
                </div>
            </div>
        </div>
    `;
    
    // Show recent completed tasks (up to 5)
    const recent = completedThisWeek.slice(0, 5);
    html += '<div style="font-size: 13px;">';
    html += '<div style="font-weight: 600; margin-bottom: 8px;">Recent Wins:</div>';
    recent.forEach(task => {
        const icon = task.type === 'want' ? '🎯' : task.type === 'need' ? '✅' : '🙏';
        html += `
            <div style="padding: 8px; background: var(--bg-light); border-radius: 6px; margin-bottom: 5px; display: flex; align-items: center; gap: 8px;">
                <span>${icon}</span>
                <span style="flex: 1;">${task.text}</span>
            </div>
        `;
    });
    html += '</div>';
    
    if (completedThisWeek.length > 5) {
        html += `<div style="text-align: center; font-size: 12px; color: var(--text-secondary); margin-top: 10px;">+ ${completedThisWeek.length - 5} more wins!</div>`;
    }
    
    container.innerHTML = html;
}

async function updateDeferredTasks() {
    const container = document.getElementById('deferredList');
    const noTasks = document.getElementById('noDeferredTasks');
    
    const allTasks = await getAllTasks();
    const deferred = allTasks.filter(task => task.status === 'deferred');
    
    if (deferred.length === 0) {
        container.innerHTML = '';
        noTasks.style.display = 'block';
        return;
    }
    
    noTasks.style.display = 'none';
    
    let html = '';
    deferred.forEach(task => {
        const icon = task.type === 'want' ? '🎯' : task.type === 'need' ? '✅' : '🙏';
        const daysDeferred = Math.floor((new Date() - new Date(task.deferredDate)) / (1000 * 60 * 60 * 24));
        
        html += `
            <div class="task-item" style="background: var(--bg-card); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <span style="font-size: 20px;">${icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 500;">${task.text}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">Deferred ${daysDeferred} day${daysDeferred !== 1 ? 's' : ''} ago</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn" onclick="reactivateTask(${task.id})" style="flex: 1; font-size: 13px; padding: 8px;">
                        ▶️ Reactivate
                    </button>
                    <button class="btn btn-secondary" onclick="deleteDeferredTask(${task.id})" style="flex: 1; font-size: 13px; padding: 8px;">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============ MEDICATIONS ============
function openMedScanner() {
    currentScanType = 'medication';
    document.getElementById('scanTitle').textContent = 'Scan Medication Label';
    document.getElementById('scanModal').classList.add('active');
}

function showManualMed() {
    const manual = document.getElementById('manualMedEntry');
    manual.style.display = manual.style.display === 'none' ? 'block' : 'none';
}

async function addMedication() {
    const name = document.getElementById('medName').value.trim();
    const dosage = document.getElementById('medDosage').value.trim();

    if (name && dosage) {
        await dbAdd('medications', {
            name: name,
            dosage: dosage
        });

        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        await updateAllUI();
    }
}

async function addScannedMed(name, dosage) {
    await dbAdd('medications', { name, dosage });
    await updateAllUI();
}

async function markMedTaken(id, time) {
    const today = getTodayKey();
    const logs = await getMedLogsByDate(today);
    const existing = logs.find(l => l.medId === id && l.time === time);
    
    if (existing) {
        // Untake it
        await dbDelete('med_logs', existing.id);
    } else {
        // Take it
        await logMedTaken(id, today, time);
    }
    
    await updateAllUI();
}

async function resetMedication(id) {
    if (confirm('Reset today\'s medication tracking for this med?')) {
        const today = getTodayKey();
        await deleteMedLogsByMedAndDate(id, today);
        await updateAllUI();
    }
}

// Stub functions for scanning (next part will implement)
function openQuickScan(type) {
    if (type === 'receipt') {
        // Demo restaurant receipt with cost tracking
        const demoReceipt = {
            restaurant: 'Demo Restaurant',
            date: getTodayKey(),
            items: [
                { name: 'Burger & Fries', estimatedPoints: 20, price: 18.99 },
                { name: 'Chicken Caesar Salad', estimatedPoints: 12, price: 14.99 },
                { name: 'Soda', estimatedPoints: 4, price: 3.50 }
            ],
            total: 37.48
        };
        displayCheatReceiptDemo(demoReceipt);
    } else {
        alert(`Scanning feature (${type}) coming in next update!`);
    }
}

function displayCheatReceiptDemo(receipt) {
    const modal = document.getElementById('scanModal');
    const resultDiv = document.getElementById('scanResult');
    
    modal.classList.add('active');
    document.getElementById('scanTitle').textContent = '🍕 Restaurant Receipt';
    
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px;">
            <h3>${receipt.restaurant}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 15px;">${receipt.date}</p>
            <p style="font-weight: 600; margin-bottom: 10px;">Which item was yours?</p>
            
            <div id="cheatItems">
                ${receipt.items.map((item, index) => {
                    const costPerPoint = (item.price / item.estimatedPoints).toFixed(2);
                    const expensive = parseFloat(costPerPoint) > 1.50;
                    return `
                        <div class="receipt-item" style="flex-direction: column; align-items: flex-start; padding: 12px;">
                            <div class="item-select" style="width: 100%; margin-bottom: 8px;">
                                <input type="radio" name="cheatItem" value="${index}" id="item${index}">
                                <label for="item${index}" style="flex: 1;">
                                    <strong>${item.name}</strong><br>
                                    <span style="font-size: 14px; color: var(--text-secondary);">
                                        ${item.estimatedPoints} pts • $${item.price.toFixed(2)}
                                    </span>
                                </label>
                            </div>
                            <div style="width: 100%; padding-left: 28px; font-size: 12px; ${expensive ? 'color: var(--warning);' : 'color: var(--text-secondary);'}">
                                💰 Cost per point: $${costPerPoint}
                                ${expensive ? ' ⚠️ Pricey!' : ' ✅ Good value'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">Total Bill: $${receipt.total.toFixed(2)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    💡 Homemade meals typically cost $0.50-0.75 per point
                </div>
            </div>
            
            <button class="btn" onclick="logCheatFromReceiptDemo(${JSON.stringify(receipt).replace(/"/g, '&quot;')})" style="margin-top: 15px;">
                Log My Item
            </button>
        </div>
    `;
}

async function logCheatFromReceiptDemo(receipt) {
    const selected = document.querySelector('input[name="cheatItem"]:checked');
    if (!selected) {
        alert('Please select which item was yours');
        return;
    }

    const item = receipt.items[parseInt(selected.value)];
    const today = getTodayKey();
    
    // Log food with cost
    await addFood({
        date: today,
        name: `🍕 ${item.name}`,
        points: item.estimatedPoints,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        source: 'cheat_receipt',
        cost: item.price
    });

    // Log store visit
    await addStoreVisit({
        date: today,
        store: receipt.restaurant,
        total: item.price,
        type: 'restaurant'
    });

    await updateAllUI();
    closeScan();
    
    const costPerPoint = (item.price / item.estimatedPoints).toFixed(2);
    alert(`Cheat meal logged! 

${item.name}: ${item.estimatedPoints} pts for $${item.price.toFixed(2)}
Cost per point: $${costPerPoint}

Remember: one meal, back on track next time! 💪`);
}

function closeScan() {
    document.getElementById('scanModal').classList.remove('active');
    document.getElementById('scanResult').innerHTML = '';
}

function startCamera() {}
function handleFileUpload(event) {}

// ============ UI UPDATES ============
async function updateWeightDisplay() {
    if (!userSettings) return;
    
    document.getElementById('currentWeight').textContent = `${userSettings.currentWeight} lbs`;
    document.getElementById('goalWeight').textContent = `${userSettings.goalWeight} lbs`;
    
    const progress = calculateWeightProgress();
    document.getElementById('weightProgress').style.width = `${progress}%`;
    
    const weeklyGoal = calculateWeeklyGoal();
    document.getElementById('weeklyGoal').textContent = weeklyGoal.toFixed(1);
    
    document.getElementById('nextWeighin').textContent = getNextWeighinDate();
}

async function updatePointsDisplay() {
    const today = getTodayKey();
    const foods = await getFoodsByDate(today);
    const exercises = await getExerciseByDate(today);
    
    const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
    const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
    const netPoints = foodPoints - exercisePoints;
    
    const dailyAllowance = userSettings ? userSettings.dailyPoints : 22;
    const remaining = dailyAllowance - netPoints;
    
    document.getElementById('pointsToday').textContent = netPoints;
    document.getElementById('pointsRemaining').textContent = `${remaining} remaining`;
    document.getElementById('dailyAllowance').textContent = dailyAllowance;
    
    // Bonus points (new system)
    const bonusPoints = await getBonusPoints();
    document.getElementById('pointsBank').textContent = bonusPoints;
    
    // Show "Resets Monday" instead of expiry date
    document.getElementById('bankExpiry').textContent = 'Resets Monday';
}

async function updateTodayLog() {
    const today = getTodayKey();
    const foods = await getFoodsByDate(today);
    const exercises = await getExerciseByDate(today);
    
    const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
    const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
    const netPoints = foodPoints - exercisePoints;
    
    const logContainer = document.getElementById('todayLog');
    logContainer.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>Food:</strong> ${foodPoints} pts
            ${exercisePoints > 0 ? `<br><strong>Exercise:</strong> -${exercisePoints} pts` : ''}
            <br><strong>Net:</strong> ${netPoints} pts
        </div>
        ${foods.map(f => `<div style="margin-bottom: 5px;">${f.time} - ${f.name} (${f.points}pts)</div>`).join('')}
    `;
}

async function updateExercisePoints() {
    const today = getTodayKey();
    const exercises = await getExerciseByDate(today);
    const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
    
    const elem = document.getElementById('exercisePoints');
    if (elem) {
        elem.textContent = `Points Earned Today: ${exercisePoints} pts`;
    }
}

async function updateSleepLog() {
    const sleepLogs = await dbGetAll('sleep');
    const recentSleep = sleepLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
    
    const sleepLog = document.getElementById('sleepLog');
    if (!sleepLog) return;
    
    sleepLog.innerHTML = recentSleep.length === 0
        ? '<p style="color: var(--text-secondary);">No sleep logged yet</p>'
        : recentSleep.map(sleep => {
            const quality = sleep.quality || 'Not rated';
            const emoji = {
                'zonked': '😴',
                'good': '😊',
                'restless': '😐',
                'poor': '😞'
            }[quality] || '💤';
            
            return `
                <div class="card" style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>${sleep.date}</div>
                        <div>${emoji} ${quality}</div>
                    </div>
                </div>
            `;
        }).join('');
}

async function updateTasksDisplay() {
    const today = getTodayKey();
    const allTasks = await getTasksByDate(today);
    
    ['want', 'need', 'grateful'].forEach(type => {
        const list = document.getElementById(type + 'List');
        if (!list) return;
        
        const tasks = allTasks.filter(t => t.type === type && t.status === 'active');
        list.innerHTML = tasks.length === 0 
            ? '<p style="color: var(--text-secondary); font-size: 14px;">Nothing added yet</p>'
            : tasks.map(task => `
                <div class="task-item">
                    <div>${task.text}</div>
                    <div class="task-buttons">
                        <button class="task-btn done" onclick="updateTaskStatus('${type}', ${task.id}, 'complete')">✓ Done</button>
                        <button class="task-btn defer" onclick="deferTask(${task.id})">⏸️ Defer</button>
                    </div>
                </div>
            `).join('');
    });
}

async function updateMedsDisplay() {
    const today = getTodayKey();
    const meds = await getAllMedications();
    const logs = await getMedLogsByDate(today);
    
    const medsContainer = document.getElementById('todayMeds');
    if (!medsContainer) return;
    
    medsContainer.innerHTML = meds.length === 0
        ? '<p style="color: var(--text-secondary);">No medications added</p>'
        : meds.map(med => {
            const takenMorning = logs.some(l => l.medId === med.id && l.time === 'morning');
            const takenAfternoon = logs.some(l => l.medId === med.id && l.time === 'afternoon');
            const takenEvening = logs.some(l => l.medId === med.id && l.time === 'evening');
            const anyTaken = takenMorning || takenAfternoon || takenEvening;
            
            return `
                <div class="card" style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div style="font-weight: 600;">${med.name}</div>
                        ${anyTaken ? `<button class="reset-btn" onclick="resetMedication(${med.id})">↺ Reset</button>` : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">${med.dosage}</div>
                    <div class="med-time-group">
                        <button class="med-time-btn ${takenMorning ? 'taken' : ''}" onclick="markMedTaken(${med.id}, 'morning')">
                            Morning
                        </button>
                        <button class="med-time-btn ${takenAfternoon ? 'taken' : ''}" onclick="markMedTaken(${med.id}, 'afternoon')">
                            Afternoon
                        </button>
                        <button class="med-time-btn ${takenEvening ? 'taken' : ''}" onclick="markMedTaken(${med.id}, 'evening')">
                            Evening
                        </button>
                    </div>
                </div>
            `;
        }).join('');
}

// ============ EXPORT / IMPORT ============
async function exportData() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellness-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    document.getElementById('importFile').click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await importAllData(data);
            alert('Data imported successfully! Refreshing...');
            location.reload();
        } catch (err) {
            alert('Error importing data: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ============ START APPLICATION ============
document.addEventListener('DOMContentLoaded', init);
setInterval(performDailyMaintenance, 60000); // Check daily maintenance every minute
setInterval(checkWeeklyReminders, 3600000); // Check weekly reminders every hour

// ============ AI WELLNESS COACH ============

let aiChatOpen = false;
let currentTab = 'home';
let measurementSystem = 'imperial'; // 'imperial' or 'metric'

// Voice interaction
let recognition = null;
let isListening = false;
let voiceOutputEnabled = true;
let currentSpeech = null;

// Initialize speech recognition
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech recognition not supported');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        isListening = true;
        updateVoiceButton();
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('aiChatInput').value = transcript;
        sendAIMessage();
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        updateVoiceButton();
        
        if (event.error === 'no-speech') {
            showVoiceStatus('No speech detected. Try again!');
        } else if (event.error === 'not-allowed') {
            showVoiceStatus('Microphone access denied');
        }
    };
    
    recognition.onend = function() {
        isListening = false;
        updateVoiceButton();
    };
    
    return true;
}

function toggleVoiceInput() {
    if (!recognition) {
        if (!initVoiceRecognition()) {
            alert('Voice input is not supported in your browser. Try Chrome, Edge, or Safari.');
            return;
        }
    }
    
    if (isListening) {
        recognition.stop();
        isListening = false;
    } else {
        try {
            recognition.start();
            showVoiceStatus('Listening...');
        } catch (error) {
            console.error('Failed to start recognition:', error);
            alert('Could not start voice input. Please check microphone permissions.');
        }
    }
    
    updateVoiceButton();
}

function updateVoiceButton() {
    const btn = document.getElementById('voiceBtn');
    const icon = document.getElementById('voiceIcon');
    
    if (isListening) {
        btn.classList.add('listening');
        icon.textContent = '🔴';
    } else {
        btn.classList.remove('listening');
        icon.textContent = '🎤';
    }
}

function showVoiceStatus(message) {
    const btn = document.getElementById('voiceBtn');
    const existingStatus = btn.querySelector('.voice-status');
    
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const status = document.createElement('div');
    status.className = 'voice-status';
    status.textContent = message;
    btn.style.position = 'relative';
    btn.appendChild(status);
    
    setTimeout(() => {
        status.remove();
    }, 2000);
}

function toggleVoiceOutput() {
    voiceOutputEnabled = !voiceOutputEnabled;
    const icon = document.getElementById('voiceOutputIcon');
    const text = document.getElementById('voiceOutputText');
    const btn = event.target.closest('.quick-action-btn');
    
    if (voiceOutputEnabled) {
        icon.textContent = '🔊';
        text.textContent = 'Voice On';
        btn.classList.add('voice-output-active');
    } else {
        icon.textContent = '🔇';
        text.textContent = 'Voice Off';
        btn.classList.remove('voice-output-active');
        
        // Stop any current speech
        if (currentSpeech) {
            window.speechSynthesis.cancel();
        }
    }
    
    // Save preference
    localStorage.setItem('voiceOutputEnabled', voiceOutputEnabled);
}

function speakText(text) {
    if (!voiceOutputEnabled) return;
    
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        console.log('Speech synthesis not supported');
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Strip HTML tags for speaking
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Don't speak if text is too long (recipes)
    if (cleanText.length > 500) {
        console.log('Text too long for speech, skipping');
        return;
    }
    
    currentSpeech = new SpeechSynthesisUtterance(cleanText);
    currentSpeech.rate = 1.0;
    currentSpeech.pitch = 1.0;
    currentSpeech.volume = 1.0;
    currentSpeech.lang = 'en-US';
    
    // Add speaking indicator
    currentSpeech.onstart = function() {
        addSpeakingIndicator();
    };
    
    currentSpeech.onend = function() {
        removeSpeakingIndicator();
        currentSpeech = null;
    };
    
    currentSpeech.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        removeSpeakingIndicator();
        currentSpeech = null;
    };
    
    window.speechSynthesis.speak(currentSpeech);
}

function addSpeakingIndicator() {
    const header = document.querySelector('.ai-chat-header');
    if (!header || header.querySelector('.speaking-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'speaking-indicator';
    indicator.innerHTML = '<div class="speaking-dot"></div><div class="speaking-dot"></div><div class="speaking-dot"></div>';
    header.appendChild(indicator);
}

function removeSpeakingIndicator() {
    const indicator = document.querySelector('.speaking-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Load voice output preference on init
document.addEventListener('DOMContentLoaded', function() {
    const savedPref = localStorage.getItem('voiceOutputEnabled');
    if (savedPref !== null) {
        voiceOutputEnabled = savedPref === 'true';
        const icon = document.getElementById('voiceOutputIcon');
        const text = document.getElementById('voiceOutputText');
        
        if (icon && text) {
            if (voiceOutputEnabled) {
                icon.textContent = '🔊';
                text.textContent = 'Voice On';
            } else {
                icon.textContent = '🔇';
                text.textContent = 'Voice Off';
            }
        }
    }
});

function toggleAIChat() {
    aiChatOpen = !aiChatOpen;
    const chatWindow = document.getElementById('aiChatWindow');
    const chatBubble = document.getElementById('aiChatBubble');
    
    if (aiChatOpen) {
        chatWindow.classList.add('active');
        chatBubble.style.display = 'none';
        updateAIContext();
    } else {
        chatWindow.classList.remove('active');
        chatBubble.style.display = 'flex';
    }
}

function updateAIContext() {
    const contextMap = {
        'home': 'Ready to help with your wellness journey!',
        'scan': 'Need help identifying food or calculating points?',
        'exercise': 'Want exercise suggestions or workout plans?',
        'sleep': 'Looking for better sleep tips?',
        'tasks': 'Need help organizing your day?',
        'meds': 'Questions about medication timing?',
        'settings': 'Want to optimize your settings?'
    };
    
    const contextEl = document.getElementById('aiContext');
    if (contextEl) {
        contextEl.textContent = contextMap[currentTab] || 'How can I help?';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';
    
    // Show thinking indicator
    const thinkingId = addThinkingIndicator();
    
    try {
        // Get context for AI
        const context = await buildAIContext();
        
        // Call Claude API
        const response = await callClaudeAPI(message, context);
        
        // Remove thinking indicator
        removeThinkingIndicator(thinkingId);
        
        // Add AI response
        addChatMessage(response, 'ai');
        
    } catch (error) {
        removeThinkingIndicator(thinkingId);
        addChatMessage('Sorry, I had trouble connecting. Please try again!', 'ai');
        console.error('AI chat error:', error);
    }
}

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'ai-message user-message' : 'ai-message';
    
    const avatar = document.createElement('div');
    avatar.className = sender === 'user' ? 'ai-avatar user-avatar' : 'ai-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'ai-text';
    textDiv.innerHTML = text; // Allow HTML for recipes
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(textDiv);
    messagesDiv.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Speak AI responses (if enabled and not user message)
    if (sender === 'ai') {
        speakText(text);
    }
    
    return messageDiv;
}

function addThinkingIndicator() {
    const messagesDiv = document.getElementById('aiChatMessages');
    const thinkingDiv = document.createElement('div');
    const id = 'thinking-' + Date.now();
    thinkingDiv.id = id;
    thinkingDiv.className = 'ai-message';
    
    thinkingDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-thinking">
            <div class="spinner"></div>
            <span>Thinking...</span>
        </div>
    `;
    
    messagesDiv.appendChild(thinkingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    return id;
}

function removeThinkingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

async function buildAIContext() {
    // Gather user context for better AI responses
    const context = {
        currentTab: currentTab,
        userName: userSettings?.name || 'there',
        dailyPoints: userSettings?.dailyPoints || 26,
        currentWeight: userSettings?.currentWeight || 0,
        goalWeight: userSettings?.goalWeight || 0,
        today: getTodayKey(),
        preferences: {}
    };
    
    // Get today's stats
    const foods = await getFoodsByDate(context.today);
    const exercise = await getExerciseByDate(context.today);
    const water = await getWaterByDate(context.today);
    
    context.todayStats = {
        foodPoints: foods.reduce((sum, f) => sum + f.points, 0),
        exercisePoints: exercise.reduce((sum, e) => sum + e.points, 0),
        waterMl: (water.drops || 0) * 250 + (water.foodWater || 0),
        mealsLogged: foods.length
    };
    
    // Get preferences
    const prefs = await getPreferences();
    context.preferences = {
        noGoFoods: prefs.noGoFoods || [],
        favoriteIngredients: Object.keys(prefs.ingredientPrefs || {}).filter(k => prefs.ingredientPrefs[k] === 'like')
    };
    
    return context;
}

async function callClaudeAPI(userMessage, context) {
    // Check if this is a meal logging request
    if (isMealLoggingRequest(userMessage)) {
        return await processMealLogging(userMessage, context);
    }
    
    // Check if this is a recipe request
    if (isRecipeRequest(userMessage)) {
        return await generateRecipe(userMessage, context);
    }
    
    // General wellness coaching
    const systemPrompt = buildSystemPrompt(context);
    
    try {
        // Check if API key is configured (if not using proxy)
        if (!USE_PROXY && (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE')) {
            throw new Error('Claude API key not configured. See SECURE-API-SETUP.md for setup instructions.');
        }
        
        const requestBody = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage }
            ]
        };
        
        let response;
        
        if (USE_PROXY) {
            // Use Cloudflare Worker proxy (secure)
            response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            // Direct API call (only for testing with private repos)
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }
        
        const data = await response.json();
        return data.content[0].text;
        
    } catch (error) {
        console.error('Claude API error:', error);
        return getFallbackResponse(userMessage, context);
    }
}

function isRecipeRequest(message) {
    const recipeKeywords = ['recipe', 'meal', 'cook', 'make', 'prepare', 'dinner', 'lunch', 'breakfast', 'snack', 'food idea'];
    return recipeKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

function isMealLoggingRequest(message) {
    const lowerMsg = message.toLowerCase();
    
    // Check for camera voice commands first
    if (lowerMsg.includes('take a snapshot') || lowerMsg.includes('take snapshot')) {
        openQuickScan('food');
        setTimeout(() => startCamera('photo'), 500);
        return false; // Not a meal logging request
    }
    
    if (lowerMsg.includes('take a video') || lowerMsg.includes('take video') || lowerMsg.includes('record video')) {
        openQuickScan('pantry');
        setTimeout(() => {
            document.getElementById('useCaseSelect').value = 'pantry-live';
            startCamera('video');
        }, 500);
        return false; // Not a meal logging request
    }
    
    if (lowerMsg.includes('go live') || lowerMsg.includes('start live')) {
        openQuickScan('pantry');
        setTimeout(() => {
            document.getElementById('useCaseSelect').value = 'pantry-live';
            startCamera('video');
        }, 500);
        return false; // Not a meal logging request
    }
    
    // Direct logging keywords
    const logKeywords = [
        'log meal', 'log food', 'record meal', 'record food', 'ate', 'had for',
        'just ate', 'just had', 'i ate', 'i had', 'consumed', 'for breakfast',
        'for lunch', 'for dinner', 'for snack'
    ];
    
    // Check if message contains logging intent
    return logKeywords.some(keyword => lowerMsg.includes(keyword)) ||
           // Pattern: "3 eggs, 2 toast" (food items with quantities)
           (/\d+\s*(egg|toast|bacon|sausage|pancake|waffle|coffee|banana|apple|chicken|rice|pasta|potato)/i.test(lowerMsg));
}

async function processMealLogging(userMessage, context) {
    // Ask Claude to parse the meal and calculate points
    const systemPrompt = `You are a food logging assistant. Parse the user's meal description and extract food items with quantities.

CRITICAL QUANTITY RULES:
1. ALWAYS look for specific quantities in the user's message
2. If quantity is NOT specified, ASK the user (e.g., "How much rice did you have?")
3. Common serving sizes:
   - Rice/pasta: 1 cup COOKED = ~200 calories, ~5 pts
   - Chicken breast: 4 oz = ~120 calories, ~3 pts
   - Eggs: 1 large egg = ~70 calories, ~2 pts
   - Toast: 1 slice = ~80 calories, ~2 pts
   - Butter: 1 tablespoon = ~100 calories, ~3 pts

CALCULATION RULES:
1. Use SmartPoints formula: Points = (Calories × 0.0305) + (SatFat × 0.275) + (Sugar × 0.12) - (Protein × 0.098)
2. Round points to nearest whole number (use Math.round)
3. Be conservative - estimate on the HIGHER side if unsure

RECIPE SCALING RULES:
1. If user mentions "1 can of sauce" - check if it's per-serving or per-can on label
   - Per can + makes 2 meals = divide by 2
   - Per serving + 4 servings per can + makes 2 meals = 2 servings per meal
2. If user says "I made X recipe that serves 4 and had 1 serving" = divide recipe total by 4
3. If user ate "half" of something = multiply by 0.5
4. If user ate "1/4" = multiply by 0.25

PORTION PATTERNS TO DETECT:
- "1 cup of rice" → 1 cup
- "2 cups cooked rice" → 2 cups  
- "handful of nuts" → ~1 oz
- "small apple" → 1 medium apple
- "large chicken breast" → 6-8 oz
- "regular chicken breast" → 4 oz
- "half a sandwich" → 0.5 serving
- "quarter of a pizza" → 0.25 pizza

IF QUANTITY IS UNCLEAR:
Respond with: "I need to know the quantity. How much [food] did you have? (e.g., 1 cup, 4 oz, 2 slices)"

ONLY if quantities ARE specified, respond in JSON format:
{
  "foods": [
    {
      "name": "Cooked brown rice",
      "quantity": "1 cup",
      "points": 5,
      "calories": 215,
      "portionNote": "cooked measurement"
    },
    {
      "name": "Grilled chicken breast",
      "quantity": "4 oz",
      "points": 3,
      "calories": 120,
      "portionNote": "typical breast size"
    }
  ],
  "totalPoints": 8,
  "mealType": "lunch",
  "needsClarification": false
}

If clarification needed:
{
  "needsClarification": true,
  "question": "How much rice did you have? (1 cup, 2 cups, etc.)"
}`;

    try {
        // Check if API key is configured (if not using proxy)
        if (!USE_PROXY && (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE')) {
            return "⚠️ API key not configured. I can't parse your meal automatically. Please use the manual food logger.";
        }
        
        const requestBody = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage }
            ]
        };
        
        let response;
        
        if (USE_PROXY) {
            response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
        }
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        const responseText = data.content[0].text;
        
        // Parse JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            // AI is asking for clarification
            return responseText;
        }
        
        const mealData = JSON.parse(jsonMatch[0]);
        
        // Check if AI needs clarification
        if (mealData.needsClarification) {
            return `❓ ${mealData.question}\n\nPlease be specific with quantities for accurate point tracking!`;
        }
        
        // Log each food item to database
        const today = getTodayKey();
        const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        
        for (const food of mealData.foods) {
            await addFood({
                date: today,
                name: `${food.name} (${food.quantity})`,
                points: food.points,
                time: currentTime,
                source: 'ai_voice_log',
                calories: food.calories
            });
        }
        
        // Update UI
        await updateAllUI();
        
        // Return confirmation
        let confirmation = `✅ **Meal Logged!**\n\n`;
        confirmation += `**${mealData.mealType.charAt(0).toUpperCase() + mealData.mealType.slice(1)}:**\n`;
        
        mealData.foods.forEach(food => {
            confirmation += `• ${food.name} (${food.quantity}): ${food.points} pts`;
            if (food.portionNote) {
                confirmation += ` *${food.portionNote}*`;
            }
            confirmation += `\n`;
        });
        
        confirmation += `\n**Total:** ${mealData.totalPoints} pts\n`;
        confirmation += `**Time:** ${currentTime}\n\n`;
        
        const remaining = context.dailyPoints - (context.todayStats.foodPoints + mealData.totalPoints);
        confirmation += `**Points Remaining Today:** ${remaining} pts`;
        
        return confirmation;
        
    } catch (error) {
        console.error('Meal logging error:', error);
        return `❌ Sorry, I couldn't parse that meal. Try being more specific with quantities:\n\n"I had 3 eggs, 2 slices of toast, and 1 tablespoon of butter for breakfast"\n\n"I ate 1 cup of cooked rice with 4 oz grilled chicken"\n\nOr use the manual food logger.`;
    }
}

function isRecipeRequest(message) {
    const recipeKeywords = ['recipe', 'meal', 'cook', 'make', 'prepare', 'dinner', 'lunch', 'breakfast', 'snack', 'food idea'];
    // Don't treat meal logging as recipe request
    if (isMealLoggingRequest(message)) return false;
    return recipeKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

async function generateRecipe(userMessage, context) {
    const pointsBudget = context.dailyPoints - context.todayStats.foodPoints;
    
    const systemPrompt = `You are a wellness-focused recipe creator. Generate recipes with:
1. Both metric AND imperial measurements
2. SmartPoints calculation (formula: Calories×0.0305 + SatFat×0.275 + Sugar×0.12 - Protein×0.098)
3. Clear cooking instructions
4. Prep time, cook time, servings

User context:
- Name: ${context.userName}
- Points remaining today: ${pointsBudget}
- Avoids: ${context.preferences.noGoFoods.join(', ') || 'Nothing specific'}
- Likes: ${context.preferences.favoriteIngredients.join(', ') || 'No preferences set'}

Format your response as HTML with classes:
- recipe-card (wrapper)
- recipe-header (title)
- recipe-stats (time, servings, points)
- recipe-section (ingredients, instructions)

Include measurement toggle: <span class="measurement" data-imperial="X oz" data-metric="Y g">X oz / Y g</span>

Provide 2-3 recipe options if asked for "ideas" or "suggestions".`;

    try {
        // Check if API key is configured (if not using proxy)
        if (!USE_PROXY && (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE')) {
            throw new Error('Claude API key not configured');
        }
        
        const requestBody = {
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2000,
            system: systemPrompt,
            messages: [
                { role: 'user', content: userMessage }
            ]
        };
        
        let response;
        
        if (USE_PROXY) {
            response = await fetch(PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify(requestBody)
            });
        }
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }
        
        const data = await response.json();
        return formatRecipeResponse(data.content[0].text);
        
    } catch (error) {
        console.error('Recipe API error:', error);
        return getSampleRecipe(pointsBudget);
    }
}

function formatRecipeResponse(apiResponse) {
    // Add measurement toggle button at the top
    return `
        <div style="margin-bottom: 10px;">
            <span style="font-size: 12px; color: var(--text-secondary);">Measurements:</span>
            <div class="measurement-toggle">
                <button class="active" onclick="switchMeasurements('imperial')">Imperial</button>
                <button onclick="switchMeasurements('metric')">Metric</button>
            </div>
        </div>
        ${apiResponse}
    `;
}

function switchMeasurements(system) {
    measurementSystem = system;
    
    // Update toggle buttons
    document.querySelectorAll('.measurement-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update all measurements
    document.querySelectorAll('.measurement').forEach(elem => {
        const imperial = elem.dataset.imperial;
        const metric = elem.dataset.metric;
        elem.textContent = system === 'imperial' ? imperial : metric;
    });
}

function getSampleRecipe(pointsBudget) {
    // Fallback recipe if API fails
    return formatRecipeResponse(`
        <div class="recipe-card">
            <div class="recipe-header">🍗 Grilled Chicken & Veggie Bowl</div>
            <div class="recipe-stats">
                <span>⏱️ Prep: 10 min</span>
                <span>🔥 Cook: 20 min</span>
                <span>🍽️ Servings: 2</span>
                <span>📊 Points: 6 per serving</span>
            </div>
            
            <div class="recipe-section">
                <h4>Ingredients:</h4>
                <ul>
                    <li><span class="measurement" data-imperial="8 oz" data-metric="225 g">8 oz / 225 g</span> chicken breast</li>
                    <li><span class="measurement" data-imperial="2 cups" data-metric="300 g">2 cups / 300 g</span> mixed vegetables (broccoli, bell peppers, carrots)</li>
                    <li><span class="measurement" data-imperial="1 cup" data-metric="185 g">1 cup / 185 g</span> brown rice, cooked</li>
                    <li><span class="measurement" data-imperial="1 tbsp" data-metric="15 ml">1 tbsp / 15 ml</span> olive oil</li>
                    <li><span class="measurement" data-imperial="1 tsp" data-metric="5 ml">1 tsp / 5 ml</span> garlic powder</li>
                    <li>Salt and pepper to taste</li>
                </ul>
            </div>
            
            <div class="recipe-section">
                <h4>Instructions:</h4>
                <ol>
                    <li>Season chicken with garlic powder, salt, and pepper</li>
                    <li>Heat oil in large pan over medium-high heat</li>
                    <li>Cook chicken 6-7 minutes per side until internal temp reaches 165°F (74°C)</li>
                    <li>Remove chicken, let rest, then slice</li>
                    <li>In same pan, stir-fry vegetables 5-6 minutes until tender-crisp</li>
                    <li>Serve sliced chicken over rice with veggies on side</li>
                </ol>
            </div>
            
            <div class="recipe-section">
                <h4>Nutrition (per serving):</h4>
                <ul>
                    <li>Calories: 350</li>
                    <li>Protein: 35g</li>
                    <li>Carbs: 30g</li>
                    <li>Fat: 9g (2g saturated)</li>
                    <li>Sugar: 4g</li>
                    <li><strong>SmartPoints: 6</strong></li>
                </ul>
            </div>
        </div>
    `);
}

function buildSystemPrompt(context) {
    const now = new Date();
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const isWeekend = now.getDay() === 0 || now.getDay() === 6;
    
    return `You are a supportive AI wellness coach integrated into the Ultimate Wellness System app. 

Current context:
- Today: ${dayOfWeek}, ${date}${isWeekend ? ' (Weekend)' : ' (Weekday)'}
- User: ${context.userName}
- Current tab: ${context.currentTab}
- Daily points allowance: ${context.dailyPoints}
- Points used today: ${context.todayStats.foodPoints} (${context.todayStats.mealsLogged} meals logged)
- Exercise points earned: ${context.todayStats.exercisePoints}
- Water consumed: ${context.todayStats.waterMl}ml / 2000ml goal
- Current weight: ${context.currentWeight} lbs → Goal: ${context.goalWeight} lbs

User preferences:
- Avoids: ${context.preferences.noGoFoods.join(', ') || 'None specified'}
- Favorite ingredients: ${context.preferences.favoriteIngredients.join(', ') || 'None specified'}

Be encouraging, specific, and action-oriented. Keep responses concise (2-3 paragraphs max). 
Use their name occasionally. Reference their current stats when relevant.
For exercise questions, suggest specific activities with duration and expected points.
For food questions, mention points and provide practical tips.
${isWeekend ? 'Since it\'s the weekend, consider suggesting meal prep or family-friendly activities.' : 'Since it\'s a weekday, keep suggestions quick and practical for busy schedules.'}

${getTabSpecificGuidance(context.currentTab)}`;
}

function getTabSpecificGuidance(tab) {
    const guidance = {
        'exercise': 'User is on Exercise tab. Suggest specific workouts, duration, and calculate points they\'ll earn (1 point per 15 minutes).',
        'sleep': 'User is on Sleep tab. Provide science-backed sleep tips. Mention how better sleep improves weight loss.',
        'tasks': 'User is on Tasks tab. Help with prioritization, time management, or motivation.',
        'home': 'User is on Home tab. Look at their overall day - are they on track? Offer encouragement or gentle guidance.',
        'scan': 'User is on Scan tab. Ready to help identify foods, calculate points, or explain nutrition labels.',
        'meds': 'User is on Medications tab. Help with scheduling or remembering to take meds.',
        'settings': 'User is on Settings tab. Help optimize their configuration for better results.'
    };
    
    return guidance[tab] || '';
}

function getFallbackResponse(message, context) {
    // Simple fallback if API fails
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('exercise') || lowerMsg.includes('workout')) {
        return `Hi ${context.userName}! Here are some exercise ideas for you:

💪 **Quick 30-minute workout** (2 points):
- 10 min warm-up walk
- 15 min bodyweight exercises (squats, push-ups, lunges)
- 5 min cool-down stretches

🚶 **Easy walk** (1 point per 15 min):
- Perfect for starting out
- Listen to podcast/music
- Aim for 30-45 minutes

🧹 **Active chores** (1 point per 15 min):
- Vacuuming, yard work, cleaning
- Burns calories while being productive!

Which sounds good to you?`;
    }
    
    if (lowerMsg.includes('recipe') || lowerMsg.includes('meal')) {
        return getSampleRecipe(context.dailyPoints - context.todayStats.foodPoints);
    }
    
    return `I'm here to help, ${context.userName}! Right now you have ${context.dailyPoints - context.todayStats.foodPoints} points remaining today. What would you like to know about?

- Recipe ideas
- Exercise suggestions
- Meal planning
- Nutrition tips
- Motivation boost

Just ask! 💪`;
}

function quickAIPrompt(type) {
    const prompts = {
        'recipe': `I have ${userSettings.dailyPoints - (document.getElementById('pointsToday').textContent || 0)} points left today. Can you suggest 2-3 healthy recipe options?`,
        'meal-plan': `Can you create a 3-day meal plan that fits my ${userSettings.dailyPoints} daily points?`,
        'exercise': `I'm on the exercise tab. What's a good workout plan for me today?`,
        'log-meal': `Log meal: ` // User will complete with their meal
    };
    
    const input = document.getElementById('aiChatInput');
    input.value = prompts[type] || '';
    
    // For log-meal, focus on input so user can type their meal
    if (type === 'log-meal') {
        input.focus();
        // Auto-start voice input if available
        if (recognition && !isListening) {
            setTimeout(() => {
                if (confirm('Use voice to describe your meal?')) {
                    toggleVoiceInput();
                }
            }, 100);
        }
    } else {
        sendAIMessage();
    }
}

// Update currentTab when switching tabs
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (event && event.target) {
        event.target.classList.add('active');
    }
    document.getElementById(tab + 'Tab').classList.add('active');
    
    // Update AI context
    updateAIContext();
    
    // Load settings when switching to settings tab
    if (tab === 'settings' && userSettings) {
        document.getElementById('settingsName').value = userSettings.name || '';
        document.getElementById('settingsEmail').value = userSettings.email || '';
        document.getElementById('settingsWeight').value = userSettings.currentWeight || '';
        document.getElementById('settingsGoalWeight').value = userSettings.goalWeight || '';
        const feet = Math.floor(userSettings.heightInInches / 12);
        const inches = userSettings.heightInInches % 12;
        document.getElementById('settingsHeightFeet').value = feet;
        document.getElementById('settingsHeightInches').value = inches;
        document.getElementById('settingsActivity').value = userSettings.activity || 'moderate';
    }
}

// Allow Enter key to send messages
document.addEventListener('DOMContentLoaded', function() {
    const aiInput = document.getElementById('aiChatInput');
    if (aiInput) {
        aiInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }
    
    // Keyboard shortcut for voice input: Ctrl/Cmd + M
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            if (aiChatOpen) {
                toggleVoiceInput();
            }
        }
    });
});

// ============ EMAIL CONFIGURATION ============

// EmailJS Configuration (for real email sending)
// Sign up free at https://www.emailjs.com
const EMAIL_CONFIG = {
    enabled: false, // Set to true after setting up EmailJS
    serviceId: 'YOUR_SERVICE_ID', // Replace with your EmailJS service ID
    templates: {
        welcome: 'YOUR_WELCOME_TEMPLATE_ID',
        weeklyReport: 'YOUR_WEEKLY_REPORT_TEMPLATE_ID',
        weighIn: 'YOUR_WEIGHIN_TEMPLATE_ID',
        groceryList: 'YOUR_GROCERY_TEMPLATE_ID'
    }
};

// Real email sending function
async function sendRealEmail(to, subject, body, templateId = null) {
    if (!EMAIL_CONFIG.enabled || typeof emailjs === 'undefined') {
        // Fallback to mailto
        const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl);
        return false;
    }
    
    try {
        const templateParams = {
            to_email: to,
            to_name: userSettings?.name || 'there',
            subject: subject,
            message: body
        };
        
        await emailjs.send(
            EMAIL_CONFIG.serviceId,
            templateId || EMAIL_CONFIG.templates.weeklyReport,
            templateParams
        );
        
        return true;
    } catch (error) {
        console.error('EmailJS error:', error);
        // Fallback to mailto
        const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl);
        return false;
    }
}

// ============ EMAIL FUNCTIONS ============

function sendWelcomeEmail() {
    if (!userSettings || !userSettings.email) return;
    
    const subject = '🔥 Welcome to Your Wellness Journey!';
    const body = `Hi ${userSettings.name}!

Welcome to Ultimate Wellness System! 🎉

Your starting stats:
• Current Weight: ${userSettings.currentWeight} lbs
• Goal Weight: ${userSettings.goalWeight} lbs
• Daily Points: ${userSettings.dailyPoints} pts
• Weekly Goal: ${calculateWeeklyGoal().toFixed(1)} lbs/week

You've got this! Let's make every day count.

Tips to get started:
✅ Log every meal (even small snacks)
✅ Track water intake throughout the day
✅ Log exercise to earn points back
✅ Weigh in weekly (Sundays recommended)
✅ Export backup every week

Your weekly progress reports will arrive every Monday morning!

Happy tracking! 💪

- Your Ultimate Wellness System`;

    sendRealEmail(userSettings.email, subject, body, EMAIL_CONFIG.templates.welcome)
        .then(success => {
            if (success) {
                console.log('✅ Welcome email sent successfully!');
            }
        });
}

async function emailWeeklyReport() {
    if (!userSettings || !userSettings.email) {
        alert('Please add your email in Settings first!');
        return;
    }

    // Calculate weekly stats
    const stats = await calculateWeeklyStats();
    
    const subject = `📊 Your Weekly Wellness Report - ${stats.weekLabel}`;
    const body = generateWeeklyReportBody(stats);

    const success = await sendRealEmail(
        userSettings.email, 
        subject, 
        body, 
        EMAIL_CONFIG.templates.weeklyReport
    );
    
    if (success) {
        alert('✅ Weekly report sent to your email!');
    } else {
        // mailto opened as fallback
    }
}

async function calculateWeeklyStats() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all data from past 7 days
    const allFoods = await dbGetAll('foods');
    const allExercise = await dbGetAll('exercise');
    const allWater = await dbGetAll('water');
    const allSleep = await dbGetAll('sleep');
    const allStores = await dbGetAll('stores');
    
    // Filter to this week
    const weekFoods = allFoods.filter(f => new Date(f.date) >= weekAgo);
    const weekExercise = allExercise.filter(e => new Date(e.date) >= weekAgo);
    const weekWater = allWater.filter(w => new Date(w.date) >= weekAgo);
    const weekSleep = allSleep.filter(s => new Date(s.date) >= weekAgo);
    const weekStores = allStores.filter(s => new Date(s.date) >= weekAgo);
    
    // Calculate totals
    const totalFoodPoints = weekFoods.reduce((sum, f) => sum + f.points, 0);
    const totalExercisePoints = weekExercise.reduce((sum, e) => sum + e.points, 0);
    const totalExerciseMinutes = weekExercise.reduce((sum, e) => sum + e.minutes, 0);
    const netPoints = totalFoodPoints - totalExercisePoints;
    const avgDailyPoints = Math.round(netPoints / 7);
    
    // Water stats
    const totalWaterDrops = weekWater.reduce((sum, w) => sum + (w.drops || 0), 0);
    const totalFoodWater = weekWater.reduce((sum, w) => sum + (w.foodWater || 0), 0);
    const totalWaterMl = (totalWaterDrops * 250) + totalFoodWater;
    const avgWaterPerDay = Math.round(totalWaterMl / 7);
    const waterGoalDays = weekWater.filter(w => ((w.drops || 0) * 250 + (w.foodWater || 0)) >= 2000).length;
    
    // Sleep stats
    const sleepQualityScores = {
        'zonked': 4,
        'good': 3,
        'restless': 2,
        'poor': 1
    };
    const avgSleepScore = weekSleep.length > 0 
        ? weekSleep.reduce((sum, s) => sum + (sleepQualityScores[s.quality] || 0), 0) / weekSleep.length
        : 0;
    const goodSleepDays = weekSleep.filter(s => s.quality === 'zonked' || s.quality === 'good').length;
    
    // Spending stats
    const totalSpent = weekStores.reduce((sum, s) => sum + (s.total || 0), 0);
    
    // Restaurant spending (from cheat receipts)
    const restaurantFoods = weekFoods.filter(f => f.source === 'cheat_receipt');
    const restaurantSpending = restaurantFoods.reduce((sum, f) => sum + (f.cost || 0), 0);
    
    // Weight progress
    const weightLogs = await getAllWeightLogs();
    const recentWeights = weightLogs.filter(w => new Date(w.date) >= weekAgo).sort((a, b) => new Date(b.date) - new Date(a.date));
    const weightChange = recentWeights.length >= 2 
        ? recentWeights[0].weight - recentWeights[recentWeights.length - 1].weight
        : 0;
    
    // Days logged
    const uniqueDays = new Set(weekFoods.map(f => f.date)).size;
    
    return {
        weekLabel: `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        daysLogged: uniqueDays,
        totalFoodPoints,
        totalExercisePoints,
        netPoints,
        avgDailyPoints,
        dailyAllowance: userSettings.dailyPoints,
        totalExerciseMinutes,
        exerciseSessions: weekExercise.length,
        totalWaterMl,
        avgWaterPerDay,
        waterGoalDays,
        goodSleepDays,
        sleepScore: avgSleepScore.toFixed(1),
        totalSpent,
        restaurantSpending,
        weightChange,
        currentWeight: userSettings.currentWeight,
        goalWeight: userSettings.goalWeight,
        weeklyGoal: calculateWeeklyGoal()
    };
}

function generateWeeklyReportBody(stats) {
    const onTrack = stats.avgDailyPoints <= stats.dailyAllowance;
    const waterOnTrack = stats.waterGoalDays >= 5;
    const exerciseGood = stats.exerciseSessions >= 3;
    const sleepGood = stats.goodSleepDays >= 5;
    
    // Calculate cost per point for restaurant meals
    const restaurantCPP = stats.restaurantSpending > 0 && stats.totalFoodPoints > 0
        ? (stats.restaurantSpending / stats.totalFoodPoints).toFixed(2)
        : 0;
    
    // Generate encouragement
    let encouragement = '';
    if (onTrack && waterOnTrack && exerciseGood) {
        encouragement = "🌟 AMAZING WEEK! You're crushing it! Keep this momentum going!";
    } else if (onTrack) {
        encouragement = "💪 Great job on your points! You're building strong habits!";
    } else {
        encouragement = "📈 Every day is a fresh start! Small progress is still progress. You've got this!";
    }
    
    // Smart tips based on performance
    let tips = '';
    if (!waterOnTrack) {
        tips += '\n💧 TIP: Set phone reminders to drink water throughout the day!';
    }
    if (!exerciseGood) {
        tips += '\n🏃 TIP: Even 15 minutes of movement counts! Take the stairs, park farther away.';
    }
    if (!sleepGood) {
        tips += '\n😴 TIP: Better sleep = better choices tomorrow. Aim for 7-8 hours!';
    }
    if (stats.restaurantSpending > stats.totalSpent * 0.3) {
        tips += `\n💰 TIP: Restaurant meals cost $${restaurantCPP} per point vs homemade ~$0.50/pt. Consider meal prep!`;
    }
    
    return `Hi ${userSettings.name}!

Here's your weekly wellness report 📊

═══════════════════════════════════
📅 WEEK: ${stats.weekLabel}
═══════════════════════════════════

${encouragement}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 POINTS TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Days Logged: ${stats.daysLogged}/7 days
Food Points: ${stats.totalFoodPoints} pts
Exercise Points: -${stats.totalExercisePoints} pts
Net Points: ${stats.netPoints} pts
Daily Average: ${stats.avgDailyPoints} pts (Goal: ${stats.dailyAllowance} pts)
${onTrack ? '✅ ON TRACK!' : '⚠️ Over goal - review portion sizes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💪 EXERCISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sessions: ${stats.exerciseSessions} workouts
Total Time: ${stats.totalExerciseMinutes} minutes
Points Earned: ${stats.totalExercisePoints} pts
${exerciseGood ? '✅ Great activity level!' : '📈 Aim for 3+ sessions/week'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💧 HYDRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Water: ${stats.totalWaterMl}ml
Daily Average: ${stats.avgWaterPerDay}ml (Goal: 2000ml)
Goal Days: ${stats.waterGoalDays}/7 days
${waterOnTrack ? '✅ Well hydrated!' : '💧 Drink more water!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😴 SLEEP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quality Score: ${stats.sleepScore}/4.0
Good Nights: ${stats.goodSleepDays}/7 days
${sleepGood ? '✅ Well rested!' : '😴 Prioritize sleep for better results'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 SPENDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Groceries: $${(stats.totalSpent - stats.restaurantSpending).toFixed(2)}
Restaurants: $${stats.restaurantSpending.toFixed(2)}
Total: $${stats.totalSpent.toFixed(2)}
${restaurantCPP > 0 ? `Restaurant Cost per Point: $${restaurantCPP}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ WEIGHT PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current: ${stats.currentWeight} lbs
Goal: ${stats.goalWeight} lbs
To Go: ${(stats.currentWeight - stats.goalWeight).toFixed(1)} lbs
Weekly Goal: ${stats.weeklyGoal.toFixed(1)} lbs/week
This Week: ${stats.weightChange > 0 ? '-' : '+'}${Math.abs(stats.weightChange).toFixed(1)} lbs
${Math.abs(stats.weightChange) >= stats.weeklyGoal * 0.8 ? '✅ Great progress!' : '📊 Keep at it - results take time!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 YOUR PERSONALIZED TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${tips || '\n🎉 You\'re doing everything right! Keep it up!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NEXT WEEK'S FOCUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${!onTrack ? '• Stay within daily points budget\n' : ''}${!waterOnTrack ? '• Hit water goal 5+ days\n' : ''}${!exerciseGood ? '• Exercise 3+ times\n' : ''}${!sleepGood ? '• Get quality sleep 5+ nights\n' : ''}${onTrack && waterOnTrack && exerciseGood && sleepGood ? '• Maintain this amazing streak!\n• Challenge yourself to 7/7 perfect days!\n' : ''}
Remember: Progress, not perfection! 🚀

You're ${((stats.currentWeight - stats.goalWeight) / (userSettings.currentWeight - stats.goalWeight) * 100).toFixed(0)}% of the way to your goal!

Keep up the great work!
- Your Ultimate Wellness System`;
}

async function emailGroceryList() {
    if (!userSettings || !userSettings.email) {
        alert('Please add your email in Settings first!');
        return;
    }

    // Get pantry items from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allPantry = await dbGetAll('pantry');
    const recentItems = allPantry.filter(p => p.date >= thirtyDaysAgo);
    
    // Group by category (simplified)
    const categories = {
        'Produce': [],
        'Meat & Protein': [],
        'Dairy': [],
        'Pantry Staples': [],
        'Other': []
    };
    
    recentItems.forEach(item => {
        const name = item.name.toLowerCase();
        if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish')) {
            categories['Meat & Protein'].push(item.name);
        } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
            categories['Dairy'].push(item.name);
        } else if (name.includes('apple') || name.includes('banana') || name.includes('lettuce') || name.includes('tomato')) {
            categories['Produce'].push(item.name);
        } else if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('cereal')) {
            categories['Pantry Staples'].push(item.name);
        } else {
            categories['Other'].push(item.name);
        }
    });

    let list = `🛒 GROCERY LIST\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    
    Object.entries(categories).forEach(([category, items]) => {
        if (items.length > 0) {
            list += `━━━━━━━━━━━━━━━━━━━━\n${category.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━\n`;
            // Remove duplicates
            const unique = [...new Set(items)];
            unique.forEach(item => {
                list += `☐ ${item}\n`;
            });
            list += '\n';
        }
    });
    
    if (recentItems.length === 0) {
        list += 'No recent items found. Scan some grocery receipts to build your list!\n';
    }
    
    list += `\n💡 SHOPPING TIPS:\n`;
    list += `• Stick to the perimeter (fresh foods)\n`;
    list += `• Check unit prices, not package prices\n`;
    list += `• Avoid shopping hungry!\n`;
    list += `• Buy seasonal produce for best deals\n`;
    list += `\nHappy shopping! 🎉`;

    const subject = '🛒 Your Grocery List';
    
    const success = await sendRealEmail(
        userSettings.email, 
        subject, 
        list, 
        EMAIL_CONFIG.templates.groceryList
    );
    
    if (success) {
        alert('✅ Grocery list sent to your email!');
    } else {
        // mailto opened as fallback
    }
}

async function checkWeeklyReminders() {
    if (!userSettings || !userSettings.email) return;
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
    
    // Check if it's weigh-in day (Sunday or Monday)
    if ((dayOfWeek === 0 || dayOfWeek === 1) && shouldSendWeighInReminder()) {
        sendWeighInReminder();
    }
    
    // Check if it's Monday for weekly report
    if (dayOfWeek === 1 && shouldSendWeeklyReport()) {
        emailWeeklyReport();
    }
}

function shouldSendWeighInReminder() {
    const lastReminder = localStorage.getItem('lastWeighInReminder');
    const today = getTodayKey();
    
    // Only send once per week
    if (lastReminder === today) return false;
    
    // Check if already weighed in this week
    const lastWeighIn = userSettings.lastWeighIn;
    if (!lastWeighIn) return true;
    
    const daysSinceWeighIn = Math.floor((new Date() - new Date(lastWeighIn)) / (1000 * 60 * 60 * 24));
    return daysSinceWeighIn >= 6;
}

function shouldSendWeeklyReport() {
    const lastReport = localStorage.getItem('lastWeeklyReport');
    const today = getTodayKey();
    
    // Only send once per week
    return lastReport !== today;
}

function sendWeighInReminder() {
    if (!userSettings || !userSettings.email) return;
    
    const subject = '⚖️ Time to Weigh In!';
    const body = `Hi ${userSettings.name}!

It's weigh-in time! ⚖️

Step on the scale and log your weight in the app.

Current: ${userSettings.currentWeight} lbs
Goal: ${userSettings.goalWeight} lbs
Weekly Target: ${calculateWeeklyGoal().toFixed(1)} lbs/week

Remember:
• Weigh at the same time each week
• First thing in the morning is best
• After bathroom, before eating
• Weight fluctuates - focus on trends!

You're doing great! Keep going! 💪

- Your Ultimate Wellness System`;

    localStorage.setItem('lastWeighInReminder', getTodayKey());
    
    sendRealEmail(
        userSettings.email, 
        subject, 
        body, 
        EMAIL_CONFIG.templates.weighIn
    ).then(success => {
        if (success) {
            console.log('✅ Weigh-in reminder sent!');
        }
    });
}

async function updateAllUI() {
    await updateWeightDisplay();
    await updatePointsDisplay();
    await updateTodayLog();
    await updateWaterDisplay();
    await updateExercisePoints();
    await updateSleepLog();
    await updateTasksDisplay();
    await updateMedsDisplay();
    await updateEmailReminders();
    await updateDeferredTasks();
    await updateWeeklyWins();
    await updateNapLog();
}

async function updateEmailReminders() {
    const elem = document.getElementById('nextEmailReminder');
    if (!elem) return;
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calculate next Monday
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    // Calculate next Sunday/Monday for weigh-in
    const daysUntilWeighIn = dayOfWeek === 0 ? 7 : dayOfWeek === 1 ? 6 : (7 - dayOfWeek);
    const nextWeighIn = new Date(today);
    nextWeighIn.setDate(today.getDate() + daysUntilWeighIn);
    
    elem.innerHTML = `
        Next weekly report: ${nextMonday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}<br>
        Next weigh-in reminder: ${nextWeighIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    `;
}
// ============ CAMERA & SCANNING FUNCTIONS ============

// Start camera for scanning
async function startCamera(mode = 'photo') {
    cameraMode = mode;
    const container = document.getElementById('cameraContainer');
    const video = document.getElementById('scanVideo');
    const uploadOptions = document.querySelector('.upload-options');
    const useCaseSelector = document.getElementById('useCaseSelector');
    const controls = document.getElementById('cameraControls');
    const captureBtn = document.getElementById('captureBtn');
    const recordBtn = document.getElementById('recordBtn');
    
    try {
        // Request camera with video constraints
        const constraints = {
            video: {
                facingMode: 'environment', // Use back camera on mobile
                width: { ideal: 1080 },
                height: { ideal: 1920 } // 9:16 portrait
            },
            audio: mode === 'video' // Only request audio for video mode
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        video.srcObject = cameraStream;
        container.style.display = 'block';
        controls.style.display = 'flex';
        uploadOptions.style.display = 'none';
        useCaseSelector.style.display = 'block';
        
        // Show appropriate button based on mode
        if (mode === 'photo') {
            captureBtn.style.display = 'flex';
            recordBtn.style.display = 'none';
        } else {
            captureBtn.style.display = 'none';
            recordBtn.style.display = 'flex';
        }
        
    } catch (error) {
        console.error('Camera error:', error);
        let errorMsg = 'Could not access camera. ';
        
        if (error.name === 'NotAllowedError') {
            errorMsg += 'Please grant camera permissions in your browser settings.';
        } else if (error.name === 'NotFoundError') {
            errorMsg += 'No camera found on this device.';
        } else if (error.name === 'NotReadableError') {
            errorMsg += 'Camera is being used by another application.';
        } else {
            errorMsg += 'Please use file upload instead.';
        }
        
        alert(errorMsg);
        closeScan();
    }
}

// Stop camera
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Stop recording if active
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    // Clear timer
    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
    
    const video = document.getElementById('scanVideo');
    const controls = document.getElementById('cameraControls');
    const container = document.getElementById('cameraContainer');
    const timer = document.getElementById('recordingTimer');
    
    video.srcObject = null;
    controls.style.display = 'none';
    container.style.display = 'none';
    timer.style.display = 'none';
    
    document.querySelector('.upload-options').style.display = 'grid';
}

// Capture photo from camera
function capturePhoto() {
    const video = document.getElementById('scanVideo');
    const canvas = document.getElementById('scanCanvas');
    const image = document.getElementById('scanImage');
    const controls = document.getElementById('cameraControls');
    
    // Set canvas size to match video (9:16 portrait)
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    // Convert to data URL
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    // Show captured image
    image.src = dataUrl;
    image.style.display = 'block';
    video.style.display = 'none';
    controls.style.display = 'none';
    
    // Stop camera
    stopCamera();
    
    // Show use case selector if not already shown
    document.getElementById('useCaseSelector').style.display = 'block';
    
    // Analyze the image
    analyzeImage(dataUrl);
}

// Toggle video recording
function toggleRecording() {
    const recordBtn = document.getElementById('recordBtn');
    const timer = document.getElementById('recordingTimer');
    const timerText = document.getElementById('timerText');
    
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        // Start recording
        recordedChunks = [];
        recordingSeconds = 0;
        
        const video = document.getElementById('scanVideo');
        mediaRecorder = new MediaRecorder(cameraStream, {
            mimeType: 'video/webm;codecs=vp8,opus'
        });
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = () => {
            // Create video blob
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            
            // Convert to base64 or extract frames for analysis
            analyzeVideo(blob);
        };
        
        mediaRecorder.start();
        recordBtn.classList.add('recording');
        recordBtn.textContent = '⏹';
        timer.style.display = 'block';
        
        // Start timer (max 15 seconds)
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            timerText.textContent = recordingSeconds + 's';
            
            if (recordingSeconds >= 15) {
                // Auto-stop at 15 seconds
                toggleRecording();
            }
        }, 1000);
        
    } else {
        // Stop recording
        mediaRecorder.stop();
        recordBtn.classList.remove('recording');
        recordBtn.textContent = '🔴';
        timer.style.display = 'none';
        
        if (recordingTimer) {
            clearInterval(recordingTimer);
            recordingTimer = null;
        }
        
        stopCamera();
    }
}

// Analyze video (extract frames)
async function analyzeVideo(videoBlob) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = '<div class="spinner"></div><p>Analyzing video...</p>';
    
    // For live pantry analysis, we'll extract frames and analyze
    const useCase = document.getElementById('useCaseSelect').value;
    
    if (useCase === 'pantry-live') {
        try {
            // Extract key frames from video (start, middle, end)
            const frames = await extractVideoFrames(videoBlob, 3);
            
            // Analyze each frame
            const analyses = [];
            for (const frame of frames) {
                const result = await callClaudeVision(frame, getAnalysisPrompt('pantry'));
                analyses.push(result);
            }
            
            // Combine results
            const combinedItems = [];
            analyses.forEach(analysis => {
                if (analysis.items) {
                    analysis.items.forEach(item => {
                        if (!combinedItems.find(i => i.name === item.name)) {
                            combinedItems.push(item);
                        }
                    });
                }
            });
            
            displayScanResult({ items: combinedItems }, 'pantry');
            
        } catch (error) {
            console.error('Video analysis error:', error);
            resultDiv.innerHTML = `
                <div style="color: var(--danger); padding: 20px; text-align: center;">
                    <p>⚠️ Error analyzing video</p>
                    <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                </div>
            `;
        }
    } else {
        resultDiv.innerHTML = `
            <div style="color: var(--warning); padding: 20px; text-align: center;">
                <p>📹 Video recorded (${recordingSeconds}s)</p>
                <p style="font-size: 14px; margin-top: 10px;">Video analysis is only supported for live pantry scanning.</p>
            </div>
        `;
    }
}

// Extract frames from video
async function extractVideoFrames(videoBlob, numFrames = 3) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const frames = [];
        
        video.src = URL.createObjectURL(videoBlob);
        
        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const duration = video.duration;
            const interval = duration / (numFrames + 1);
            let currentFrame = 0;
            
            const captureFrame = () => {
                if (currentFrame >= numFrames) {
                    URL.revokeObjectURL(video.src);
                    resolve(frames);
                    return;
                }
                
                const time = interval * (currentFrame + 1);
                video.currentTime = time;
            };
            
            video.onseeked = () => {
                ctx.drawImage(video, 0, 0);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                frames.push(dataUrl.split(',')[1]); // Get base64 data
                
                currentFrame++;
                captureFrame();
            };
            
            captureFrame();
        };
        
        video.onerror = () => reject(new Error('Failed to load video'));
    });
}

// Handle file upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const resultDiv = document.getElementById('scanResult');
    const useCaseSelector = document.getElementById('useCaseSelector');
    const container = document.getElementById('cameraContainer');
    const image = document.getElementById('scanImage');
    const video = document.getElementById('scanVideo');
    
    // Check if file is video or image
    if (file.type.startsWith('video/')) {
        // Handle video file
        resultDiv.innerHTML = '<div class="spinner"></div><p>Processing video...</p>';
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const videoBlob = new Blob([e.target.result], { type: file.type });
                await analyzeVideo(videoBlob);
            } catch (error) {
                console.error('Video upload error:', error);
                resultDiv.innerHTML = `
                    <div style="color: var(--danger); padding: 20px; text-align: center;">
                        <p>⚠️ Error processing video</p>
                        <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                    </div>
                `;
            }
        };
        reader.readAsArrayBuffer(file);
        
    } else if (file.type.startsWith('image/')) {
        // Handle image file
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const dataUrl = e.target.result;
                image.src = dataUrl;
                image.style.display = 'block';
                video.style.display = 'none';
                container.style.display = 'block';
                document.querySelector('.upload-options').style.display = 'none';
                useCaseSelector.style.display = 'block';
                
                // Analyze the image
                analyzeImage(dataUrl);
            } catch (error) {
                console.error('Image upload error:', error);
                resultDiv.innerHTML = `
                    <div style="color: var(--danger); padding: 20px; text-align: center;">
                        <p>⚠️ Error loading image</p>
                        <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                        <p style="font-size: 12px; margin-top: 5px;">Try taking a photo with the camera instead.</p>
                    </div>
                `;
            }
        };
        reader.onerror = function(error) {
            console.error('FileReader error:', error);
            resultDiv.innerHTML = `
                <div style="color: var(--danger); padding: 20px; text-align: center;">
                    <p>⚠️ Failed to read file</p>
                    <p style="font-size: 14px; margin-top: 10px;">Please try using the camera instead.</p>
                </div>
            `;
        };
        reader.readAsDataURL(file);
        
    } else {
        resultDiv.innerHTML = `
            <div style="color: var(--warning); padding: 20px; text-align: center;">
                <p>⚠️ Unsupported file type</p>
                <p style="font-size: 14px; margin-top: 10px;">Please upload an image or video file.</p>
            </div>
        `;
    }
}

// Analyze image with Claude API
async function analyzeImage(imageDataUrl) {
    const useCase = document.getElementById('useCaseSelect').value;
    currentScanType = useCase;
    
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = '<div class="spinner"></div><p>Analyzing image with AI...</p>';
    
    // Convert data URL to base64 (remove data:image/jpeg;base64, prefix)
    const base64Data = imageDataUrl.split(',')[1];
    
    try {
        const prompt = getAnalysisPrompt(useCase);
        const response = await callClaudeVision(base64Data, prompt);
        
        displayScanResult(response, useCase);
        
    } catch (error) {
        console.error('Analysis error:', error);
        resultDiv.innerHTML = `
            <div style="color: var(--danger); padding: 20px; text-align: center;">
                <p>⚠️ Error analyzing image</p>
                <p style="font-size: 14px; margin-top: 10px;">${error.message}</p>
                ${error.message.includes('API key') ? '<p style="font-size: 12px; margin-top: 10px;">Add your Claude API key in app.js (line ~10)</p>' : ''}
            </div>
        `;
    }
}

// Get analysis prompt based on scan type
function getAnalysisPrompt(useCase) {
    const prompts = {
        barcode: `Analyze this image and extract:
1. Any barcodes or product codes visible
2. Product name and brand
3. Nutritional information (calories, protein, carbs, fat, sugar, saturated fat)
4. Serving size
5. Calculate SmartPoints using: Points = (Calories × 0.0305) + (SatFat × 0.275) + (Sugar × 0.12) - (Protein × 0.098)

Respond in JSON format:
{
  "productName": "...",
  "brand": "...",
  "servingSize": "...",
  "nutrition": {
    "calories": 0,
    "protein": 0,
    "carbs": 0,
    "fat": 0,
    "saturatedFat": 0,
    "sugar": 0
  },
  "smartPoints": 0
}`,

        grocery: `Analyze this grocery receipt and extract:
1. Store name
2. Date
3. All food items purchased
4. Total amount spent

Respond in JSON format:
{
  "store": "...",
  "date": "...",
  "items": ["item1", "item2"],
  "total": 0.00
}`,

        restaurant: `Analyze this restaurant receipt and extract:
1. Restaurant name
2. Date
3. Individual menu items with prices
4. Estimate SmartPoints for each item (typical points: appetizers 5-10, entrees 10-20, desserts 8-15)
5. Total bill

Respond in JSON format:
{
  "restaurant": "...",
  "date": "...",
  "items": [
    {"name": "...", "price": 0.00, "estimatedPoints": 0}
  ],
  "total": 0.00
}`,

        pantry: `Analyze this photo of pantry/fridge items and list:
1. All visible food items
2. Estimate freshness/expiry status if visible
3. Categorize items (produce, dairy, meat, pantry staples, etc.)

Respond in JSON format:
{
  "items": [
    {"name": "...", "category": "...", "quantity": "..."}
  ]
}`,

        medication: `Analyze this medication label and extract:
1. Medication name
2. Dosage (mg, ml, etc.)
3. Instructions (frequency, timing)
4. Warnings or special instructions

Respond in JSON format:
{
  "name": "...",
  "dosage": "...",
  "instructions": "...",
  "timing": ["morning", "afternoon", "evening"]
}`
    };
    
    return prompts[useCase] || prompts.barcode;
}

// Call Claude Vision API
async function callClaudeVision(base64Image, prompt) {
    // Check if API key is configured (if not using proxy)
    if (!USE_PROXY && (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE')) {
        throw new Error('Claude API key not configured. Add your API key in app.js or set up Cloudflare Worker proxy.');
    }
    
    const requestBody = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [
            {
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: {
                            type: 'base64',
                            media_type: 'image/jpeg',
                            data: base64Image
                        }
                    },
                    {
                        type: 'text',
                        text: prompt
                    }
                ]
            }
        ]
    };
    
    let response;
    
    if (USE_PROXY) {
        response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
    } else {
        response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(requestBody)
        });
    }
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'API request failed');
    }
    
    const data = await response.json();
    const text = data.content[0].text;
    
    // Try to parse JSON response
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (e) {
        console.error('JSON parse error:', e);
    }
    
    return { rawText: text };
}

// Display scan results
async function displayScanResult(result, useCase) {
    const resultDiv = document.getElementById('scanResult');
    
    switch (useCase) {
        case 'barcode':
            resultDiv.innerHTML = `
                <div class="card" style="margin-top: 15px;">
                    <h3>${result.productName || 'Unknown Product'}</h3>
                    ${result.brand ? `<p style="color: var(--text-secondary);">${result.brand}</p>` : ''}
                    <div style="margin: 15px 0;">
                        <div style="font-size: 32px; font-weight: bold; color: var(--primary);">
                            ${result.smartPoints || 0} pts
                        </div>
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            per ${result.servingSize || 'serving'}
                        </div>
                    </div>
                    ${result.nutrition ? `
                        <div style="font-size: 14px; color: var(--text-secondary);">
                            ${result.nutrition.calories} cal | ${result.nutrition.protein}g protein | 
                            ${result.nutrition.carbs}g carbs | ${result.nutrition.fat}g fat
                        </div>
                    ` : ''}
                    <button class="btn" style="margin-top: 15px;" onclick="logFoodFromScan(${JSON.stringify(result).replace(/"/g, '&quot;')})">
                        Log This Food
                    </button>
                </div>
            `;
            break;
            
        case 'grocery':
            resultDiv.innerHTML = `
                <div class="card" style="margin-top: 15px;">
                    <h3>🛒 ${result.store || 'Grocery Receipt'}</h3>
                    <p style="color: var(--text-secondary);">${result.date || 'Unknown date'}</p>
                    <div style="margin: 15px 0;">
                        <strong>Items Found:</strong>
                        <ul style="margin-top: 10px;">
                            ${(result.items || []).map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    </div>
                    <div style="font-size: 18px; font-weight: bold;">
                        Total: $${result.total?.toFixed(2) || '0.00'}
                    </div>
                    <button class="btn" style="margin-top: 15px;" onclick="savePantryItems(${JSON.stringify(result.items || []).replace(/"/g, '&quot;')})">
                        Save to Pantry
                    </button>
                </div>
            `;
            break;
            
        case 'restaurant':
            resultDiv.innerHTML = `
                <div class="card" style="margin-top: 15px;">
                    <h3>🍕 ${result.restaurant || 'Restaurant Receipt'}</h3>
                    <p style="color: var(--text-secondary);">${result.date || ''}</p>
                    <div style="margin: 15px 0;">
                        <strong>Select your item:</strong>
                        ${(result.items || []).map((item, idx) => `
                            <div style="padding: 10px; margin: 5px 0; background: var(--bg-light); border-radius: 8px; cursor: pointer;" onclick="selectRestaurantItem(${idx}, ${JSON.stringify(result).replace(/"/g, '&quot;')})">
                                <div style="display: flex; justify-content: space-between;">
                                    <span>${item.name}</span>
                                    <span>$${item.price?.toFixed(2)}</span>
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary);">
                                    ~${item.estimatedPoints} pts | $${(item.price / item.estimatedPoints).toFixed(2)}/pt
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="font-size: 18px; font-weight: bold;">
                        Total Bill: $${result.total?.toFixed(2) || '0.00'}
                    </div>
                </div>
            `;
            break;
            
        default:
            resultDiv.innerHTML = `
                <div class="card" style="margin-top: 15px;">
                    <pre style="white-space: pre-wrap;">${JSON.stringify(result, null, 2)}</pre>
                    <button class="btn btn-secondary" style="margin-top: 15px;" onclick="closeScan()">
                        Close
                    </button>
                </div>
            `;
    }
}

// Log food from barcode scan
async function logFoodFromScan(result) {
    const today = getTodayKey();
    await addFood({
        date: today,
        name: result.productName || 'Scanned Food',
        points: result.smartPoints || 0,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        source: 'barcode_scan',
        nutrition: result.nutrition
    });
    
    await updateAllUI();
    closeScan();
    alert(`✅ ${result.productName} logged! (${result.smartPoints} pts)`);
}

// Select restaurant item
async function selectRestaurantItem(index, receiptData) {
    const item = receiptData.items[index];
    const today = getTodayKey();
    
    await addFood({
        date: today,
        name: `🍕 ${item.name}`,
        points: item.estimatedPoints,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        source: 'restaurant_receipt',
        cost: item.price
    });
    
    await addStoreVisit({
        date: today,
        store: receiptData.restaurant,
        total: item.price,
        type: 'restaurant'
    });
    
    await updateAllUI();
    closeScan();
    
    const costPerPoint = (item.price / item.estimatedPoints).toFixed(2);
    alert(`✅ ${item.name} logged!\n\n${item.estimatedPoints} pts for $${item.price.toFixed(2)}\nCost per point: $${costPerPoint}`);
}

// Save pantry items
async function savePantryItems(items) {
    const today = getTodayKey();
    for (const item of items) {
        await addPantryItem({
            date: today,
            name: item
        });
    }
    alert(`✅ ${items.length} items saved to pantry!`);
    closeScan();
}

// Open quick scan
function openQuickScan(type) {
    const modal = document.getElementById('scanModal');
    const title = document.getElementById('scanTitle');
    const select = document.getElementById('useCaseSelect');
    
    const titles = {
        'food': 'Scan Food Barcode',
        'receipt': 'Scan Grocery Receipt',
        'cheat_receipt': 'Scan Restaurant Receipt',
        'pantry': 'Scan Pantry/Fridge',
        'medication': 'Scan Medication'
    };
    
    title.textContent = titles[type] || 'Scan';
    
    // Set use case
    const useCaseMap = {
        'food': 'barcode',
        'receipt': 'grocery',
        'cheat_receipt': 'restaurant',
        'pantry': 'pantry',
        'medication': 'medication'
    };
    
    select.value = useCaseMap[type] || 'barcode';
    currentScanType = useCaseMap[type];
    
    modal.classList.add('active');
}

// Close scan modal
function closeScan() {
    stopCamera();
    const modal = document.getElementById('scanModal');
    modal.classList.remove('active');
    
    // Reset UI
    document.getElementById('scanResult').innerHTML = '';
    document.getElementById('scanImage').style.display = 'none';
    document.getElementById('cameraContainer').style.display = 'none';
    document.querySelector('.upload-options').style.display = 'flex';
    document.getElementById('useCaseSelector').style.display = 'none';
    
    // Reset file input
    document.getElementById('fileUpload').value = '';
}
