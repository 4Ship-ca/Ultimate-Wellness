// ============ ULTIMATE WELLNESS APP v2.2.0 ============
// Multi-user support, seamless sessions, cloud-ready architecture
// NO SETUP WIZARD - Instant usability with progressive disclosure

const APP_VERSION = '2.2.0';
const APP_NAME = 'Ultimate Wellness';

// ============ GLOBAL STATE ============
let userSettings = null;
let currentTab = 'home';
let botMessages = [];

// ============ ZERO-POINT FOODS ============
let ZERO_POINT_FOODS = {};

// ============ INITIALIZATION ============

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`🚀 ${APP_NAME} v${APP_VERSION} initializing...`);
    
    try {
        // 1. Initialize database
        await initDB();
        console.log('✅ Database ready');
        
        // 2. Initialize authentication
        const authResult = await initAuth();
        console.log('✅ Authentication initialized');
        
        // 3. Check if login is needed
        if (authResult.needsLogin) {
            // Multiple users or not authenticated - show login screen
            document.getElementById('loading').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'flex';
            return; // Stop here, wait for login
        }
        
        // 4. User is authenticated - continue with app initialization
        await initializeAfterLogin();
        
    } catch (error) {
        console.error('💥 Initialization error:', error);
        alert('Failed to initialize app. Please refresh and try again.');
    }
});

/**
 * Initialize app after user is authenticated
 * Called either directly (auto-login) or after manual login
 */
async function initializeAfterLogin() {
    try {
        console.log('Continuing app initialization...');
        
        // 1. Track login (analytics)
        await trackUserLogin();
        console.log('✅ Login tracked');
        
        // 2. Load user settings
        const userId = getCurrentUserId();
        userSettings = await getSettings(userId);
        
        // 3. If no settings, create defaults
        if (!userSettings) {
            userSettings = await createDefaultSettings(userId);
            console.log('✅ Created default settings');
        }
        
        // 4. Load external data (zero-point foods, bot scenarios)
        await loadExternalData();
        console.log('✅ External data loaded');
        
        // 5. Initialize session management (daily reset, state restore)
        await initSession();
        console.log('✅ Session initialized');
        
        // 6. Initialize cloud sync system (preparation)
        await initSync();
        console.log('✅ Sync system ready');
        
        // 7. Check for scheduled emails
        if (window.checkScheduledEmails) {
            checkScheduledEmails();
        }
        
        // 8. Initialize UI
        initializeUI();
        console.log('✅ UI initialized');
        
        // 9. Load initial data
        await loadInitialData();
        console.log('✅ Initial data loaded');
        
        // 10. Show welcome tooltip (first time only)
        if (!userSettings.hasSeenWelcome) {
            showWelcomeTooltip();
        }
        
        // 11. Hide loading, show app
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        console.log('✅ App ready!');
        
    } catch (error) {
        console.error('💥 Post-login initialization error:', error);
        alert('Failed to load user data. Please try logging in again.');
    }
}

// Make initializeAfterLogin available globally for login form
window.initializeAfterLogin = initializeAfterLogin;

// ============ EXTERNAL DATA LOADING ============

async function loadExternalData() {
    await loadZeroPointFoods();
    await loadBotScenarios();
}

async function loadZeroPointFoods() {
    const url = localStorage.getItem('zeroPointFoodsURL');
    
    if (url) {
        try {
            const response = await fetch(url);
            ZERO_POINT_FOODS = await response.json();
            localStorage.setItem('zeroPointFoods', JSON.stringify(ZERO_POINT_FOODS));
            localStorage.setItem('zpfLastFetch', Date.now());
            console.log('✅ Zero-point foods loaded from external LUT');
            return;
        } catch (error) {
            console.warn('⚠️ External LUT failed, using cached data');
        }
    }
    
    const cached = localStorage.getItem('zeroPointFoods');
    if (cached) {
        ZERO_POINT_FOODS = JSON.parse(cached);
    } else {
        try {
            const response = await fetch('data/zero-point-foods.json');
            ZERO_POINT_FOODS = await response.json();
            localStorage.setItem('zeroPointFoods', JSON.stringify(ZERO_POINT_FOODS));
        } catch (error) {
            console.error('❌ Failed to load zero-point foods');
        }
    }
}

async function loadBotScenarios() {
    const url = localStorage.getItem('botScenariosURL');
    
    if (url) {
        try {
            const response = await fetch(url);
            const scenarios = await response.json();
            localStorage.setItem('botScenarios', JSON.stringify(scenarios));
            console.log('✅ Bot scenarios loaded from external LUT');
            return;
        } catch (error) {
            console.warn('⚠️ External bot scenarios failed, using cached');
        }
    }
    
    const cached = localStorage.getItem('botScenarios');
    if (!cached) {
        try {
            const response = await fetch('data/bot-scenarios.json');
            const scenarios = await response.json();
            localStorage.setItem('botScenarios', JSON.stringify(scenarios));
        } catch (error) {
            console.error('❌ Failed to load bot scenarios');
        }
    }
}

// ============ WELCOME TOOLTIP ============

function showWelcomeTooltip() {
    const tooltip = document.createElement('div');
    tooltip.className = 'welcome-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <h3>👋 Welcome to Ultimate Wellness!</h3>
            <p>Start logging your meals, exercise, and progress right away.</p>
            <p>Customize your profile in <strong>Settings</strong> when you're ready.</p>
            <button onclick="dismissWelcome()">Got it!</button>
        </div>
    `;
    
    document.body.appendChild(tooltip);
    
    setTimeout(dismissWelcome, 10000);
}

async function dismissWelcome() {
    const tooltip = document.querySelector('.welcome-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
    
    if (userSettings) {
        userSettings.hasSeenWelcome = true;
        await saveSettings(userSettings);
    }
}

window.dismissWelcome = dismissWelcome;

// ============ FOOD LOGGING ============

async function addFood(foodData) {
    const userId = getCurrentUserId();
    const today = getTodayKey(); // Uses logical day from session.js
    
    const isZero = isZeroPointFood(foodData.name);
    
    const entry = {
        userId,
        date: today,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        name: foodData.name,
        points: isZero ? 0 : foodData.points,
        source: foodData.source || 'manual',
        isZeroPoint: isZero
    };
    
    await dbPut('foods', entry);
    await refreshFoodLog();
    
    if (window.checkRecipeFollowUp) {
        await checkRecipeFollowUp(foodData.name);
    }
    
    console.log('✅ Food logged:', entry);
    return entry;
}

function isZeroPointFood(foodName) {
    if (!foodName || !ZERO_POINT_FOODS) return false;
    
    const normalized = foodName.toLowerCase();
    
    for (const category in ZERO_POINT_FOODS) {
        const foods = ZERO_POINT_FOODS[category];
        if (foods.some(f => normalized.includes(f.toLowerCase()))) {
            return true;
        }
    }
    
    return false;
}

// ============ EXERCISE LOGGING ============

async function addExercise(exerciseData) {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    
    const points = Math.floor(exerciseData.minutes / 15);
    
    const entry = {
        userId,
        date: today,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        type: exerciseData.type,
        minutes: exerciseData.minutes,
        points: points
    };
    
    await dbPut('exercise', entry);
    await refreshExerciseLog();
    await refreshStats();
    
    console.log('✅ Exercise logged:', entry);
    return entry;
}

// ============ WEIGHT LOGGING ============

async function logWeight(weight) {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    
    const entry = {
        userId,
        date: today,
        weight: weight,
        timestamp: new Date().toISOString()
    };
    
    await dbPut('weight_logs', entry);
    
    if (userSettings) {
        userSettings.currentWeight = weight;
        userSettings.lastWeighIn = today;
        await saveSettings(userSettings);
    }
    
    await checkSixWeekCheckpoint();
    
    if (window.checkWeightMilestones) {
        await checkWeightMilestones(weight);
    }
    
    await refreshStats();
    
    console.log('✅ Weight logged:', entry);
}

async function checkSixWeekCheckpoint() {
    if (!userSettings?.periodStartDate) return;
    
    const start = new Date(userSettings.periodStartDate);
    const today = new Date();
    const weeksDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24 * 7));
    
    if (weeksDiff === 6 && !userSettings.sixWeekCheckpointDone) {
        showSixWeekCheckpointModal();
    }
}

// ============ WATER LOGGING ============

async function addWater(drops = 1) {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    
    let water = await getWaterByDate(userId, today);
    
    if (!water || !water.id) {
        water = { userId, date: today, drops: 0, foodWater: 0 };
    }
    
    water.drops = (water.drops || 0) + drops;
    
    await dbPut('water', water);
    await refreshWaterDisplay();
    
    console.log('✅ Water logged:', water);
}

// ============ SLEEP LOGGING ============

async function logSleep(sleepData) {
    const userId = getCurrentUserId();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = yesterday.toISOString().split('T')[0];
    
    const entry = {
        userId,
        date: date,
        sleepTime: sleepData.sleepTime,
        wakeTime: sleepData.wakeTime,
        hoursSlept: sleepData.hoursSlept,
        quality: sleepData.quality,
        scenario: sleepData.scenario
    };
    
    await dbPut('sleep', entry);
    await refreshSleepLog();
    
    console.log('✅ Sleep logged:', entry);
}

// ============ POINTS CALCULATION ============

async function calculateTodayPoints() {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    
    const foods = await getFoodsByDate(userId, today);
    const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
    
    const bonusPoints = await getBonusPoints(userId);
    
    const available = (userSettings?.dailyPoints || 23) + bonusPoints - foodPoints;
    
    return {
        used: foodPoints,
        earned: bonusPoints,
        available: available,
        daily: userSettings?.dailyPoints || 23
    };
}

// ============ UI HELPERS ============

// ============ UI FUNCTIONS ============

function initializeUI() {
    console.log('Initializing UI...');
    // UI is now in HTML, just need to set up event handlers
    refreshStats();
    refreshFoodLog();
    refreshExerciseLog();
    refreshWaterCount();
}

// Tab Switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.background = '#2d2d2d';
        btn.classList.remove('active');
    });
    
    // Show selected tab
    const tab = document.getElementById(tabName + 'Tab');
    if (tab) tab.style.display = 'block';
    
    // Highlight active button
    event.target.style.background = '#4CAF50';
    event.target.classList.add('active');
}

// Food Functions
async function addFood() {
    const name = document.getElementById('foodInput').value;
    const points = parseInt(document.getElementById('pointsInput').value) || 0;
    
    if (!name) {
        alert('Please enter food name');
        return;
    }
    
    const userId = getCurrentUserId();
    const now = new Date();
    
    const food = {
        userId: userId,
        name: name,
        points: points,
        date: getTodayKey(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.toISOString(),
        isZeroPoint: points === 0
    };
    
    await dbPut('food_logs', food);
    
    // Clear inputs
    document.getElementById('foodInput').value = '';
    document.getElementById('pointsInput').value = '';
    
    // Refresh
    await refreshStats();
    await refreshFoodLog();
}

// Exercise Functions
async function addExercise() {
    const name = document.getElementById('exerciseInput').value;
    const duration = parseInt(document.getElementById('durationInput').value) || 0;
    
    if (!name || !duration) {
        alert('Please enter exercise and duration');
        return;
    }
    
    const userId = getCurrentUserId();
    const now = new Date();
    const pointsEarned = Math.floor(duration / 30); // 1 point per 30 min
    
    const exercise = {
        userId: userId,
        name: name,
        duration: duration,
        pointsEarned: pointsEarned,
        date: getTodayKey(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.toISOString()
    };
    
    await dbPut('exercise_logs', exercise);
    
    // Clear inputs
    document.getElementById('exerciseInput').value = '';
    document.getElementById('durationInput').value = '';
    
    // Refresh
    await refreshStats();
    await refreshExerciseLog();
}

// Water Functions
async function addWater() {
    const userId = getCurrentUserId();
    const now = new Date();
    
    const water = {
        userId: userId,
        date: getTodayKey(),
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
    
    await dbPut('water_logs', water);
    await refreshWaterCount();
}

async function refreshWaterCount() {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    const waters = await dbGetByIndex('water_logs', 'date', today);
    const count = waters.filter(w => w.userId === userId).length;
    
    const el = document.getElementById('waterCount');
    if (el) el.textContent = count;
}

// Sleep Functions
async function logSleep() {
    const hours = parseFloat(document.getElementById('sleepInput').value);
    
    if (!hours || hours < 0 || hours > 24) {
        alert('Please enter valid sleep hours (0-24)');
        return;
    }
    
    const userId = getCurrentUserId();
    const now = new Date();
    
    const sleep = {
        userId: userId,
        hours: hours,
        date: getTodayKey(),
        timestamp: now.toISOString()
    };
    
    await dbPut('sleep_logs', sleep);
    
    // Clear input
    document.getElementById('sleepInput').value = '';
    
    alert(`Logged ${hours} hours of sleep!`);
}

// Export functions
window.switchTab = switchTab;
window.addFood = addFood;
window.addExercise = addExercise;
window.addWater = addWater;
window.logSleep = logSleep;

async function refreshStats() {
    const points = await calculateTodayPoints();
    
    const pointsUsedEl = document.getElementById('pointsUsed');
    const pointsEarnedEl = document.getElementById('pointsEarned');
    const pointsAvailableEl = document.getElementById('pointsAvailable');
    
    if (pointsUsedEl) pointsUsedEl.textContent = points.used;
    if (pointsEarnedEl) pointsEarnedEl.textContent = points.earned;
    if (pointsAvailableEl) pointsAvailableEl.textContent = points.available;
}

async function refreshFoodLog() {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    const foods = await getFoodsByDate(userId, today);
    
    const container = document.getElementById('foodLog');
    if (container) {
        container.innerHTML = foods.map(f => `
            <div class="food-entry">
                <span class="food-time">${f.time}</span>
                <span class="food-name">${f.name}</span>
                ${f.isZeroPoint ? '<span class="badge zero">Zero</span>' : ''}
                <span class="food-points">${f.points} pts</span>
            </div>
        `).join('');
    }
}

async function refreshExerciseLog() {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    const exercise = await getExerciseByDate(userId, today);
    
    const container = document.getElementById('exerciseLog');
    if (container) {
        container.innerHTML = exercise.map(e => `
            <div class="exercise-entry">
                <span class="exercise-type">${e.type}</span>
                <span class="exercise-duration">${e.minutes} min</span>
                <span class="exercise-points">+${e.points} pts</span>
            </div>
        `).join('');
    }
}

async function refreshWaterDisplay() {
    const userId = getCurrentUserId();
    const today = getTodayKey();
    const water = await getWaterByDate(userId, today);
    
    const totalMl = (water.drops * 250) + (water.foodWater || 0);
    const percent = Math.round((totalMl / 2000) * 100);
    
    const percentEl = document.getElementById('waterPercent');
    const dropsEl = document.getElementById('waterDrops');
    
    if (percentEl) percentEl.textContent = percent + '%';
    if (dropsEl) dropsEl.textContent = water.drops;
}

async function refreshSleepLog() {
    // Implementation for sleep log refresh
}

function switchToTab(tabName) {
    currentTab = tabName;
    
    // Hide all tabs
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.style.display = 'none');
    
    // Show selected tab
    const selectedTab = document.getElementById(tabName + 'Tab');
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Update nav
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNav = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeNav) {
        activeNav.classList.add('active');
    }
}

// ============ REGISTRATION SCREEN ============

function showRegisterScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const container = loginScreen.querySelector('.login-container');
    
    container.innerHTML = `
        <div class="login-logo">
            <h1>🌟 Create Account</h1>
            <p>Join Ultimate Wellness</p>
        </div>
        
        <div class="login-error" id="registerError"></div>
        
        <form class="login-form" id="registerForm">
            <div class="form-group">
                <label for="registerUsername">Username</label>
                <input type="text" id="registerUsername" required autofocus>
                <small>3-20 characters, letters and numbers only</small>
            </div>
            
            <div class="form-group">
                <label for="registerPassword">Password</label>
                <input type="password" id="registerPassword" required>
                <small>Minimum 6 characters</small>
            </div>
            
            <div class="form-group">
                <label for="registerPasswordConfirm">Confirm Password</label>
                <input type="password" id="registerPasswordConfirm" required>
            </div>
            
            <div class="form-group">
                <label for="registerName">Display Name (optional)</label>
                <input type="text" id="registerName">
            </div>
            
            <button type="submit" class="login-button" id="registerButton">
                Create Account
            </button>
        </form>
        
        <div class="login-footer">
            <p>Already have an account? <a href="#" id="backToLoginLink">Sign in</a></p>
        </div>
    `;
    
    document.getElementById('registerForm').addEventListener('submit', handleRegistration);
    document.getElementById('backToLoginLink').addEventListener('click', (e) => {
        e.preventDefault();
        location.reload();
    });
}

async function handleRegistration(e) {
    e.preventDefault();
    
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const name = document.getElementById('registerName').value || username;
    
    const errorEl = document.getElementById('registerError');
    const button = document.getElementById('registerButton');
    
    button.disabled = true;
    button.textContent = 'Creating account...';
    errorEl.classList.remove('show');
    
    if (password !== passwordConfirm) {
        errorEl.textContent = 'Passwords do not match';
        errorEl.classList.add('show');
        button.disabled = false;
        button.textContent = 'Create Account';
        return;
    }
    
    try {
        const userId = await registerUser(username, password, { name });
        
        await loginUser(username, password);
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        
        await initializeAfterLogin();
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.classList.add('show');
        button.disabled = false;
        button.textContent = 'Create Account';
    }
}

window.showRegisterScreen = showRegisterScreen;

// ============ UTILITIES ============

async function loadInitialData() {
    await refreshStats();
    await refreshFoodLog();
    await refreshExerciseLog();
    await refreshWaterDisplay();
}

async function refreshAllData() {
    await loadInitialData();
}

window.refreshAllData = refreshAllData;

// ============ LOGOUT ============

async function performLogout() {
    if (confirm('Are you sure you want to log out?')) {
        logoutUser();
        location.reload();
    }
}

window.performLogout = performLogout;

// ============ EXPORT GLOBALS ============
window.userSettings = userSettings;
window.ZERO_POINT_FOODS = ZERO_POINT_FOODS;
window.currentTab = currentTab;

window.addFood = addFood;
window.addExercise = addExercise;
window.addWater = addWater;
window.logWeight = logWeight;
window.logSleep = logSleep;
window.switchToTab = switchToTab;
window.refreshStats = refreshStats;

console.log('✅ App v2.2.0 loaded - Multi-user, seamless sessions, cloud-ready');
