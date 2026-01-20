// ============ ULTIMATE WELLNESS v2.2.2 - CORS-SAFE ============
// v1.9.6 Beautiful UI + v2.2 Powerful Backend + CORS-Safe Barcode
// Hybrid Build - All Errors Fixed + CORS Barcode Fix
// 
// CHANGES in v2.2.2:
// - Updated OpenFoodFacts API to v2 for better data quality
// - Enhanced nutrition parsing with per-serving calculations
// - Auto-cache verified products for instant repeat scans
// - Added sodium tracking to nutrition data
// - Improved points calculation accuracy

const APP_VERSION = '2.2.3';
const APP_NAME = 'Ultimate Wellness';

// Hydrating foods - water content in ml per typical serving
const HYDRATING_FOODS = {
    'watermelon': 250,
    'cucumber': 200,
    'celery': 180,
    'tomato': 150,
    'lettuce': 150,
    'strawberries': 120,
    'cantaloupe': 200,
    'peaches': 140,
    'oranges': 150,
    'grapefruit': 180,
    'milk': 240,
    'yogurt': 200,
    'soup': 300,
    'broth': 300,
    'smoothie': 250,
    'juice': 240
};

// ============================================================================
// BULLETPROOF AUTHENTICATION & SESSION SYSTEM
// ============================================================================

let currentUser = null;
let sessionState = {
    lastActiveTab: 'home',
    lastActiveDate: null,
    scrollPositions: {},
    formData: {},
    initialized: false
};

// Initialize auth system
async function initAuthSystem() {
    console.log('🔐 Initializing authentication system...');
    
    try {
        const allUsers = await dbGetAll('users');
        console.log(`📊 Found ${allUsers.length} user(s) in database`);
        
        const lastUserId = localStorage.getItem('currentUserId');
        
        if (allUsers.length === 0) {
            console.log('👤 No users found - showing setup screen');
            return { action: 'SETUP', user: null };
        }
        
        if (allUsers.length === 1) {
            const user = allUsers[0];
            console.log(`✅ Single user found: ${user.username} - auto login`);
            await loginUser(user.id);
            return { action: 'AUTO_LOGIN', user: user };
        }
        
        if (lastUserId) {
            const lastUser = allUsers.find(u => u.id === lastUserId);
            if (lastUser) {
                console.log(`✅ Last user found: ${lastUser.username} - auto login`);
                await loginUser(lastUser.id);
                return { action: 'AUTO_LOGIN', user: lastUser };
            }
        }
        
        console.log('👥 Multiple users - showing selection screen');
        return { action: 'SELECT_USER', users: allUsers };
        
    } catch (error) {
        console.error('❌ Auth system initialization error:', error);
        return { action: 'ERROR', error: error.message };
    }
}

// Login user
async function loginUser(userId) {
    console.log(`🔓 Logging in user: ${userId}`);
    
    try {
        localStorage.setItem('currentUserId', userId);
        
        const user = await dbGet('users', userId);
        if (!user) throw new Error('User not found in database');
        
        currentUser = user;
        
        const settings = await dbGet('settings', `user_${userId}`);
        if (settings) {
            window.userSettings = settings;
            await initAPIConfig();
            console.log('✅ User settings and API config loaded');
        }
        
        await restoreSession(userId);
        console.log('✅ User logged in successfully');
        return true;
        
    } catch (error) {
        console.error('❌ Login error:', error);
        return false;
    }
}

// Register new user
async function registerUser(userData) {
    console.log('📝 Registering new user...');
    
    try {
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const user = {
            id: userId,
            username: userData.name,
            email: userData.email,
            created: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        
        await dbPut('users', user);
        console.log('✅ User record created');
        
        const age = calculateAge(userData.birthday);
        const heightInInches = (userData.heightFeet * 12) + (userData.heightInches || 0);
        const pointsResult = calculateDailyPoints(userData.gender, age, userData.currentWeight, heightInInches, userData.activity);
        
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 84);
        
        const settings = {
            id: `user_${userId}`,
            userId: userId,
            name: userData.name,
            email: userData.email,
            birthday: userData.birthday,
            gender: userData.gender,
            currentWeight: userData.currentWeight,
            goalWeight: userData.goalWeight,
            heightInInches: heightInInches,
            heightFeet: userData.heightFeet,
            heightInches: userData.heightInches || 0,
            activity: userData.activity,
            dailyPoints: pointsResult.points,
            lockedPoints: pointsResult.points,
            pointsPeriodStart: today,
            pointsPeriodEnd: endDate.toISOString().split('T')[0],
            lastPointsUpdate: today,
            lastWeighIn: today,
            joinDate: today,
            resetTime: '04:00',
            proxyUrl: '',
            useProxy: false,
            appVersion: APP_VERSION
        };
        
        await dbPut('settings', settings);
        console.log('✅ Settings created');
        
        await loginUser(userId);
        
        console.log('✅ User registered and logged in');
        return { success: true, userId: userId };
        
    } catch (error) {
        console.error('❌ Registration error:', error);
        return { success: false, error: error.message };
    }
}

// Save session
async function saveSession() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            console.log('💾 Session save skipped - no user logged in');
            return;
        }
        
        const session = {
            id: `session_${userId}`,
            userId: userId,
            lastActiveTab: sessionState.lastActiveTab || 'home',
            lastActiveDate: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            scrollPositions: sessionState.scrollPositions || {},
            formData: sessionState.formData || {}
        };
        
        await dbPut('settings', session);
        
        const time = new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        console.log(`💾 Session saved at ${time} - Tab: ${session.lastActiveTab}`);
        
        // Show visual indicator
        showAutoSaveIndicator();
        
    } catch (error) {
        console.error('❌ Session save error:', error);
    }
}

// Show visual auto-save indicator
function showAutoSaveIndicator() {
    // Find or create indicator
    let indicator = document.getElementById('autoSaveIndicator');
    
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'autoSaveIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success);
            color: white;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        `;
        indicator.innerHTML = '💾 Saved';
        document.body.appendChild(indicator);
    }
    
    // Fade in
    indicator.style.opacity = '1';
    
    // Fade out after 2 seconds
    setTimeout(() => {
        indicator.style.opacity = '0';
    }, 2000);
}

// Restore session
async function restoreSession(userId) {
    try {
        const session = await dbGet('settings', `session_${userId}`);
        
        if (session) {
            sessionState = {
                lastActiveTab: session.lastActiveTab || 'home',
                lastActiveDate: session.lastActiveDate,
                scrollPositions: session.scrollPositions || {},
                formData: session.formData || {},
                initialized: true
            };
            
            console.log(`✅ Session restored - last active: ${session.lastActiveDate}, tab: ${session.lastActiveTab}`);
            
            const today = new Date().toISOString().split('T')[0];
            if (session.lastActiveDate !== today && userSettings) {
                console.log('📅 New day detected - checking reset time');
                await handleDailyReset(userSettings);
            }
            
            return sessionState;
        }
        
        console.log('ℹ️ No previous session found');
        return null;
        
    } catch (error) {
        console.error('Session restore error:', error);
        return null;
    }
}

// Handle daily reset
async function handleDailyReset(settings) {
    try {
        const now = new Date();
        const resetTime = settings.resetTime || '04:00';
        const [resetHour, resetMinute] = resetTime.split(':').map(Number);
        
        const today = new Date().toISOString().split('T')[0];
        const lastReset = localStorage.getItem('lastReset');
        
        if (lastReset === today) {
            console.log('✅ Daily reset already completed today');
            return;
        }
        
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        const resetMinutes = resetHour * 60 + resetMinute;
        
        if (currentMinutes >= resetMinutes) {
            console.log(`🔄 Performing daily reset (${resetTime})`);
            localStorage.setItem('lastReset', today);
            console.log('✅ Daily reset completed');
        }
        
    } catch (error) {
        console.error('Daily reset error:', error);
    }
}

// Update session state
function updateSessionState(updates) {
    sessionState = { ...sessionState, ...updates };
    saveSession();
}

// API Configuration (for AI features)
// These can be overridden by user settings
let USE_PROXY = false; // Set to true if using Cloudflare Worker proxy
let PROXY_URL = ''; // Your Cloudflare Worker URL (if USE_PROXY is true)
let CLAUDE_API_KEY = ''; // Your Claude API key (if USE_PROXY is false)

// Initialize API config from dedicated storage (new bulletproof system)
async function initAPIConfig() {
    console.log('🔍 [API CONFIG] initAPIConfig called - HARDCODED URL ENABLED');

    // Hardcode the Cloudflare Worker URL and always enable AI features
    PROXY_URL = 'https://ultimate-wellness.your4ship.workers.dev/';
    USE_PROXY = true;

    // Save hardcoded values to storage for consistency
    await saveAPIConfigToStorage(PROXY_URL, USE_PROXY);

    console.log('✅ [API CONFIG] Initialization complete with hardcoded values:', {
        proxyUrl: PROXY_URL,
        useProxy: USE_PROXY,
        source: 'hardcoded'
    });
}

// Update API config (called when settings change)
function updateAPIConfig(proxyUrl, useProxy) {
    // Always use hardcoded values, ignore parameters
    PROXY_URL = 'https://ultimate-wellness.your4ship.workers.dev/';
    USE_PROXY = true;
    console.log('🔌 API Config updated with hardcoded values:', {
        proxyUrl: PROXY_URL,
        useProxy: USE_PROXY
    });
}

// ============ DEDICATED API CONFIGURATION STORAGE ============
// Bulletproof API config persistence using both localStorage and IndexedDB

const API_CONFIG_KEY = 'ultimate_wellness_api_config';
const API_CONFIG_DB_KEY = 'api_config_v1';

// Load API configuration from persistent storage
async function loadAPIConfigFromStorage() {
    try {
        console.log('🔍 Loading API config (hardcoded)...');

        // Always use hardcoded values
        const hardcodedConfig = {
            proxyUrl: 'https://ultimate-wellness.your4ship.workers.dev/',
            useProxy: true
        };

        // Update global variables
        PROXY_URL = hardcodedConfig.proxyUrl;
        USE_PROXY = hardcodedConfig.useProxy;

        console.log('✅ API config loaded with hardcoded values:', hardcodedConfig);
        return hardcodedConfig;

    } catch (error) {
        console.error('❌ Error loading API config:', error);
        // Even on error, return hardcoded values
        return {
            proxyUrl: 'https://ultimate-wellness.your4ship.workers.dev/',
            useProxy: true
        };
    }
}

// Save API configuration to persistent storage
async function saveAPIConfigToStorage(proxyUrl, useProxy) {
    try {
        // Always use hardcoded values, ignore parameters
        const config = {
            proxyUrl: 'https://ultimate-wellness.your4ship.workers.dev/',
            useProxy: true,
            lastModified: new Date().toISOString()
        };

        console.log('💾 Saving hardcoded API config to storage:', config);

        // Save to localStorage (instant, synchronous backup)
        localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
        console.log('✅ Hardcoded API config saved to localStorage');

        // Save to IndexedDB (more reliable, persists better)
        const dbRecord = {
            id: API_CONFIG_DB_KEY,
            config: config,
            timestamp: new Date().toISOString()
        };

        await dbPut('settings', dbRecord);
        console.log('✅ Hardcoded API config saved to IndexedDB');

        // Update global variables with hardcoded values
        PROXY_URL = config.proxyUrl;
        USE_PROXY = config.useProxy;

        // Also update userSettings if it exists (for backward compatibility)
        if (window.userSettings) {
            window.userSettings.proxyUrl = config.proxyUrl;
            window.userSettings.useProxy = config.useProxy;

            // Save userSettings back to DB
            const userId = getCurrentUserId();
            if (userId) {
                try {
                    await dbPut('settings', window.userSettings);
                    console.log('✅ Hardcoded API config also synced to userSettings');
                } catch (syncError) {
                    console.warn('⚠️ Failed to sync to userSettings:', syncError);
                }
            }
        }

        return true;

    } catch (error) {
        console.error('❌ Error saving API config:', error);
        return false;
    }
}

// Exercise types for tracking
const EXERCISES = [
    'Walking',
    'Running',
    'Cycling',
    'Swimming',
    'Yoga',
    'Strength Training',
    'Sports',
    'Dancing',
    'Hiking',
    'Other Cardio'
];

let appReady = false;

// ============ INITIALIZATION WRAPPER ============
// Proper sequencing to prevent race conditions

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`🚀 ${APP_NAME} v${APP_VERSION} initializing...`);
    
    try {
        // STEP 1: Initialize Database
        await initDB();
        console.log('✅ Database ready');
        
        // STEP 2: Initialize Auth System
        const authResult = await initAuthSystem();
        console.log('✅ Auth system initialized');
        
        // STEP 3: Handle auth result
        const loading = document.getElementById('loading');
        const setupScreen = document.getElementById('setupScreen');
        const container = document.querySelector('.container');
        
        if (authResult.action === 'SETUP') {
            // New user - show setup
            console.log('👋 New user - showing setup screen');
            if (loading) loading.style.display = 'none';
            if (setupScreen) setupScreen.classList.add('active');
            if (container) container.style.display = 'none';
            
        } else if (authResult.action === 'AUTO_LOGIN') {
            // User logged in - continue initialization
            console.log(`✅ User logged in: ${authResult.user.username}`);
            if (loading) loading.style.display = 'none';
            if (setupScreen) setupScreen.classList.remove('active');
            if (container) container.style.display = 'block';
            
            // Continue initialization
            await initializeAfterLogin();
            
        } else if (authResult.action === 'SELECT_USER') {
            // Multiple users - show selection (future feature)
            console.log('👥 Multiple users - showing selection');
            // TODO: Show user selection UI
            if (loading) loading.style.display = 'none';
            alert('Multiple users detected. Please contact support.');
            
        } else if (authResult.action === 'ERROR') {
            console.error('❌ Auth error:', authResult.error);
            if (loading) loading.style.display = 'none';
            alert(`❌ Initialization failed: ${authResult.error}\n\nPlease refresh and try again.`);
        }
        
    } catch (error) {
        console.error('💥 Init error:', error);
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
        alert(`❌ App failed to initialize: ${error.message}\n\nPlease refresh and try again.`);
    }
});

// Continue initialization after login
async function initializeAfterLogin() {
    try {
        console.log('Continuing app initialization...');
        
        // CRITICAL FIX: Load userSettings first!
        const userId = getCurrentUserId();
        if (!userId) {
            throw new Error('No user ID found');
        }
        
        // Load settings from database
        const settings = await dbGet('settings', `user_${userId}`);
        if (!settings) {
            throw new Error('User settings not found in database');
        }
        
        // Set global userSettings
        window.userSettings = settings;
        console.log('✅ userSettings loaded:', settings.name);

        // Initialize API configuration from dedicated storage
        await initAPIConfig();
        console.log('✅ API configuration loaded');

        // Track login
        if (typeof trackUserLogin === 'function') {
            await trackUserLogin();
            console.log('✅ Login tracked');
        }
        
        // Load external data
        if (typeof loadExternalData === 'function') {
            await loadExternalData();
            console.log('✅ External data loaded');
        }
        
        // Init session
        if (typeof initSession === 'function') {
            await initSession();
            console.log('✅ Session initialized');
        }
        
        // Init sync
        if (typeof initSync === 'function') {
            await initSync();
            console.log('✅ Sync system ready');
        }
        
        // Initialize UI AFTER userSettings loaded
        await updateAllUI();
        
        // Ensure sessionState is initialized (even if no previous session)
        if (!sessionState.initialized) {
            sessionState = {
                lastActiveTab: 'home',
                lastActiveDate: new Date().toISOString().split('T')[0],
                scrollPositions: {},
                formData: {},
                initialized: true
            };
            console.log('✅ Session state initialized (new user)');
        }
        
        // Restore session tab
        if (sessionState.initialized && sessionState.lastActiveTab) {
            console.log(`📂 Restoring session - tab: ${sessionState.lastActiveTab}`);
            switchTab(sessionState.lastActiveTab);
        } else {
            switchTab('home');
        }
        
        // Mark ready
        appReady = true;
        console.log('🎉 App ready!');
        console.log('⏰ Auto-save active: Session saves every 30 seconds');
        
    } catch (error) {
        console.error('💥 Post-login error:', error);
        alert(`Failed to load data: ${error.message}`);
    }
}

// Export globals
window.initializeAfterLogin = initializeAfterLogin;
window.appReady = () => appReady;


// ============ DOM SAFETY HELPERS ============

function safeSetText(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = text;
}

function safeSetHTML(elementId, html) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = html;
}

function safeSetValue(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.value = value;
}


// ============ MISSING HELPER FUNCTIONS ============

async function getIncompleteSleepSession() {
    try {
        const userId = getCurrentUserId();

        // First, try to get from localStorage (fast check)
        if (typeof getPersistedOpenSleepSession === 'function') {
            const persisted = getPersistedOpenSleepSession();
            if (persisted) {
                // Verify it still exists in DB
                const dbSession = await dbGet('sleep', persisted.id);
                if (dbSession && !dbSession.end_datetime) {
                    return dbSession;
                }
            }
        }

        // Check recent days (sleep sessions can span multiple days)
        // Look back up to 3 days to catch any lingering open sessions
        const today = new Date();
        for (let i = 0; i < 3; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateKey = checkDate.toISOString().split('T')[0];

            const sleepLogs = await dbGetByUserAndDate('sleep', userId, dateKey);
            const incomplete = sleepLogs.find(log => log.start_datetime && !log.end_datetime);

            if (incomplete) {
                // Found an incomplete session - persist it to localStorage
                if (typeof persistOpenSleepSession === 'function') {
                    persistOpenSleepSession(incomplete);
                }
                return incomplete;
            }
        }

        return null;
    } catch (error) {
        console.warn('Error getting incomplete sleep session:', error);
        return null;
    }
}

async function getAllMedications() {
    try {
        const userId = getCurrentUserId();
        const meds = await dbGetAll('medications', userId);
        return meds || [];
    } catch (error) {
        console.warn('Error getting medications:', error);
        return [];
    }
}


async function getRecentSleepSessions(days = 7) {
    try {
        const userId = getCurrentUserId();
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const sessions = await dbGetByDateRange('sleep', userId, startDate, endDate);
        return sessions || [];
    } catch (error) {
        console.warn('Error getting recent sleep sessions:', error);
        return [];
    }
}

async function startSleepSession(startTime) {
    try {
        const userId = getCurrentUserId();
        const now = startTime ? new Date(startTime) : new Date();
        const date = getCurrentLogicalDay();

        const sleepSession = {
            id: `sleep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            date: date,
            start_datetime: now.toISOString(),
            timestamp: new Date().toISOString()
        };

        await dbPut('sleep', sleepSession);

        // Persist to localStorage for robust recovery (survives device sleep, tab close, etc.)
        if (typeof persistOpenSleepSession === 'function') {
            persistOpenSleepSession(sleepSession);
        }

        console.log('😴 Sleep session started:', sleepSession);
        return sleepSession;
    } catch (error) {
        console.error('Error starting sleep session:', error);
        throw error;
    }
}

async function endSleepSession(endTimeISO, manualHours) {
    try {
        const incomplete = await getIncompleteSleepSession();

        if (!incomplete) {
            throw new Error('No active sleep session to end');
        }

        const startTime = new Date(incomplete.start_datetime);
        const endTime = endTimeISO ? new Date(endTimeISO) : new Date();

        // Calculate duration
        let duration;
        if (manualHours !== null && manualHours !== undefined) {
            duration = manualHours;
        } else {
            duration = (endTime - startTime) / (1000 * 60 * 60);
        }

        // Update the session
        incomplete.end_datetime = endTime.toISOString();
        incomplete.duration_hours = duration;

        await dbPut('sleep', incomplete);

        // Clear localStorage persistence (session is now complete)
        if (typeof clearOpenSleepSession === 'function') {
            clearOpenSleepSession();
        }

        console.log('☀️ Sleep session ended:', incomplete);
        return incomplete;
    } catch (error) {
        console.error('Error ending sleep session:', error);
        throw error;
    }
}

async function getMedLogsByDate(date) {
    try {
        const userId = getCurrentUserId();
        const logs = await dbGetByUserAndDate('medications', userId, date);
        return logs || [];
    } catch (error) {
        console.warn('Error getting medication logs:', error);
        return [];
    }
}
// Load external data

async function restoreSettingsFromBackup() {
    try {
        // Try to restore from localStorage backup
        const backupKey = 'ultimateWellness_settingsBackup';
        const backup = localStorage.getItem(backupKey);
        
        if (backup) {
            const settings = JSON.parse(backup);
            console.log('📦 Found settings backup in localStorage');
            
            // Save to IndexedDB
            const userId = getCurrentUserId();
            settings.userId = userId;
            settings.id = `user_${userId}`;
            
            await saveSettings(settings);
            console.log('💾 Settings restored to IndexedDB');
            
            // Clear the backup
            localStorage.removeItem(backupKey);
            
            return settings;
        }
        
        return null;
    } catch (error) {
        console.warn('Error restoring settings from backup:', error);
        return null;
    }
}
async function loadExternalData() {
    try {
        const foods = await fetch('data/zero-point-foods.json');
        if (foods.ok) window.ZERO_POINT_FOODS = await foods.json();
    } catch (e) { console.warn('No zero-point foods:', e); }

    try {
        const overrides = await fetch('data/zero-calorie-overrides.json');
        if (overrides.ok) window.ZERO_CALORIE_OVERRIDES = await overrides.json();
    } catch (e) { console.warn('No zero-calorie overrides:', e); }

    try {
        const scenarios = await fetch('data/bot-scenarios.json');
        if (scenarios.ok) window.BOT_SCENARIOS = await scenarios.json();
    } catch (e) { console.warn('No bot scenarios:', e); }
}

// ============ V1.9.6 APP CODE STARTS HERE ============

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
        
        // Database already initialized by wrapper - skip this section
//         // Initialize database with timeout
//         console.log('📦 Initializing database...');
//         const dbPromise = initDatabase();
//         const timeoutPromise = new Promise((_, reject) => 
//             setTimeout(() => reject(new Error('Database initialization timeout')), 10000)
//         );
//         
//         try {
//             await Promise.race([dbPromise, timeoutPromise]);
//             console.log('✅ Database ready');
//         } catch (dbErr) {
//             console.error('❌ Database initialization failed:', dbErr);
//             alert('Database initialization failed.\n\n' + 
//                   'Error: ' + dbErr.message + '\n\n' +
//                   'Please try:\n' +
//                   '1. Refresh the page\n' +
//                   '2. Clear browser cache\n' +
//                   '3. Use Chrome/Firefox/Edge\n' +
//                   '4. Check if storage is enabled');
//             throw dbErr;
//         }
//         
//         // Perform daily maintenance
//         await performDailyMaintenance();
//         
//         // Load user settings
        userSettings = await getSettings();
        
        // Initialize API configuration from dedicated storage
        if (userSettings) {
            await initAPIConfig();
        }

        // If no settings found, try to restore from localStorage backup
        if (!userSettings) {
            console.log('🔍 No user settings found, checking for backup...');
            userSettings = await restoreSettingsFromBackup();

            if (userSettings) {
                console.log('✅ User settings restored from backup!');
                alert('👋 Welcome back!\n\nYour settings were automatically restored from backup.');
                await initAPIConfig(); // Initialize API config after restore
            }
        }
        
        if (!userSettings) {
            // Show setup screen
            const setupEl = document.getElementById('setupScreen'); if (setupEl) setupEl.classList.add('active');
            console.log('👋 New user - showing setup screen');
            
            // Show current app version on setup screen
            await updateVersionDisplay();
        } else {
            // Hide setup screen
            const setupScreen = document.getElementById('setupScreen');
            if (setupScreen) setupScreen.classList.remove('active');
            
            // Check if app version needs updating
            if (userSettings.appVersion !== APP_VERSION) {
                const oldVersion = userSettings.appVersion || 'unknown';
                console.log(`🔄 Updating app version: ${oldVersion} → ${APP_VERSION}`);
                userSettings.appVersion = APP_VERSION;
                await saveSettings(userSettings);
            }
            
            // Update version display
            await updateVersionDisplay();
            
            // Check 12-week points period boundary (or initialize if missing)
            checkPointsPeriodBoundary();
            await saveSettings(userSettings);
            
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
        setupButton.disabled = true;
        setupButton.innerHTML = 'Setting up... ⏳';
        
        console.log('🔧 Starting setup...');
        
        // Wait for database
        let attempts = 0;
        while (!db && attempts < 50) {
            console.log(`⏳ Waiting for database... attempt ${attempts + 1}/50`);
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (!db) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Database failed to initialize. Please refresh and try again.');
            return;
        }
        
        // Collect form data
        const formData = {
            name: document.getElementById('setupName').value.trim(),
            email: document.getElementById('setupEmail').value.trim(),
            birthday: document.getElementById('setupBirthday').value,
            gender: document.getElementById('setupGender').value,
            currentWeight: parseFloat(document.getElementById('setupWeight').value),
            goalWeight: parseFloat(document.getElementById('setupGoalWeight').value),
            heightFeet: parseInt(document.getElementById('setupHeightFeet').value),
            heightInches: parseInt(document.getElementById('setupHeightInches').value) || 0,
            activity: document.getElementById('setupActivity').value
        };
        
        // Validate - detailed checks
        if (!formData.name) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Name is required');
            document.getElementById('setupName').focus();
            return;
        }
        
        if (!formData.email || !formData.email.includes('@') || !formData.email.includes('.')) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Valid email is required');
            document.getElementById('setupEmail').focus();
            return;
        }
        
        if (!formData.birthday) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Birthday is required (needed for points calculation)');
            document.getElementById('setupBirthday').focus();
            return;
        }
        
        const age = calculateAge(formData.birthday);
        if (age < 18 || age > 100) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Age must be between 18-100 years');
            document.getElementById('setupBirthday').focus();
            return;
        }
        
        if (!formData.gender) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Gender is required (needed for points calculation)');
            document.getElementById('setupGender').focus();
            return;
        }
        
        if (!formData.currentWeight || formData.currentWeight < 80 || formData.currentWeight > 600) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Current weight must be between 80-600 lbs');
            document.getElementById('setupWeight').focus();
            return;
        }
        
        if (!formData.goalWeight || formData.goalWeight < 80 || formData.goalWeight > 600) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Goal weight must be between 80-600 lbs');
            document.getElementById('setupGoalWeight').focus();
            return;
        }
        
        if (!formData.heightFeet || formData.heightFeet < 3 || formData.heightFeet > 8) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Height must be between 3-8 feet');
            document.getElementById('setupHeightFeet').focus();
            return;
        }
        
        if (!formData.activity) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert('❌ Activity level is required');
            document.getElementById('setupActivity').focus();
            return;
        }
        
        // Register user
        const result = await registerUser(formData);
        
        if (!result.success) {
            setupButton.disabled = false;
            setupButton.innerHTML = originalText;
            alert(`❌ Setup failed: ${result.error}`);
            return;
        }
        
        // Success!
        console.log('✅ Setup complete');
        
        // Log initial weight
        await addWeightLog({
            date: new Date().toISOString().split('T')[0],
            weight: formData.currentWeight,
            notes: 'Starting weight'
        });
        
        // Hide setup screen
        const setupScreen = document.getElementById('setupScreen');
        if (setupScreen) setupScreen.classList.remove('active');
        
        // Show main app
        const container = document.querySelector('.container');
        if (container) container.style.display = 'block';
        
        // Initialize UI
        await updateAllUI();
        
        // Send welcome email
        if (typeof sendWelcomeEmail === 'function') {
            sendWelcomeEmail();
        }
        
        // Show welcome message
        // Safety check: ensure userSettings is loaded
        if (!userSettings || !userSettings.lockedPoints) {
            console.warn('⚠️ userSettings not loaded, fetching...');
            userSettings = await getSettings();
        }
        
        const dailyPoints = userSettings?.lockedPoints || userSettings?.dailyPoints || 0;
        alert(`🎉 Welcome ${formData.name}!\n\nYour daily points: ${dailyPoints}\n\nLet's start your wellness journey!`);
        
    } catch (error) {
        console.error('Setup error:', error);
        setupButton.disabled = false;
        setupButton.innerHTML = originalText;
        alert(`❌ Setup failed: ${error.message}`);
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

function calculateDailyPoints(gender, age, weight, heightInInches, activity, customFloor = null) {
    // Weight Watchers Classic Points Formula (v2.0 - 12-Week Locked Period)
    // Points are calculated to achieve 12-week goal at 1-2 lbs/week
    // LOCKED for 12 weeks - only recalculate at period boundaries
    
    // Use custom floor if provided, otherwise use stored floor, otherwise default to 23
    const floor = customFloor !== null ? customFloor : (userSettings?.pointsFloor || 23);
    
    let breakdown = {
        sex: 0,
        age: 0,
        weight: 0,
        height: 0,
        activity: 0,
        subtotal: 0,
        floor: floor,
        final: 0,
        // NEW: Burn rate factors
        targetWeeklyLoss: 0,
        targetDeficit: 0,
        burnRateAdjustment: 0
    };
    
    // S: Sex
    if (gender === 'female') {
        breakdown.sex = 2;
    } else if (gender === 'male') {
        breakdown.sex = 8;
    }
    
    // A: Age brackets
    if (age >= 17 && age <= 26) {
        breakdown.age = 4;
    } else if (age >= 27 && age <= 37) {
        breakdown.age = 3;
    } else if (age >= 38 && age <= 47) {
        breakdown.age = 2;
    } else if (age >= 48 && age <= 58) {
        breakdown.age = 1;
    } else { // 59+
        breakdown.age = 0;
    }
    
    // W: Weight (first two digits of lbs)
    // Example: 175 lbs → 17, 240 lbs → 24
    breakdown.weight = Math.floor(weight / 10);
    
    // H: Height
    if (heightInInches < 61) { // Under 5'1"
        breakdown.height = 0;
    } else if (heightInInches <= 70) { // 5'1" to 5'10"
        breakdown.height = 1;
    } else { // Over 5'10"
        breakdown.height = 2;
    }
    
    // E: Daily Activity Level (NEAT - Non-Exercise Activity Thermogenesis)
    const activityPoints = {
        'sedentary': 0,      // Mostly sitting
        'light': 2,          // Occasional standing, light housework
        'moderate': 4,       // Walking most of the time
        'active': 6,         // Physically strenuous job
        'very_active': 6     // Manual labor
    };
    breakdown.activity = activityPoints[activity] || 0;
    
    // Calculate subtotal using classic formula
    breakdown.subtotal = breakdown.sex + breakdown.age + breakdown.weight + breakdown.height + breakdown.activity;
    
    // NEW: Calculate 12-week target burn rate (if userSettings available)
    if (userSettings && userSettings.goalWeight) {
        const weightDelta = weight - userSettings.goalWeight;
        breakdown.targetWeeklyLoss = Math.max(0, Math.min(2, weightDelta / 12)); // Cap at 2 lbs/week
        
        // 1 lb = 3500 calories, so weekly loss * 3500 / 7 days = daily deficit
        breakdown.targetDeficit = Math.round((breakdown.targetWeeklyLoss * 3500) / 7);
        
        // This is informational - we don't adjust classic formula
        // Instead, we LOCK the points at period start
    }
    
    // Apply floor (minimum safe points)
    // User can adjust floor in settings (typically 23-30 depending on "era")
    breakdown.final = Math.max(breakdown.floor, breakdown.subtotal);
    
    return {
        points: breakdown.final,
        breakdown: breakdown
    };
}

// Get points breakdown for display
function getPointsBreakdown() {
    if (!userSettings) return null;
    
    const age = new Date().getFullYear() - new Date(userSettings.birthday).getFullYear();
    const result = calculateDailyPoints(
        userSettings.gender,
        age,
        userSettings.currentWeight,
        userSettings.heightInInches,
        userSettings.activity
    );
    
    return result.breakdown;
}

// ============ 12-WEEK POINTS PERIOD SYSTEM ============
// Points are LOCKED for 12-week periods to provide stable goals
// Only recalculate at period boundaries or when goal is reached

function startNewPointsPeriod() {
    if (!userSettings) return;
    
    const today = new Date();
    const periodEnd = new Date(today);
    periodEnd.setDate(periodEnd.getDate() + (12 * 7)); // 12 weeks = 84 days
    
    // Calculate points for this period
    const age = calculateAge(userSettings.birthday);
    const result = calculateDailyPoints(
        userSettings.gender,
        age,
        userSettings.currentWeight,
        userSettings.heightInInches,
        userSettings.activity
    );
    
    // Calculate target weekly loss for this period
    const weightDelta = userSettings.currentWeight - userSettings.goalWeight;
    const targetWeeklyLoss = Math.max(0, Math.min(2, weightDelta / 12)); // Cap at 2 lbs/week
    
    // LOCK these values for 12 weeks
    userSettings.pointsPeriodStart = today.toISOString().split('T')[0];
    userSettings.pointsPeriodEnd = periodEnd.toISOString().split('T')[0];
    userSettings.lockedPoints = result.points;
    userSettings.dailyPoints = result.points;
    userSettings.targetWeeklyLoss = targetWeeklyLoss;
    userSettings.periodStartWeight = userSettings.currentWeight;
    userSettings.maintenanceMode = false;
    userSettings.sixWeekCheckpointDone = false; // Reset for new period
    
    console.log(`🔒 Started new 12-week points period:`);
    console.log(`   Points locked: ${result.points}/day`);
    console.log(`   Target: ${targetWeeklyLoss} lbs/week`);
    console.log(`   Period: ${userSettings.pointsPeriodStart} → ${userSettings.pointsPeriodEnd}`);
    
    return result.points;
}

function checkPointsPeriodBoundary() {
    if (!userSettings) return false;
    
    // If no period set, start one
    if (!userSettings.pointsPeriodStart || !userSettings.pointsPeriodEnd) {
        startNewPointsPeriod();
        return true;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const periodEnd = userSettings.pointsPeriodEnd;
    const periodStart = userSettings.pointsPeriodStart;
    
    // Check if we're past the period end (12 weeks)
    if (today >= periodEnd) {
        console.log('📅 Reached 12-week boundary - recalculating points');
        startNewPointsPeriod();
        return true;
    }
    
    // NEW: Check for 6-week mid-period checkpoint
    const startDate = new Date(periodStart);
    const sixWeeksLater = new Date(startDate);
    sixWeeksLater.setDate(sixWeeksLater.getDate() + (6 * 7)); // 42 days
    const sixWeekStr = sixWeeksLater.toISOString().split('T')[0];
    
    // If we're at 6-week mark and haven't done checkpoint yet
    if (today >= sixWeekStr && !userSettings.sixWeekCheckpointDone) {
        console.log('📊 6-week checkpoint - checking progress');
        performSixWeekCheckpoint();
        return true;
    }
    
    return false;
}

async function performSixWeekCheckpoint() {
    if (!userSettings) return;
    
    console.log('📊 Performing 6-week mid-period checkpoint');
    
    // Calculate actual burn rate from weight logs
    const periodStart = new Date(userSettings.pointsPeriodStart);
    const today = new Date();
    const daysSinceStart = Math.max(1, (today - periodStart) / (1000 * 60 * 60 * 24));
    const weeksSinceStart = daysSinceStart / 7;
    
    // Get all weight logs since period start
    const allLogs = await getAllWeightLogs();
    const periodLogs = allLogs.filter(log => log.date >= userSettings.pointsPeriodStart)
                              .sort((a, b) => a.date.localeCompare(b.date));
    
    if (periodLogs.length < 2) {
        console.log('⚠️ Not enough weight data for checkpoint');
        userSettings.sixWeekCheckpointDone = true;
        await saveSettings(userSettings);
        return;
    }
    
    // Calculate actual loss
    const startWeight = userSettings.periodStartWeight || periodLogs[0].weight;
    const currentWeight = userSettings.currentWeight;
    const actualLoss = startWeight - currentWeight;
    const actualWeeklyRate = actualLoss / weeksSinceStart;
    
    // Target rate
    const targetWeeklyRate = userSettings.targetWeeklyLoss || 1.5;
    
    // Calculate expected loss at 6 weeks
    const expectedLoss = targetWeeklyRate * weeksSinceStart;
    const variance = actualLoss - expectedLoss; // Negative = behind, Positive = ahead
    
    console.log(`   Start weight: ${startWeight} lbs`);
    console.log(`   Current weight: ${currentWeight} lbs`);
    console.log(`   Actual loss: ${actualLoss.toFixed(1)} lbs (${actualWeeklyRate.toFixed(2)} lbs/week)`);
    console.log(`   Expected loss: ${expectedLoss.toFixed(1)} lbs (${targetWeeklyRate.toFixed(2)} lbs/week)`);
    console.log(`   Variance: ${variance > 0 ? '+' : ''}${variance.toFixed(1)} lbs`);
    
    // Determine if adjustment needed (> 0.5 lbs/week off target)
    const weeklyVariance = Math.abs(actualWeeklyRate - targetWeeklyRate);
    
    if (weeklyVariance < 0.5) {
        // On track - no adjustment needed
        console.log('✅ On track! No adjustment needed.');
        alert(
            `📊 6-Week Progress Check\n\n` +
            `You're on track! 🎉\n\n` +
            `Lost: ${actualLoss.toFixed(1)} lbs (${actualWeeklyRate.toFixed(1)} lbs/week)\n` +
            `Target: ${expectedLoss.toFixed(1)} lbs (${targetWeeklyRate.toFixed(1)} lbs/week)\n\n` +
            `Your points stay at ${userSettings.lockedPoints}/day.\n` +
            `Keep up the great work!`
        );
    } else {
        // Off track - suggest minor adjustment
        // Calculate needed adjustment (1-3 points max)
        // ~500 cal deficit = 1 lb/week, ~35 cal/point
        const calorieDeficitNeeded = weeklyVariance * 500; // Extra deficit per week
        const dailyCalDeficitNeeded = calorieDeficitNeeded / 7;
        const pointsAdjustment = Math.round(dailyCalDeficitNeeded / 35);
        
        // Cap adjustment at ±3 points
        const cappedAdjustment = Math.max(-3, Math.min(3, pointsAdjustment));
        
        // Behind = need more deficit = reduce points (negative adjustment)
        // Ahead = need less deficit = increase points (positive adjustment)
        const finalAdjustment = actualWeeklyRate < targetWeeklyRate ? -Math.abs(cappedAdjustment) : Math.abs(cappedAdjustment);
        
        if (finalAdjustment === 0) {
            // Very minor variance, no adjustment
            console.log('✅ Minor variance - no adjustment needed');
            alert(
                `📊 6-Week Progress Check\n\n` +
                `Lost: ${actualLoss.toFixed(1)} lbs (${actualWeeklyRate.toFixed(1)} lbs/week)\n` +
                `Target: ${expectedLoss.toFixed(1)} lbs (${targetWeeklyRate.toFixed(1)} lbs/week)\n\n` +
                `Minor variance - no adjustment needed.\n` +
                `Your points stay at ${userSettings.lockedPoints}/day.`
            );
        } else {
            // Show adjustment confirmation
            const newPoints = userSettings.lockedPoints + finalAdjustment;
            const direction = finalAdjustment > 0 ? 'increased' : 'decreased';
            const reason = finalAdjustment > 0 ? 'ahead of pace' : 'behind pace';
            
            const confirmed = confirm(
                `📊 6-Week Mid-Period Check-In\n\n` +
                `Progress: ${actualLoss.toFixed(1)} lbs lost (${actualWeeklyRate.toFixed(1)} lbs/week)\n` +
                `Target: ${expectedLoss.toFixed(1)} lbs (${targetWeeklyRate.toFixed(1)} lbs/week)\n\n` +
                `You're ${reason} by ${Math.abs(variance).toFixed(1)} lbs.\n\n` +
                `We recommend fine-tuning your budget:\n` +
                `${userSettings.lockedPoints} → ${newPoints} points/day (${finalAdjustment > 0 ? '+' : ''}${finalAdjustment})\n\n` +
                `This small adjustment will help you reach your 12-week goal.\n\n` +
                `Accept adjustment?`
            );
            
            if (confirmed) {
                const oldPoints = userSettings.lockedPoints;
                userSettings.lockedPoints = newPoints;
                userSettings.dailyPoints = newPoints;
                
                console.log(`   Adjusted: ${oldPoints} → ${newPoints} (${finalAdjustment > 0 ? '+' : ''}${finalAdjustment})`);
                
                alert(
                    `Points ${direction} to ${newPoints}/day! 🎯\n\n` +
                    `This fine-tuning will help you stay on track to reach your goal.`
                );
            } else {
                console.log('   User declined adjustment');
                alert(
                    `No problem! Your points stay at ${userSettings.lockedPoints}/day.\n\n` +
                    `Consider increasing activity if you want to get back on track.`
                );
            }
        }
    }
    
    // Mark checkpoint as done
    userSettings.sixWeekCheckpointDone = true;
    userSettings.sixWeekCheckpointDate = new Date().toISOString().split('T')[0];
    await saveSettings(userSettings);
    
    console.log('✅ 6-week checkpoint complete');
}

function calculateActualBurnRate() {
    if (!userSettings) return null;
    
    // Need at least 2 weeks of data
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoStr = twoWeeksAgo.toISOString().split('T')[0];
    
    // Get weight logs from last 2 weeks
    getAllWeightLogs().then(logs => {
        const recentLogs = logs.filter(log => log.date >= twoWeeksAgoStr).sort((a, b) => a.date.localeCompare(b.date));
        
        if (recentLogs.length < 2) {
            return null;
        }
        
        const oldestRecent = recentLogs[0];
        const newestRecent = recentLogs[recentLogs.length - 1];
        
        const weightChange = oldestRecent.weight - newestRecent.weight; // Positive = loss
        const daysBetween = Math.max(1, (new Date(newestRecent.date) - new Date(oldestRecent.date)) / (1000 * 60 * 60 * 24));
        const weeksBetween = daysBetween / 7;
        
        const actualWeeklyLoss = weightChange / weeksBetween;
        
        return {
            actualWeeklyLoss: Math.round(actualWeeklyLoss * 10) / 10,
            targetWeeklyLoss: userSettings.targetWeeklyLoss || 0,
            onTrack: Math.abs(actualWeeklyLoss - (userSettings.targetWeeklyLoss || 0)) < 0.5,
            behind: actualWeeklyLoss < (userSettings.targetWeeklyLoss || 0) - 0.5,
            ahead: actualWeeklyLoss > (userSettings.targetWeeklyLoss || 0) + 0.5
        };
    });
}

async function suggestActivityAdjustment() {
    const burnRate = await calculateActualBurnRate();
    
    if (!burnRate || !burnRate.behind) return null;
    
    const deficit = (userSettings.targetWeeklyLoss - burnRate.actualWeeklyLoss) * 3500 / 7; // Daily calorie deficit needed
    const exerciseMinutes = Math.round(deficit / 5); // Rough: 5 cal/min moderate activity
    
    return {
        message: `You're ${(userSettings.targetWeeklyLoss - burnRate.actualWeeklyLoss).toFixed(1)} lbs/week behind target`,
        suggestion: `Add ${exerciseMinutes} minutes of daily activity`,
        keepPoints: true,
        dontReducePoints: '⚠️ We recommend more activity instead of reducing your points budget'
    };
}

function enterMaintenanceMode() {
    if (!userSettings) return;
    
    const weightDelta = Math.abs(userSettings.currentWeight - userSettings.goalWeight);
    
    // Within 2 lbs of goal = maintenance mode
    if (weightDelta <= 2) {
        console.log('🎉 Goal reached! Entering maintenance mode');
        
        // Increase points to maintenance level (no deficit)
        const age = calculateAge(userSettings.birthday);
        const result = calculateDailyPoints(
            userSettings.gender,
            age,
            userSettings.currentWeight,
            userSettings.heightInInches,
            userSettings.activity
        );
        
        // Add back the deficit (~5 points for 500 cal)
        const maintenancePoints = result.points + 5;
        
        userSettings.maintenanceMode = true;
        userSettings.lockedPoints = maintenancePoints;
        userSettings.dailyPoints = maintenancePoints;
        
        console.log(`   Maintenance points: ${maintenancePoints}/day`);
        
        return maintenancePoints;
    }
    
    return null;
}

// ============ END 12-WEEK POINTS PERIOD SYSTEM ============

// Helper: Validate a single field and show error if invalid
function validateFieldWithFeedback(value, fieldId, validationFn, errorMessage) {
    if (!validationFn(value)) {
        alert(errorMessage);
        document.getElementById(fieldId).focus();
        return false;
    }
    return true;
}

// Helper: Collect settings form data
function collectSettingsFormData() {
    console.log('🔍 Reading form fields (API config hardcoded)');

    return {
        name: document.getElementById('settingsName').value.trim(),
        email: document.getElementById('settingsEmail').value.trim(),
        birthday: document.getElementById('settingsBirthday').value,
        gender: document.getElementById('settingsGender').value,
        goalWeight: parseFloat(document.getElementById('settingsGoalWeight').value),
        heightFeet: parseInt(document.getElementById('settingsHeightFeet').value),
        heightInches: parseInt(document.getElementById('settingsHeightInches').value) || 0,
        activity: document.getElementById('settingsActivity').value,
        resetTime: document.getElementById('settingsResetTime')?.value || '04:00',
        // Always use hardcoded API config
        proxyUrl: 'https://ultimate-wellness.your4ship.workers.dev/',
        useProxy: true
    };
}

// Helper: Validate all settings form fields
function validateSettingsForm(formData) {
    // Name validation
    if (!validateFieldWithFeedback(
        formData.name,
        'settingsName',
        (val) => val.length > 0,
        '❌ Name is required'
    )) return false;

    // Email validation
    if (!validateFieldWithFeedback(
        formData.email,
        'settingsEmail',
        (val) => val.length > 0 && val.includes('@'),
        '❌ Valid email is required'
    )) return false;

    // Birthday validation
    if (!validateFieldWithFeedback(
        formData.birthday,
        'settingsBirthday',
        (val) => val.length > 0,
        '❌ Birthday is required (needed for points calculation)'
    )) return false;

    // Age validation
    const age = calculateAge(formData.birthday);
    if (!validateFieldWithFeedback(
        age,
        'settingsBirthday',
        (val) => val >= 18 && val <= 100,
        '❌ Age must be between 18-100 years'
    )) return false;

    // Gender validation
    if (!validateFieldWithFeedback(
        formData.gender,
        'settingsGender',
        (val) => val.length > 0,
        '❌ Gender is required (needed for points calculation)'
    )) return false;

    // Goal weight validation
    if (!validateFieldWithFeedback(
        formData.goalWeight,
        'settingsGoalWeight',
        (val) => val >= 80 && val <= 600,
        '❌ Goal weight must be between 80-600 lbs'
    )) return false;

    // Height validation
    if (!validateFieldWithFeedback(
        formData.heightFeet,
        'settingsHeightFeet',
        (val) => val >= 3 && val <= 8,
        '❌ Height must be between 3-8 feet'
    )) return false;

    // Activity level validation
    if (!validateFieldWithFeedback(
        formData.activity,
        'settingsActivity',
        (val) => val.length > 0,
        '❌ Activity level is required'
    )) return false;

    return true;
}

// Helper: Check if points-affecting settings changed
function didPointsSettingsChange(current, updated) {
    return current.activity !== updated.activity ||
           Math.abs(current.goalWeight - updated.goalWeight) > 5 ||
           current.birthday !== updated.birthday ||
           current.gender !== updated.gender;
}

// Helper: Handle points recalculation with user confirmation
function handlePointsRecalculation(currentSettings, formData, age, heightInInches, updatedSettings) {
    const newPoints = calculateDailyPoints(
        formData.gender,
        age,
        currentSettings.currentWeight,
        heightInInches,
        formData.activity
    ).points;

    const userConfirmed = window.confirm(
        `You changed settings that affect your daily points.\n\n` +
        `Current: ${currentSettings.lockedPoints} pts/day\n` +
        `New calculation: ${newPoints} pts/day\n\n` +
        `Would you like to restart your 12-week period with ${newPoints} pts/day?\n\n` +
        `✓ OK = Restart with ${newPoints} pts/day\n` +
        `✗ Cancel = Keep ${currentSettings.lockedPoints} pts/day`
    );

    if (userConfirmed) {
        updatedSettings.dailyPoints = newPoints;
        updatedSettings.lockedPoints = newPoints;

        // Restart 12-week period
        const today = new Date().toISOString().split('T')[0];
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 84);
        updatedSettings.pointsPeriodStart = today;
        updatedSettings.pointsPeriodEnd = endDate.toISOString().split('T')[0];

        return true;
    }

    return false;
}

async function saveSettings() {
    console.log('💾 Save Settings clicked');

    try {
        // Collect and validate form data
        const formData = collectSettingsFormData();
        if (!validateSettingsForm(formData)) {
            return;
        }

        // Verify user is logged in
        const userId = getCurrentUserId();
        if (!userId) {
            alert('❌ Error: No user logged in. Please refresh the page.');
            return;
        }

        // Get current settings from database
        const currentSettings = await dbGet('settings', `user_${userId}`);
        if (!currentSettings) {
            alert('❌ Error: Settings not found. Please refresh the page.');
            return;
        }

        console.log('💾 Saving settings to database...');

        // Prepare updated settings
        const heightInInches = (formData.heightFeet * 12) + formData.heightInches;
        const age = calculateAge(formData.birthday);

        console.log('🔍 Form data collected:', {
            proxyUrl: formData.proxyUrl,
            useProxy: formData.useProxy
        });

        console.log('🔍 Current settings from DB:', {
            id: currentSettings.id,
            userId: currentSettings.userId,
            proxyUrl: currentSettings.proxyUrl,
            useProxy: currentSettings.useProxy
        });

        const updatedSettings = {
            ...currentSettings,
            name: formData.name,
            email: formData.email,
            birthday: formData.birthday,
            gender: formData.gender,
            goalWeight: formData.goalWeight,
            heightInInches: heightInInches,
            heightFeet: formData.heightFeet,
            heightInches: formData.heightInches,
            activity: formData.activity,
            resetTime: formData.resetTime,
            proxyUrl: formData.proxyUrl,
            useProxy: formData.useProxy,
            lastModified: new Date().toISOString()
        };

        console.log('🔍 Updated settings to save:', {
            id: updatedSettings.id,
            userId: updatedSettings.userId,
            proxyUrl: updatedSettings.proxyUrl,
            useProxy: updatedSettings.useProxy
        });

        // Handle points recalculation if needed
        let pointsRecalculated = false;
        if (didPointsSettingsChange(currentSettings, formData)) {
            pointsRecalculated = handlePointsRecalculation(
                currentSettings,
                formData,
                age,
                heightInInches,
                updatedSettings
            );
        }

        // Save to database and update global state
        await dbPut('settings', updatedSettings);
        console.log('✅ Settings saved to database with key:', updatedSettings.id);

        window.userSettings = updatedSettings;

        // Save API config to dedicated storage (bulletproof persistence)
        await saveAPIConfigToStorage(formData.proxyUrl, formData.useProxy);
        console.log('✅ API config saved to dedicated storage');

        // Save session and update UI
        await saveSession();
        await updateAllUI();

        // Show success message
        const successMessage = pointsRecalculated
            ? `✅ Settings saved!\n\nNew 12-week period started with ${updatedSettings.lockedPoints} pts/day`
            : '✅ Settings saved successfully!';
        alert(successMessage);

        console.log('✅ Settings save complete');

    } catch (error) {
        console.error('❌ Save settings error:', error);
        alert(`❌ Save failed: ${error.message}\n\nPlease try again or refresh the page.`);
    }
}

// Display points breakdown in settings (v2.0 Beta)
async function displayPointsBreakdown() {
    const breakdown = getPointsBreakdown();
    const breakdownDiv = document.getElementById('pointsBreakdown');
    
    if (!breakdown || !breakdownDiv) return;
    
    // Calculate days remaining in period
    let periodInfo = '';
    if (userSettings.pointsPeriodStart && userSettings.pointsPeriodEnd) {
        const today = new Date();
        const periodEnd = new Date(userSettings.pointsPeriodEnd);
        const periodStart = new Date(userSettings.pointsPeriodStart);
        const daysRemaining = Math.max(0, Math.ceil((periodEnd - today) / (1000 * 60 * 60 * 24)));
        const weeksRemaining = Math.floor(daysRemaining / 7);
        
        // Calculate 6-week checkpoint date
        const sixWeeks = new Date(periodStart);
        sixWeeks.setDate(sixWeeks.getDate() + (6 * 7));
        const sixWeekStr = sixWeeks.toISOString().split('T')[0];
        const sixWeekPassed = today.toISOString().split('T')[0] >= sixWeekStr;
        
        let checkpointInfo = '';
        if (userSettings.sixWeekCheckpointDone) {
            checkpointInfo = `<div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">✅ 6-week checkpoint completed ${userSettings.sixWeekCheckpointDate ? `on ${new Date(userSettings.sixWeekCheckpointDate).toLocaleDateString()}` : ''}</div>`;
        } else if (sixWeekPassed) {
            checkpointInfo = `<div style="font-size: 11px; color: #ffd700; margin-top: 5px;">⏰ 6-week checkpoint ready - log weight to check progress</div>`;
        } else {
            const daysToCheckpoint = Math.ceil((sixWeeks - today) / (1000 * 60 * 60 * 24));
            checkpointInfo = `<div style="font-size: 11px; opacity: 0.7; margin-top: 5px;">📅 6-week check-in: ${sixWeeks.toLocaleDateString()} (${daysToCheckpoint} days)</div>`;
        }
        
        periodInfo = `
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; margin-top: 15px;">
                <div style="font-weight: bold; margin-bottom: 5px;">🔒 Points Locked Until:</div>
                <div style="font-size: 14px;">${new Date(userSettings.pointsPeriodEnd).toLocaleDateString()}</div>
                <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                    ${weeksRemaining} weeks, ${daysRemaining % 7} days remaining
                </div>
                ${checkpointInfo}
                ${userSettings.targetWeeklyLoss ? `
                    <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.2);">
                        <div style="font-size: 12px;">Target: ${userSettings.targetWeeklyLoss.toFixed(1)} lbs/week</div>
                        <div style="font-size: 11px; opacity: 0.7;">Minor fine-tuning at 6-week mark</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    // Show maintenance mode if active
    let maintenanceInfo = '';
    if (userSettings.maintenanceMode) {
        maintenanceInfo = `
            <div style="background: rgba(0,200,0,0.2); padding: 12px; border-radius: 6px; margin-top: 15px; border: 2px solid rgba(0,255,0,0.3);">
                <div style="font-weight: bold; margin-bottom: 5px;">🎉 Maintenance Mode</div>
                <div style="font-size: 12px;">Goal reached! Points set for weight maintenance.</div>
            </div>
        `;
    }
    
    breakdownDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr auto; gap: 8px; margin-bottom: 10px;">
            <div><strong>S</strong> (Sex):</div>
            <div style="text-align: right;">${breakdown.sex} pts</div>
            
            <div><strong>A</strong> (Age):</div>
            <div style="text-align: right;">${breakdown.age} pts</div>
            
            <div><strong>W</strong> (Weight):</div>
            <div style="text-align: right;">${breakdown.weight} pts</div>
            
            <div><strong>H</strong> (Height):</div>
            <div style="text-align: right;">${breakdown.height} pts</div>
            
            <div><strong>E</strong> (Activity):</div>
            <div style="text-align: right;">${breakdown.activity} pts</div>
            
            <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 8px; font-weight: bold;">Subtotal:</div>
            <div style="border-top: 2px solid rgba(255,255,255,0.3); padding-top: 8px; text-align: right; font-weight: bold;">${breakdown.subtotal} pts</div>
            
            <div style="opacity: 0.8;">Floor Applied:</div>
            <div style="text-align: right; opacity: 0.8;">${breakdown.floor} pts</div>
            
            ${breakdown.targetWeeklyLoss ? `
                <div style="opacity: 0.8; font-size: 12px;">Target Loss:</div>
                <div style="text-align: right; opacity: 0.8; font-size: 12px;">${breakdown.targetWeeklyLoss.toFixed(1)} lbs/wk</div>
            ` : ''}
            
            <div style="font-size: 18px; font-weight: bold; color: #fff; padding-top: 8px; border-top: 2px solid #fff;">Daily Total:</div>
            <div style="font-size: 18px; font-weight: bold; color: #fff; text-align: right; padding-top: 8px; border-top: 2px solid #fff;">${breakdown.final} pts</div>
        </div>
        ${maintenanceInfo}
        ${periodInfo}
    `;
    
    // Update floor input if it exists
    const floorInput = document.getElementById('pointsFloor');
    if (floorInput) {
        floorInput.value = breakdown.floor;
    }
}

// Recalculate points with custom floor
async function recalculatePoints() {
    if (!userSettings) {
        alert('No user settings found');
        return;
    }
    
    // Get custom floor value
    const floorInput = document.getElementById('pointsFloor');
    const customFloor = floorInput ? parseInt(floorInput.value) : 23;
    
    if (customFloor < 20 || customFloor > 35) {
        alert('Floor must be between 20 and 35 points');
        return;
    }
    
    // Temporarily update breakdown floor for calculation
    const age = calculateAge(userSettings.birthday);
    const result = calculateDailyPoints(
        userSettings.gender,
        age,
        userSettings.currentWeight,
        userSettings.heightInInches,
        userSettings.activity
    );
    
    // Override floor
    result.breakdown.floor = customFloor;
    result.breakdown.final = Math.max(customFloor, result.breakdown.subtotal);
    result.points = result.breakdown.final;
    
    // Update user settings
    userSettings.dailyPoints = result.points;
    userSettings.pointsFloor = customFloor; // Store custom floor
    
    await saveSettings(userSettings);
    await displayPointsBreakdown();
    await updatePointsDisplay();
    
    alert(`Points recalculated!\n\nNew daily total: ${result.points} pts\nFloor: ${customFloor} pts`);
}

// ============ WEIGHT LOG FUNCTIONS ============

async function addWeightLog(logData) {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            console.warn('No user ID for weight log');
            return;
        }
        
        const weightLog = {
            id: `weight_${userId}_${Date.now()}`,
            userId: userId,
            date: logData.date,
            weight: logData.weight,
            notes: logData.notes || '',
            timestamp: new Date().toISOString()
        };
        
        await dbPut('weight_logs', weightLog);
        console.log('✅ Weight log added:', weightLog.weight, 'lbs');
    } catch (error) {
        console.error('Error adding weight log:', error);
    }
}

async function getAllWeightLogs() {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            return [];
        }
        
        const allLogs = await dbGetAll('weight_logs');
        return allLogs.filter(log => log.userId === userId);
    } catch (error) {
        console.warn('Error getting weight logs:', error);
        return [];
    }
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
    const oldWeight = userSettings.currentWeight;
    userSettings.currentWeight = weight;
    userSettings.lastWeighIn = today;
    
    // === 12-WEEK LOCKED SYSTEM ===
    // Check if we've reached 12-week boundary
    const boundaryReached = checkPointsPeriodBoundary();
    
    // Check if goal reached (maintenance mode)
    const maintenancePoints = enterMaintenanceMode();
    
    // Points only change at boundaries or maintenance mode
    let pointsChanged = false;
    let pointsMessage = '';
    
    if (maintenancePoints) {
        pointsChanged = true;
        pointsMessage = `\n\n🎉 GOAL REACHED! Entering maintenance mode.\nDaily points increased to ${maintenancePoints} (no deficit).`;
    } else if (boundaryReached) {
        pointsChanged = true;
        pointsMessage = `\n\n📅 12-week period ended. Points recalculated to ${userSettings.lockedPoints}.`;
    } else {
        pointsMessage = `\n\n🔒 Points locked at ${userSettings.lockedPoints}/day until ${userSettings.pointsPeriodEnd}`;
    }

    await saveSettings(userSettings);
    await updateAllUI();
    
    const weightChange = oldWeight ? weight - oldWeight : 0;
    const weeklyGoal = calculateWeeklyGoal();
    
    let message = `Weight updated to ${weight} lbs!`;
    
    if (weightChange !== 0) {
        message += `\n\nChange: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`;
    }
    
    message += `\nWeekly goal: ${weeklyGoal.toFixed(1)} lbs/week`;
    message += `\nTo go: ${(weight - userSettings.goalWeight).toFixed(1)} lbs`;
    message += pointsMessage;
    
    alert(message);
}

// Test API Connection
async function testAPIConnection() {
    const btn = document.getElementById('apiTestBtn');
    const result = document.getElementById('apiTestResult');
    
    // Read current form values
    const proxyUrlInput = document.getElementById('settingsProxyUrl');
    const useProxyInput = document.getElementById('settingsUseProxy');
    
    const currentProxyUrl = proxyUrlInput ? proxyUrlInput.value.trim() : PROXY_URL;
    const currentUseProxy = useProxyInput ? useProxyInput.checked : USE_PROXY;
    
    btn.disabled = true;
    btn.textContent = '🔄 Testing...';
    result.innerHTML = '<div style="color: var(--text-secondary);">⏳ Sending test request...</div>';
    
    console.log('🧪 Testing API with:', {
        proxyUrl: currentProxyUrl,
        useProxy: currentUseProxy
    });
    
    try {
        // Validation
        if (currentUseProxy && !currentProxyUrl) {
            throw new Error('Cloudflare Worker URL is required when proxy is enabled');
        }
        
        if (!currentUseProxy && (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE')) {
            throw new Error('API key not configured. Add your API key in app.js (line ~10) or set up Cloudflare Worker proxy.');
        }
        
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
        
        if (currentUseProxy) {
            console.log('📡 Testing via Cloudflare Worker:', currentProxyUrl);
            response = await fetch(currentProxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
        } else {
            console.log('📡 Testing direct API connection');
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
            const errorText = await response.text();
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { error: { message: errorText } };
            }
            
            console.error('❌ API Error Response:', errorData);
            throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const aiResponse = data.content[0].text;
        
        console.log('✅ API Test successful:', aiResponse);
        
        result.innerHTML = `
            <div style="color: var(--success); padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 8px; border-left: 3px solid var(--success);">
                <strong>✅ API Connection Successful!</strong><br>
                <div style="font-size: 12px; margin-top: 5px; opacity: 0.9;">
                    • Response time: ${elapsed}ms<br>
                    • Model: claude-sonnet-4-20250514<br>
                    • Proxy: ${currentUseProxy ? 'Enabled (Cloudflare Worker)' : 'Disabled (Direct API)'}<br>
                    • URL: ${currentUseProxy ? currentProxyUrl : 'api.anthropic.com'}<br>
                    • Test response: "${aiResponse.substring(0, 50)}${aiResponse.length > 50 ? '...' : ''}"
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('❌ API Test Error:', error);
        
        let helpText = '';
        if (error.message.includes('CORS') || error.message.includes('blocked')) {
            helpText = 'Fix: Update Cloudflare Worker CORS settings to allow your GitHub Pages domain.';
        } else if (error.message.includes('API key not configured')) {
            helpText = 'Fix: Add your Claude API key to the Cloudflare Worker environment variables.';
        } else if (error.message.includes('Failed to fetch')) {
            helpText = 'Fix: Check your internet connection and Cloudflare Worker URL (make sure it ends with a /).';
        } else if (error.message.includes('Worker URL is required')) {
            helpText = 'Fix: Enter your Cloudflare Worker URL above or uncheck "Enable AI Features".';
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
async function updateWater(date, drops, foodWater) {
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            console.warn('No user ID for water update');
            return;
        }
        
        const waterRecord = {
            id: `water_${userId}_${date}`,
            userId: userId,
            date: date,
            drops: drops || 0,
            foodWater: foodWater || 0,
            timestamp: new Date().toISOString()
        };
        
        await dbPut('water', waterRecord);
    } catch (error) {
        console.error('Error updating water:', error);
    }
}

async function fillWaterDrop(dropNum) {
    const today = getTodayKey();
    const userId = getCurrentUserId();
    const currentWater = await getWaterByDate(userId, today);

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
    const userId = getCurrentUserId();
    const water = await getWaterByDate(userId, today);
    const manualDrops = water.drops || 0; // Manually clicked drops
    const foodWaterMl = water.foodWater || 0;
    
    // Calculate total water in ml
    const manualMl = manualDrops * 250;
    const totalMl = manualMl + foodWaterMl;
    
    // Calculate how many drops SHOULD be filled based on total
    const totalDropsFromWater = Math.floor(totalMl / 250);
    const dropsToShow = Math.min(8, totalDropsFromWater); // Max 8 drops
    
    // Fill drops based on total water
    for (let i = 1; i <= 8; i++) {
        const drop = document.getElementById(`drop${i}`);
        if (drop) {
            if (i <= dropsToShow) {
                drop.classList.add('filled');
            } else {
                drop.classList.remove('filled');
            }
        }
    }
    
    // Show detailed breakdown
    const totalDiv = document.getElementById('waterTotal');
    if (foodWaterMl > 0) {
        totalDiv.innerHTML = `
            <div style="font-weight: 600;">${totalMl}ml / 2000ml</div>
            <div style="font-size: 10px; opacity: 0.7;">
                💧 Direct: ${manualMl}ml (${manualDrops} cups) + 🍽️ Food: ${foodWaterMl}ml
            </div>
        `;
    } else {
        totalDiv.textContent = `${totalMl}ml / 2000ml (${dropsToShow}/8 cups)`;
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

// Save settings to database (used by import and other functions)
window.saveSettings = async function(settings) {
    try {
        if (!settings) return;
        const userId = getCurrentUserId();
        settings.userId = userId;
        settings.id = `user_${userId}`;
        await dbPut('settings', settings);
        // Update global userSettings
        userSettings = settings;
    } catch (error) {
        console.error('Error saving settings:', error);
    }
};

// ============ USER & SETTINGS HELPERS ============
// Note: getCurrentUserId() is provided by auth.js

async function getSettings() {
    try {
        const userId = getCurrentUserId();
        const settings = await dbGet('settings', `user_${userId}`);
        return settings || null;
    } catch (error) {
        console.warn('Error getting settings:', error);
        return null;
    }
}

async function getPreferences() {
    try {
        // Preferences are stored as part of userSettings
        // Return preference-related fields or defaults
        return {
            noGoFoods: userSettings?.noGoFoods || [],
            ingredientPrefs: userSettings?.ingredientPrefs || {}
        };
    } catch (error) {
        console.warn('Error getting preferences:', error);
        return {
            noGoFoods: [],
            ingredientPrefs: {}
        };
    }
}

// ============ ZERO-POINT FOOD HELPERS ============
// NOTE: Auto-badge logic disabled - bot's calculation is source of truth
// Keep zero-point-foods.json for educational reference only
//
// Future enhancement: Bot can explicitly check zero-point list and validate
// with context (e.g., "apple" = yes, "apple crisp" = no)

/*
// DISABLED: This caused false positives (e.g., "passion" matching "passion fruit")
// If re-enabling, bot should validate with full context instead of static matching

function isZeroPointFood(foodName) {
    if (!foodName) return false;
    if (!window.ZERO_POINT_FOODS) return false;

    const normalized = foodName.toLowerCase().trim();
    const allFoods = Object.values(ZERO_POINT_FOODS).flat();

    // Exclude processed/packaged foods - these should NEVER be zero points
    const processedKeywords = [
        'pastry', 'pastries', 'cookie', 'cookies', 'cake', 'cakes',
        'donut', 'donuts', 'doughnut', 'muffin', 'muffins',
        'croissant', 'brownie', 'brownies', 'pie', 'pies',
        'candy', 'chocolate', 'chips', 'crackers', 'snack',
        'flakey', 'flaky', 'frosted', 'glazed', 'fried',
        'packaged', 'processed', 'frozen dessert', 'ice cream'
    ];

    for (const keyword of processedKeywords) {
        if (normalized.includes(keyword)) {
            return false; // Immediately reject processed foods
        }
    }

    // Exclude brand names - branded products are rarely zero-point
    const brandKeywords = [
        'vachon', 'kraft', 'nestle', 'nabisco', 'kellogg',
        'general mills', 'pepsi', 'coca-cola', 'coke',
        'lay\'s', 'doritos', 'frito', 'oreo', 'chips ahoy'
    ];

    for (const brand of brandKeywords) {
        if (normalized.includes(brand)) {
            return false; // Reject branded processed foods
        }
    }

    // Helper to remove common plural endings for better matching
    const singularize = (word) => {
        if (word.endsWith('ies')) return word.slice(0, -3) + 'y';  // berries -> berry
        if (word.endsWith('es')) return word.slice(0, -2);         // tomatoes -> tomato
        if (word.endsWith('s')) return word.slice(0, -1);          // eggs -> egg
        return word;
    };

    return allFoods.some(zeroFood => {
        const zeroLower = zeroFood.toLowerCase();

        // Direct exact match
        if (normalized === zeroLower) {
            return true;
        }

        // Check if the zero-point food is a complete substring (with word boundaries)
        // e.g., "fresh strawberries" contains "strawberries"
        const pattern = new RegExp('\\b' + zeroLower.replace(/[()]/g, '').trim() + '\\b');
        if (pattern.test(normalized)) {
            return true;
        }

        // Word-by-word matching: ALL significant words from zero-point food must be present
        const userWords = normalized.split(/\s+/);
        const zeroWords = zeroLower.split(/\s+/).map(w => w.replace(/[(),]/g, '').trim()).filter(w => w.length >= 3);

        // Skip single-word zero foods for stricter matching (to avoid "passion" matching "passion fruit")
        if (zeroWords.length === 1) {
            // For single-word zero foods, require exact word match only
            const zeroWord = zeroWords[0];
            return userWords.some(userWord => {
                return userWord === zeroWord || singularize(userWord) === singularize(zeroWord);
            });
        }

        // For multi-word zero foods, require ALL words to be present
        // e.g., "chicken breast" requires both "chicken" AND "breast"
        const allWordsPresent = zeroWords.every(zeroWord => {
            return userWords.some(userWord => {
                if (userWord.length < 3) return false;

                // Direct match or singular/plural match
                if (userWord === zeroWord || singularize(userWord) === singularize(zeroWord)) {
                    return true;
                }

                // Partial match for compound words (minimum 4 chars overlap)
                if (zeroWord.length >= 4 && userWord.length >= 4) {
                    if (zeroWord.includes(userWord) || userWord.includes(zeroWord)) {
                        return true;
                    }
                }

                return false;
            });
        });

        return allWordsPresent;
    });
}

function getZeroPointBadge(foodName) {
    if (isZeroPointFood(foodName)) {
        return '<span class="zero-point-badge" style="background: #4caf50; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 5px;">0 pts</span>';
    }
    return '';
}
*/

// ============ DATABASE HELPER FUNCTIONS ============

async function getAllTasks() {
    try {
        const userId = getCurrentUserId();
        const allTasks = await dbGetAll('tasks');
        return allTasks.filter(t => t.userId === userId);
    } catch (error) {
        console.warn('Error getting all tasks:', error);
        return [];
    }
}

async function getTasksByDate(userId, date) {
    try {
        const tasks = await dbGetByUserAndDate('tasks', userId, date);
        return tasks || [];
    } catch (error) {
        console.warn('Error getting tasks by date:', error);
        return [];
    }
}

async function updateTask(id, updates) {
    try {
        const task = await dbGet('tasks', id);
        if (task) {
            Object.assign(task, updates);
            await dbPut('tasks', task);
        }
    } catch (error) {
        console.error('Error updating task:', error);
    }
}

async function deleteTask(id) {
    try {
        await dbDelete('tasks', id);
    } catch (error) {
        console.error('Error deleting task:', error);
    }
}

async function addFood(foodData) {
    try {
        // Validate that food has a name
        if (!foodData.name || foodData.name.trim() === '') {
            console.warn('Cannot add food: missing name');
            return null;
        }

        const userId = getCurrentUserId();
        const food = {
            id: `food_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            date: foodData.date,
            name: foodData.name.trim(),
            points: foodData.points || 0,
            time: foodData.time,
            timestamp: new Date().toISOString()
        };
        await dbPut('foods', food);
        return food;
    } catch (error) {
        console.error('Error adding food:', error);
        return null;
    }
}

async function getFoodsByDate(userId, date) {
    try {
        const foods = await dbGetByUserAndDate('foods', userId, date);
        return foods || [];
    } catch (error) {
        console.warn('Error getting foods by date:', error);
        return [];
    }
}

async function getExerciseByDate(userId, date) {
    try {
        const exercises = await dbGetByUserAndDate('exercise', userId, date);
        return exercises || [];
    } catch (error) {
        console.warn('Error getting exercise by date:', error);
        return [];
    }
}

async function addExercise(exerciseData) {
    try {
        // Validate that required fields are not empty
        if (!exerciseData.activity || !exerciseData.minutes || exerciseData.minutes <= 0) {
            console.warn('Cannot add exercise: missing or invalid data');
            return null;
        }

        const userId = getCurrentUserId();
        const exercise = {
            id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            date: exerciseData.date,
            activity: exerciseData.activity,
            minutes: exerciseData.minutes,
            points: exerciseData.points,
            time: exerciseData.time,
            timestamp: new Date().toISOString()
        };
        await dbPut('exercise', exercise);
        return exercise;
    } catch (error) {
        console.error('Error adding exercise:', error);
        return null;
    }
}

async function deleteExerciseByActivity(date, activity) {
    try {
        const userId = getCurrentUserId();
        const exercises = await getExerciseByDate(userId, date);
        const toDelete = exercises.filter(e => e.activity === activity);

        for (const exercise of toDelete) {
            await dbDelete('exercise', exercise.id);
        }

        console.log(`Deleted ${toDelete.length} ${activity} entries for ${date}`);
    } catch (error) {
        console.error('Error deleting exercise by activity:', error);
    }
}

async function getWaterByDate(userId, date) {
    try {
        const waters = await dbGetByUserAndDate('water', userId, date);
        return waters.length > 0 ? waters[0] : { drops: 0, foodWater: 0 };
    } catch (error) {
        console.warn('Error getting water by date:', error);
        return { drops: 0, foodWater: 0 };
    }
}

async function addFoodWaterToDate(date, ml) {
    try {
        const userId = getCurrentUserId();
        const water = await getWaterByDate(userId, date);
        const newFoodWater = (water.foodWater || 0) + ml;
        await updateWater(date, water.drops || 0, newFoodWater);
    } catch (error) {
        console.error('Error adding food water:', error);
    }
}

async function getSleepByDate(userId, date) {
    try {
        const sleeps = await dbGetByUserAndDate('sleep', userId, date);
        return sleeps.length > 0 ? sleeps[0] : null;
    } catch (error) {
        console.warn('Error getting sleep by date:', error);
        return null;
    }
}

async function updateSleepSession(id, updates) {
    try {
        const session = await dbGet('sleep', id);
        if (session) {
            Object.assign(session, updates);
            await dbPut('sleep', session);
        }
    } catch (error) {
        console.error('Error updating sleep session:', error);
    }
}

async function addStoreVisit(visitData) {
    try {
        const userId = getCurrentUserId();
        const visit = {
            id: `store_${Date.now()}`,
            userId: userId,
            ...visitData,
            timestamp: new Date().toISOString()
        };
        await dbPut('store_visits', visit);
    } catch (error) {
        console.error('Error adding store visit:', error);
    }
}

async function addPhoto(photoData) {
    try {
        const userId = getCurrentUserId();
        const photo = {
            id: `photo_${Date.now()}`,
            userId: userId,
            ...photoData,
            timestamp: new Date().toISOString()
        };
        await dbPut('photos', photo);
    } catch (error) {
        console.error('Error adding photo:', error);
    }
}

async function logMedTaken(medId, date, time) {
    try {
        const userId = getCurrentUserId();
        const log = {
            id: `medlog_${Date.now()}`,
            userId: userId,
            medId: medId,
            date: date,
            time: time,
            timestamp: new Date().toISOString()
        };
        await dbPut('med_logs', log);
    } catch (error) {
        console.error('Error logging med taken:', error);
    }
}

async function deleteMedLogsByMedAndDate(medId, date) {
    try {
        const userId = getCurrentUserId();
        const logs = await getMedLogsByDate(date);
        for (const log of logs) {
            if (log.medId === medId) {
                await dbDelete('med_logs', log.id);
            }
        }
    } catch (error) {
        console.error('Error deleting med logs:', error);
    }
}

// ============ EXERCISE TRACKING ============
function setupExerciseGrid() {
    updateExerciseGrid();
}

async function updateExerciseGrid() {
    const userId = getCurrentUserId();
    if (!userId) {
        console.warn('⚠️ No user ID for exercise grid');
        return;
    }
    
    const today = getTodayKey();
    const todayExercise = await getExerciseByDate(userId, today);
    
    const grid = document.getElementById('exerciseGrid');
    if (!grid) {
        console.warn('⚠️ Exercise grid element not found');
        return;
    }
    
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

// ============ SLEEP TRACKING V2.0 ============
// Enhanced with time pickers and manual override

let sleepSessionContext = {
    mode: null,
    pickedTime: null,
    calculatedHours: null,
    callback: null
};

async function goodNightButton() {
    try {
        // Check for incomplete session
        const incomplete = await getIncompleteSleepSession();
        
        if (incomplete) {
            // Scenario 3: Forgot to press Good Morning
            console.log('⚠️ Incomplete session found:', incomplete);
            showTimePickerDialog(
                "Last sleep not ended. When did you wake up?",
                async (time) => await handleRetroactiveEnd(incomplete, time)
            );
        } else {
            // Scenario 1: Normal flow - start new session
            await startSleepSession();
            alert('Starting sleep session. Good night! 😴');
            await updateSleepUI();
        }
    } catch (err) {
        console.error('Good night error:', err);
        alert('Error starting sleep session: ' + err.message);
    }
}

async function goodMorningButton() {
    try {
        const incomplete = await getIncompleteSleepSession();
        
        if (incomplete) {
            // Scenario 1: Normal flow - end existing session
            const start = new Date(incomplete.start_datetime);
            const now = new Date();
            const hours = (now - start) / (1000 * 60 * 60);
            
            console.log('📊 Sleep duration:', hours, 'hours');
            
            if (hours > 14) {
                // Too long - probably forgot
                console.log('⚠️ Duration > 14 hours, asking for wake time');
                showTimePickerDialog(
                    "Session > 14 hours. When did you wake up?",
                    async (time) => await handleEndWithTime(incomplete, time)
                );
            } else {
                // Valid duration - show confirmation
                showHoursConfirmDialog(hours, async (manualHours) => {
                    await endSleepSession(null, manualHours);
                    alert('Sleep logged! Good morning! ☀️');
                    await updateSleepUI();
                });
            }
        } else {
            // Scenario 2: Forgot to press Good Night
            console.log('⚠️ No active session, asking for sleep time');
            showTimePickerDialog(
                "Sleep not started. When did you fall asleep?",
                async (time) => await handleRetroactiveStart(time)
            );
        }
    } catch (err) {
        console.error('Good morning error:', err);
        alert('Error ending sleep session: ' + err.message);
    }
}

function showTimePickerDialog(title, callback) {
    const dialog = document.getElementById('timePickerDialog');
    const titleEl = document.getElementById('timePickerTitle');
    const input = document.getElementById('timePickerInput');
    
    titleEl.textContent = title;
    
    // Set default to current time
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    input.value = `${hours}:${minutes}`;
    
    dialog.style.display = 'flex';
    sleepSessionContext.callback = callback;
}

function confirmTimePicker() {
    const time = document.getElementById('timePickerInput').value;
    if (!time) {
        alert('Please select a time');
        return;
    }
    
    document.getElementById('timePickerDialog').style.display = 'none';
    
    if (sleepSessionContext.callback) {
        sleepSessionContext.callback(time);
    }
}

function cancelTimePicker() {
    document.getElementById('timePickerDialog').style.display = 'none';
    sleepSessionContext.callback = null;
}

function showHoursConfirmDialog(calculatedHours, confirmCallback) {
    const rounded = Math.round(calculatedHours * 10) / 10;
    const dialog = document.getElementById('hoursConfirmDialog');
    const calculatedSpan = document.getElementById('calculatedHours');
    const manualInput = document.getElementById('manualHours');
    
    calculatedSpan.textContent = rounded;
    manualInput.value = rounded;
    
    dialog.style.display = 'flex';
    sleepSessionContext.confirmCallback = confirmCallback;
    sleepSessionContext.calculatedHours = rounded;
}

function confirmHours(useCalculated) {
    const dialog = document.getElementById('hoursConfirmDialog');
    
    if (useCalculated) {
        // Use calculated hours
        sleepSessionContext.confirmCallback(null);
    } else {
        // Use manual hours
        const manual = parseFloat(document.getElementById('manualHours').value);
        if (isNaN(manual) || manual < 0 || manual > 16) {
            alert('Hours must be between 0 and 16');
            return;
        }
        sleepSessionContext.confirmCallback(manual);
    }
    
    dialog.style.display = 'none';
}

function cancelHoursConfirm() {
    document.getElementById('hoursConfirmDialog').style.display = 'none';
    sleepSessionContext.confirmCallback = null;
}

// Helper: Parse time string (HH:MM) to Date object
function parseTimeToDate(timeString, baseDate = new Date()) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date(baseDate);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return date;
}

// Helper: Calculate sleep duration in hours
function calculateSleepDuration(startTime, endTime) {
    return (endTime - startTime) / (1000 * 60 * 60);
}

// Helper: Unified sleep session end handler with time
async function handleSleepEndWithTime(session, time, options = {}) {
    const { startNewSession = false, logPrefix = '⏰', successMessage = 'Sleep logged! Good morning! ☀️' } = options;

    try {
        const endTime = parseTimeToDate(time);
        const startTime = new Date(session.start_datetime);

        // If end time is before start, it's the next day
        if (endTime <= startTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        console.log(`${logPrefix} End time:`, endTime.toISOString());

        // Calculate and validate duration
        const duration = calculateSleepDuration(startTime, endTime);

        if (duration > 14) {
            alert('Duration > 14 hours. Please check your times.');
            return;
        }

        // Show confirmation dialog
        showHoursConfirmDialog(duration, async (manualHours) => {
            await endSleepSession(endTime.toISOString(), manualHours);

            if (startNewSession) {
                await startSleepSession();
            }

            alert(successMessage);
            await updateSleepUI();
        });
    } catch (err) {
        console.error(`${logPrefix} error:`, err);
        alert('Error: ' + err.message);
    }
}

async function handleRetroactiveStart(time) {
    try {
        const now = new Date();
        const startTime = parseTimeToDate(time, now);

        // If time is in the future, assume it was yesterday
        if (startTime > now) {
            startTime.setDate(startTime.getDate() - 1);
        }

        console.log('🛏️ Retroactive start:', startTime.toISOString());

        // Start session with past time
        await startSleepSession(startTime.toISOString());

        // Calculate duration to now
        const duration = calculateSleepDuration(startTime, now);

        // Show confirmation
        showHoursConfirmDialog(duration, async (manualHours) => {
            await endSleepSession(null, manualHours);
            alert('Sleep logged! Good morning! ☀️');
            await updateSleepUI();
        });
    } catch (err) {
        console.error('Retroactive start error:', err);
        alert('Error: ' + err.message);
    }
}

async function handleRetroactiveEnd(session, time) {
    await handleSleepEndWithTime(session, time, {
        startNewSession: true,
        logPrefix: '⏰ Retroactive end',
        successMessage: 'Previous sleep logged! Starting new session. Good night! 😴'
    });
}

async function handleEndWithTime(session, time) {
    await handleSleepEndWithTime(session, time, {
        startNewSession: false,
        logPrefix: '⏰ End with time',
        successMessage: 'Sleep logged! Good morning! ☀️'
    });
}

async function updateSleepUI() {
    try {
        const incomplete = await getIncompleteSleepSession();
        const recent = await getRecentSleepSessions(7);

        const statusDiv = document.getElementById('sleepStatus');

        if (!statusDiv) return; // Element not on page

        // Helper to format duration safely
        const formatDuration = (hours) => {
            if (hours === undefined || hours === null || isNaN(hours)) {
                return 'N/A';
            }
            return Math.round(hours * 10) / 10;
        };

        if (incomplete) {
            const start = new Date(incomplete.start_datetime);
            const now = new Date();
            const duration = (now - start) / (1000 * 60 * 60);

            statusDiv.innerHTML = `
                <div style="padding: 15px; background: var(--primary); border-radius: 8px; margin: 10px 0;">
                    <p style="font-weight: bold; margin: 0 0 5px 0;">😴 Currently Sleeping</p>
                    <p style="margin: 0;">Started: ${start.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}</p>
                    <p style="margin: 5px 0 0 0;">Duration: ${formatDuration(duration)} hours</p>
                </div>
            `;
        } else {
            // Filter out incomplete sessions from display (they have no duration)
            const completedSessions = recent.filter(s => s.end_datetime && s.duration_hours !== undefined);

            if (completedSessions.length > 0) {
                const last = completedSessions[0];
                const lastStart = new Date(last.start_datetime);
                statusDiv.innerHTML = `
                    <div style="padding: 15px; background: var(--bg-light); border-radius: 8px; margin: 10px 0;">
                        <p style="font-weight: bold; margin: 0 0 5px 0;">Last Sleep</p>
                        <p style="margin: 0;">${formatDuration(last.duration_hours)} hours</p>
                        <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.7;">
                            ${lastStart.toLocaleDateString()} ${lastStart.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'})}
                        </p>
                    </div>
                `;
            } else {
                statusDiv.innerHTML = `
                    <div style="padding: 15px; background: var(--bg-light); border-radius: 8px; margin: 10px 0;">
                        <p style="margin: 0; opacity: 0.7;">No sleep logged yet</p>
                    </div>
                `;
            }
        }

        // Show history - only completed sessions
        const historyDiv = document.getElementById('sleepHistory');
        const completedForHistory = recent.filter(s => s.end_datetime && s.duration_hours !== undefined);

        if (historyDiv && completedForHistory.length > 0) {
            const validDurations = completedForHistory.filter(s => typeof s.duration_hours === 'number' && !isNaN(s.duration_hours));
            const avgHours = validDurations.length > 0
                ? validDurations.reduce((sum, s) => sum + s.duration_hours, 0) / validDurations.length
                : 0;

            historyDiv.innerHTML = `
                <h3 style="margin: 20px 0 10px 0;">Recent Sleep (7 days)</h3>
                <div style="padding: 15px; background: var(--bg-light); border-radius: 8px;">
                    ${completedForHistory.map(s => {
                        const start = new Date(s.start_datetime);
                        return `
                            <div style="padding: 8px 0; border-bottom: 1px solid var(--border);">
                                <span style="font-weight: 500;">${start.toLocaleDateString()}</span>
                                <span style="float: right; color: var(--primary); font-weight: bold;">${formatDuration(s.duration_hours)} hrs</span>
                            </div>
                        `;
                    }).join('')}
                    <div style="padding: 10px 0 0 0; font-weight: bold;">
                        Average: ${Math.round(avgHours * 10) / 10} hours
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error('Update sleep UI error:', err);
    }
}

// Legacy function for compatibility
async function logSleep(type) {
    if (type === 'night') {
        await goodNightButton();
    } else if (type === 'morning') {
        await goodMorningButton();
    }
}

async function setSleepQuality(quality) {
    // Quality can be added to most recent session
    const recent = await getRecentSleepSessions(1);
    if (recent.length > 0) {
        await updateSleepSession(recent[0].id, { quality });
        await updateSleepUI();
        alert('Sleep quality updated!');
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
    try {
        const container = document.getElementById('napLog');
        if (!container) return;
        
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
    } catch (error) {
        console.warn('Error updating nap log:', error);
    }
}

// ============ TASKS ============
async function addTask(type) {
    const input = document.getElementById(type + 'Input');
    const text = input.value.trim();

    if (text) {
        const userId = getCurrentUserId();
        await dbAdd('tasks', {
            userId: userId,
            date: getTodayKey(),
            type: type,
            text: text,
            status: 'active',
            timestamp: new Date().toISOString()
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
                    <button class="btn" onclick="reactivateTask('${task.id}')" style="flex: 1; font-size: 13px; padding: 8px;">
                        ▶️ Reactivate
                    </button>
                    <button class="btn btn-secondary" onclick="deleteDeferredTask('${task.id}')" style="flex: 1; font-size: 13px; padding: 8px;">
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
        const userId = getCurrentUserId();
        await dbAdd('medications', {
            userId: userId,
            name: name,
            dosage: dosage,
            status: 'active'
        });

        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        await updateAllUI();
    }
}

async function addScannedMed(name, dosage) {
    if (name && dosage) {
        const userId = getCurrentUserId();
        await dbAdd('medications', {
            userId: userId,
            name: name,
            dosage: dosage,
            status: 'active'
        });
        await updateAllUI();
    }
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

async function deactivateMedication(id) {
    if (confirm('Pause/deactivate this medication? All tracking history will be preserved.')) {
        // Mark medication as inactive - keeps all med_logs intact
        const med = await dbGet('medications', id);
        if (med) {
            med.status = 'inactive';
            await dbPut('medications', med);
            await updateAllUI();
        }
    }
}

async function reactivateMedication(id) {
    const med = await dbGet('medications', id);
    if (med) {
        med.status = 'active';
        await dbPut('medications', med);
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

// ============ UI UPDATES ============
async function updateWeightDisplay() {
    // Safety check: wait for userSettings
    if (!userSettings) {
        console.warn('⚠️ updateWeightDisplay: userSettings not loaded yet');
        const userId = getCurrentUserId();
        if (userId) {
            try {
                userSettings = await dbGet('settings', `user_${userId}`);
                console.log('✅ userSettings loaded for weight display');
            } catch (error) {
                console.error('❌ Failed to load userSettings:', error);
                return;
            }
        } else {
            return;
        }
    }
    
    safeSetText('currentWeight', `${userSettings.currentWeight || '--'} lbs`);
    safeSetText('goalWeight', `${userSettings.goalWeight || '--'} lbs`);
    
    const progress = calculateWeightProgress();
    const progressEl = document.getElementById('weightProgress');
    if (progressEl) progressEl.style.width = `${progress}%`;
    
    const weeklyGoal = calculateWeeklyGoal();
    safeSetText('weeklyGoal', weeklyGoal.toFixed(1));
    
    safeSetText('nextWeighin', getNextWeighinDate());
    
    console.log('✅ Weight display updated:', userSettings.currentWeight, 'lbs');
}

async function updatePointsDisplay() {
    try {
        const userId = getCurrentUserId();
        const today = getTodayKey();
        const foods = await getFoodsByDate(userId, today);
        const exercises = await getExerciseByDate(userId, today);
        
        const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
        const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
        const netPoints = foodPoints - exercisePoints;
        
        const dailyAllowance = userSettings ? userSettings.dailyPoints : 22;
        const remaining = dailyAllowance - netPoints;
        
        // Safe DOM updates
        safeSetText('pointsToday', netPoints);
        safeSetText('pointsRemaining', `${remaining} remaining`);
        safeSetText('dailyAllowance', dailyAllowance);
        
        // Bonus points (new system)
        const bonusPoints = await getBonusPoints();
        safeSetText('pointsBank', bonusPoints);
        
        // Show "Resets Monday" instead of expiry date
        safeSetText('bankExpiry', 'Resets Monday');
    } catch (error) {
        console.warn('Error updating points display:', error);
    }
}

// Get bonus points (rollover from previous days)
async function getBonusPoints() {
    try {
        // For now, return 0 - full implementation would track daily rollover
        // This prevents the ReferenceError
        return 0;
    } catch (error) {
        console.warn('Error getting bonus points:', error);
        return 0;
    }
}

async function updateTodayLog() {
    try {
        const userId = getCurrentUserId();
        const today = getTodayKey();
        const foods = await getFoodsByDate(userId, today);
        const exercises = await getExerciseByDate(userId, today);
        
        const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
        const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
        const netPoints = foodPoints - exercisePoints;
        
        const logContainer = document.getElementById('todayLog');
        if (!logContainer) return;
        
        logContainer.innerHTML = `
            <div style="margin-bottom: 15px;">
                <strong>Food:</strong> ${foodPoints} pts
                ${exercisePoints > 0 ? `<br><strong>Exercise:</strong> -${exercisePoints} pts` : ''}
                <br><strong>Net:</strong> ${netPoints} pts
            </div>
            ${foods.map(f => {
                // Show points as calculated - no auto-badge based on static list
                const pointsDisplay = f.points === 0 ?
                    `<span style="color: #28a745; font-weight: bold;">0 pts</span>` :
                    `${f.points}pts`;
                return `<div style="margin-bottom: 5px;">${f.time} - ${f.name} (${pointsDisplay})</div>`;
            }).join('')}
        `;
    } catch (error) {
        console.warn('Error updating today log:', error);
    }
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
    const userId = getCurrentUserId();
    const allTasks = await getTasksByDate(userId, today);

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
                        <button class="task-btn done" onclick="updateTaskStatus('${type}', '${task.id}', 'complete')">✓ Done</button>
                        <button class="task-btn defer" onclick="deferTask('${task.id}')">⏸️ Defer</button>
                    </div>
                </div>
            `).join('');
    });
}

async function updateMedsDisplay() {
    const today = getTodayKey();
    const allMeds = await getAllMedications();
    // Only show active medications
    const meds = allMeds.filter(med => !med.status || med.status === 'active');
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
                        <div style="display: flex; gap: 5px;">
                            ${anyTaken ? `<button class="reset-btn" onclick="resetMedication('${med.id}')">↺ Reset</button>` : ''}
                            <button class="reset-btn" onclick="deactivateMedication('${med.id}')" style="background: var(--warning); color: white;">⏸️ Pause</button>
                        </div>
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">${med.dosage}</div>
                    <div class="med-time-group">
                        <button class="med-time-btn ${takenMorning ? 'taken' : ''}" onclick="markMedTaken('${med.id}', 'morning')">
                            Morning
                        </button>
                        <button class="med-time-btn ${takenAfternoon ? 'taken' : ''}" onclick="markMedTaken('${med.id}', 'afternoon')">
                            Afternoon
                        </button>
                        <button class="med-time-btn ${takenEvening ? 'taken' : ''}" onclick="markMedTaken('${med.id}', 'evening')">
                            Evening
                        </button>
                    </div>
                </div>
            `;
        }).join('');
}

// ============ EXPORT / IMPORT ============
async function exportAllData() {
    try {
        const userId = getCurrentUserId();
        const data = {
            version: APP_VERSION,
            exportDate: new Date().toISOString(),
            userId: userId,
            settings: await getSettings(),
            foods: await dbGetAll('foods').catch(() => []),
            exercise: await dbGetAll('exercise').catch(() => []),
            water: await dbGetAll('water').catch(() => []),
            sleep: await dbGetAll('sleep').catch(() => []),
            tasks: await dbGetAll('tasks').catch(() => []),
            medications: await dbGetAll('medications').catch(() => []),
            med_logs: await dbGetAll('med_logs').catch(() => []),
            weight_logs: await dbGetAll('weight_logs').catch(() => []),
        };
        return data;
    } catch (error) {
        console.error('Error exporting data:', error);
        return {};
    }
}

async function importAllData(data) {
    try {
        if (!data || !data.version) {
            throw new Error('Invalid backup file');
        }
        
        // Import settings
        if (data.settings) {
            await window.saveSettings(data.settings);
        }
        
        // Import other data
        const stores = ['foods', 'exercise', 'water', 'sleep', 'tasks', 'medications', 'med_logs', 'weight_logs'];
        for (const store of stores) {
            if (data[store] && Array.isArray(data[store])) {
                for (const item of data[store]) {
                    try {
                        await dbPut(store, item);
                    } catch (err) {
                        console.warn(`Error importing ${store} item:`, err);
                    }
                }
            }
        }
        
        console.log('Data import complete');
    } catch (error) {
        console.error('Error importing data:', error);
        throw error;
    }
}

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
// OLD INITIALIZATION - DISABLED (Now handled by new auth system at line 293)
// document.addEventListener('DOMContentLoaded', init);

// setInterval(performDailyMaintenance, 60000); // Check daily maintenance every minute
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

function getRandomZeroPointFoods(category = null, count = 10) {
    if (!window.ZERO_POINT_FOODS) {
        return ['chicken breast', 'eggs', 'spinach', 'broccoli', 'apples'];
    }

    let allFoods = [];

    if (category) {
        // Get foods from specific category
        if (ZERO_POINT_FOODS[category]) {
            allFoods = ZERO_POINT_FOODS[category];
        }
    } else {
        // Get foods from all categories
        for (const cat in ZERO_POINT_FOODS) {
            allFoods = allFoods.concat(ZERO_POINT_FOODS[cat]);
        }
    }

    // Shuffle and return random selection
    const shuffled = allFoods.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Generate formatted zero-point foods list for bot prompt
function getZeroPointFoodsList() {
    if (!window.ZERO_POINT_FOODS) {
        return `
- Non-Starchy Vegetables (artichokes, asparagus, broccoli, carrots, cauliflower, celery, cucumbers, lettuce, mushrooms, peppers, spinach, tomatoes, etc.)
- Fruits (apples, bananas, berries, oranges, grapes, melon, peaches, pears, strawberries, watermelon, etc.)
- Lean Meats & Poultry (skinless chicken breast, skinless turkey breast, lean ground chicken, lean ground turkey, pork tenderloin, lean beef, etc.)
- Fish & Shellfish (salmon, tuna, cod, tilapia, shrimp, crab, lobster, scallops, etc.)
- Eggs (whole eggs, egg whites)
- Plain Yogurt (nonfat plain yogurt, nonfat plain greek yogurt, nonfat cottage cheese)
- Beans & Legumes (black beans, chickpeas, lentils, kidney beans, pinto beans, split peas, etc.)
- Tofu & Tempeh
- Potatoes & Starchy Vegetables (all types of potatoes, sweet potatoes, corn, peas, winter squash, etc.)
- Whole Grains (oats, quinoa, brown rice, wild rice, barley, whole wheat pasta, whole grain bread)`;
    }

    // Format the actual loaded list
    let formatted = '';
    for (const [category, foods] of Object.entries(ZERO_POINT_FOODS)) {
        formatted += `\n- ${category}: ${foods.slice(0, 10).join(', ')}${foods.length > 10 ? ', etc.' : ''}`;
    }
    return formatted;
}

// Generate formatted zero-calorie overrides list for bot prompt
function getZeroCalorieOverridesList() {
    if (!window.ZERO_CALORIE_OVERRIDES) {
        return `
- Diet sodas and artificially sweetened beverages (Coke Zero, Diet Coke, etc.)
- Sugar-free processed foods (sugar-free candy, jello, cookies, etc.)
- Zero calorie condiments (spray butter, artificial sweeteners, etc.)

EXCEPTIONS that ARE zero-point: water, black coffee, plain unsweetened tea`;
    }

    const overrides = ZERO_CALORIE_OVERRIDES;
    let formatted = '';

    // Format beverages
    if (overrides.artificially_sweetened_beverages) {
        formatted += `\n- Artificially Sweetened Beverages (${overrides.minimum_points_assignment?.beverages || 1} pt minimum): ${overrides.artificially_sweetened_beverages.slice(0, 8).join(', ')}${overrides.artificially_sweetened_beverages.length > 8 ? ', etc.' : ''}`;
    }

    // Format processed foods
    if (overrides.sugar_free_processed_foods) {
        formatted += `\n- Sugar-Free Processed Foods (${overrides.minimum_points_assignment?.processed_foods || 2} pts minimum): ${overrides.sugar_free_processed_foods.slice(0, 6).join(', ')}${overrides.sugar_free_processed_foods.length > 6 ? ', etc.' : ''}`;
    }

    // Format condiments
    if (overrides.zero_calorie_condiments) {
        formatted += `\n- Zero Calorie Condiments (${overrides.minimum_points_assignment?.condiments || 1} pt minimum): ${overrides.zero_calorie_condiments.join(', ')}`;
    }

    // Add exceptions
    if (overrides.exceptions_that_ARE_zero_point?.allowed) {
        formatted += `\n\nEXCEPTIONS that ARE zero-point: ${overrides.exceptions_that_ARE_zero_point.allowed.join(', ')}`;
    }

    return formatted;
}

async function buildAIContext() {
    // Gather user context for better AI responses
    const userId = getCurrentUserId();
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
    const foods = await getFoodsByDate(userId, context.today);
    const exercise = await getExerciseByDate(userId, context.today);
    const water = await getWaterByDate(userId, context.today);
    
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
    
    // Add zero-point foods information for recipes
    context.zeroPointFoods = {
        categories: Object.keys(ZERO_POINT_FOODS),
        exampleFoods: getRandomZeroPointFoods(null, 10),
        note: 'Favor these zero-point foods in recipes and meal suggestions'
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

// Constant: Meal logging AI system prompt
// Generate meal logging system prompt with comprehensive zero-point validation
function getMealLoggingSystemPrompt() {
    const zeroPointFoodsList = getZeroPointFoodsList();
    const zeroCalorieOverrides = getZeroCalorieOverridesList();

    return `You are a food logging assistant. Parse the user's meal description and extract food items with quantities.

═══════════════════════════════════════════════════════
ZERO-POINT FOODS REFERENCE LIST
═══════════════════════════════════════════════════════
${zeroPointFoodsList}

═══════════════════════════════════════════════════════
ZERO-POINT VALIDATION RULES (CRITICAL - READ CAREFULLY)
═══════════════════════════════════════════════════════

You MUST check each food against the zero-point list above AND apply contextual logic:

✅ ASSIGN 0 POINTS IF:
1. Food is on the zero-point list above
2. AND prepared simply: grilled, baked, steamed, boiled, roasted (no oil), raw, fresh
3. AND no added fats, oils, sugar, cheese, sauces, or processed ingredients
4. Set "isZeroPoint": true in the JSON response

❌ CALCULATE POINTS NORMALLY IF:
1. Food is NOT on the zero-point list
2. OR food is on the list BUT prepared with added fats/oils/sugar:
   - Fried, sautéed, breaded, crispy, crunchy, glazed, candied
   - With butter, oil, cheese, cream sauce, gravy, dressing
   - Sweetened, honeyed, caramelized, frosted
3. OR food is processed/packaged (brand names, pre-made, frozen meals)
4. OR food is a dessert/baked good containing zero-point ingredients:
   - "Apple crisp" = Calculate (baked with sugar/butter)
   - "Banana bread" = Calculate (processed, added sugar/fat)
   - "Strawberry cheesecake" = Calculate (dessert)
   - "Chicken nuggets" = Calculate (breaded/fried)
5. Set "isZeroPoint": false in the JSON response

CONTEXTUAL EXAMPLES:
✅ "Fresh apple" → on list, simple → 0 pts, isZeroPoint: true
❌ "Apple crisp" → on list BUT baked dessert with sugar → Calculate pts, isZeroPoint: false
❌ "Apple pie" → on list BUT processed dessert → Calculate pts, isZeroPoint: false

✅ "Grilled chicken breast" → on list, simple → 0 pts, isZeroPoint: true
✅ "Baked skinless chicken breast" → on list, simple → 0 pts, isZeroPoint: true
❌ "Fried chicken breast" → on list BUT fried → Calculate pts, isZeroPoint: false
❌ "Chicken breast with cream sauce" → on list BUT added fat → Calculate pts, isZeroPoint: false
❌ "Breaded chicken" → on list BUT breaded → Calculate pts, isZeroPoint: false

✅ "Steamed broccoli" → on list, simple → 0 pts, isZeroPoint: true
❌ "Broccoli with cheese sauce" → on list BUT added cheese → Calculate pts, isZeroPoint: false
❌ "Broccoli sautéed in butter" → on list BUT added fat → Calculate pts, isZeroPoint: false

✅ "Fresh strawberries" → on list, simple → 0 pts, isZeroPoint: true
❌ "Strawberry cheesecake" → on list BUT dessert → Calculate pts, isZeroPoint: false
❌ "Strawberry smoothie with sugar" → on list BUT added sugar → Calculate pts, isZeroPoint: false

✅ "Baked potato" → on list, simple → 0 pts, isZeroPoint: true
❌ "Loaded baked potato" → on list BUT added toppings → Calculate pts, isZeroPoint: false
❌ "French fries" → on list BUT fried → Calculate pts, isZeroPoint: false

✅ "Passion fruit" → on list, fresh → 0 pts, isZeroPoint: true
❌ "Passion flakey pastries" → contains word "passion" BUT is pastry → Calculate pts, isZeroPoint: false
❌ "Vachon Passion pastries" → brand + pastry → Calculate pts, isZeroPoint: false

BRAND NAMES = ALWAYS CALCULATE:
If you see brand names (Vachon, Kraft, Nestlé, etc.), it's processed → Calculate points, isZeroPoint: false

WORD MATCHING LOGIC:
- Don't just match individual words - use FULL CONTEXT
- "Passion flakey pastries" is NOT "passion fruit" (it's a pastry!)
- "Apple crisp" is NOT "apples" (it's a baked dessert!)
- "Banana bread" is NOT "bananas" (it's processed bread!)
- Check preparation method AND food type together

═══════════════════════════════════════════════════════
ZERO-CALORIE OVERRIDE LIST (CRITICAL)
═══════════════════════════════════════════════════════

These foods calculate to 0 points mathematically BUT should NOT be treated as zero-point:
${zeroCalorieOverrides}

OVERRIDE RULE:
Even if SmartPoints formula = 0, you MUST assign minimum points for these items:
- Diet sodas/zero-calorie drinks → 1 pt minimum
- Sugar-free processed foods → 2 pts minimum
- Zero-calorie condiments → 1 pt minimum
- Set "isZeroPoint": false

RATIONALE: While mathematically 0 calories, these are artificially sweetened/processed foods, not whole foods like vegetables or fresh fruit. They don't align with the zero-point food philosophy.

OVERRIDE EXAMPLES:
❌ "Coke Zero (500ml)" → Formula = 0 pts, Override = 1 pt, isZeroPoint: false
❌ "Diet Coke" → Formula = 0 pts, Override = 1 pt, isZeroPoint: false
❌ "Sugar-free jello" → Formula = 0 pts, Override = 2 pts, isZeroPoint: false
✅ "Water" → Formula = 0 pts, Exception = 0 pts, isZeroPoint: true (allowed!)
✅ "Black coffee" → Formula = 0 pts, Exception = 0 pts, isZeroPoint: true (allowed!)
✅ "Plain unsweetened tea" → Formula = 0 pts, Exception = 0 pts, isZeroPoint: true (allowed!)

═══════════════════════════════════════════════════════
CRITICAL QUANTITY RULES
═══════════════════════════════════════════════════════
1. ALWAYS look for specific quantities in the user's message
2. If quantity is NOT specified, ASK the user (e.g., "How much rice did you have?")
3. Common serving sizes:
   - Rice/pasta: 1 cup COOKED = ~200 calories, ~5 pts
   - Chicken breast: 4 oz = ~120 calories, ~0 pts (if grilled/baked)
   - Eggs: 1 large egg = ~70 calories, ~0 pts (zero-point!)
   - Toast: 1 slice = ~80 calories, ~2 pts
   - Butter: 1 tablespoon = ~100 calories, ~3 pts

CALCULATION RULES:
1. Use SmartPoints formula: Points = (Calories × 0.0305) + (SatFat × 0.275) + (Sugar × 0.12) - (Protein × 0.098)
2. Round points to nearest whole number (use Math.round)
3. Be conservative - estimate on the HIGHER side if unsure
4. EXCEPTION: If food is on zero-point list and simply prepared, always use 0 points

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
- "small apple" → 1 medium apple (0 pts - zero-point!)
- "large chicken breast" → 6-8 oz (0 pts if grilled)
- "regular chicken breast" → 4 oz (0 pts if grilled)
- "half a sandwich" → 0.5 serving
- "quarter of a pizza" → 0.25 pizza

IF QUANTITY IS UNCLEAR:
Respond with: "I need to know the quantity. How much [food] did you have? (e.g., 1 cup, 4 oz, 2 slices)"

ONLY if quantities ARE specified, respond in JSON format:
{
  "foods": [
    {
      "name": "Grilled chicken breast",
      "quantity": "4 oz",
      "points": 0,
      "calories": 120,
      "isZeroPoint": true,
      "portionNote": "zero-point protein!"
    },
    {
      "name": "Steamed broccoli",
      "quantity": "1 cup",
      "points": 0,
      "calories": 30,
      "isZeroPoint": true,
      "portionNote": "zero-point veggie!"
    },
    {
      "name": "Cooked brown rice",
      "quantity": "1 cup",
      "points": 5,
      "calories": 215,
      "isZeroPoint": false,
      "portionNote": "cooked measurement"
    }
  ],
  "totalPoints": 5,
  "mealType": "lunch",
  "needsClarification": false
}

If clarification needed:
{
  "needsClarification": true,
  "question": "How much rice did you have? (1 cup, 2 cups, etc.)"
}`;
}

// Helper: Call Claude API for meal parsing
async function callMealParsingAPI(userMessage) {
    if (!USE_PROXY && (!CLAUDE_API_KEY || CLAUDE_API_KEY === 'YOUR_CLAUDE_API_KEY_HERE')) {
        throw new Error('API_NOT_CONFIGURED');
    }

    const requestBody = {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: getMealLoggingSystemPrompt(),
        messages: [{ role: 'user', content: userMessage }]
    };

    const response = USE_PROXY
        ? await fetch(PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody)
          })
        : await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': CLAUDE_API_KEY,
                  'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify(requestBody)
          });

    if (!response.ok) {
        throw new Error('API request failed');
    }

    const data = await response.json();
    return data.content[0].text;
}

// Helper: Parse and validate meal data from API response
function parseMealDataFromResponse(responseText) {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
        // AI is asking for clarification in plain text
        return { type: 'clarification', text: responseText };
    }

    const mealData = JSON.parse(jsonMatch[0]);

    if (mealData.needsClarification) {
        return {
            type: 'clarification',
            text: `❓ ${mealData.question}\n\nPlease be specific with quantities for accurate point tracking!`
        };
    }

    return { type: 'success', data: mealData };
}

// Helper: Check if food is zero-point (bot must explicitly set this)
function isFoodZeroPoint(food) {
    // Only trust bot's explicit determination, not static list matching
    return food.isZeroPoint === true;
}

// Helper: Log parsed meal items to database
async function logMealItems(mealData) {
    const today = getTodayKey();
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    for (const food of mealData.foods) {
        const finalPoints = isFoodZeroPoint(food) ? 0 : food.points;

        await addFood({
            date: today,
            name: `${food.name} (${food.quantity})`,
            points: finalPoints,
            time: currentTime,
            source: 'ai_voice_log',
            calories: food.calories
        });
    }
}

// Helper: Build confirmation message for logged meal
function buildMealConfirmation(mealData, context) {
    const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const mealTypeCapitalized = mealData.mealType.charAt(0).toUpperCase() + mealData.mealType.slice(1);

    let confirmation = `✅ **Meal Logged!**\n\n**${mealTypeCapitalized}:**\n`;

    // Add each food item
    mealData.foods.forEach(food => {
        const isZeroPoint = isFoodZeroPoint(food);
        const pointsDisplay = isZeroPoint
            ? `<span style="color: #28a745; font-weight: bold;">0 pts 🌟</span>`
            : `${food.points} pts`;

        confirmation += `• ${food.name} (${food.quantity}): ${pointsDisplay}`;
        if (food.portionNote) {
            confirmation += ` <em>${food.portionNote}</em>`;
        }
        confirmation += `\n`;
    });

    // Add summary
    const remaining = context.dailyPoints - (context.todayStats.foodPoints + mealData.totalPoints);
    confirmation += `\n**Total:** ${mealData.totalPoints} pts\n`;
    confirmation += `**Time:** ${currentTime}\n\n`;
    confirmation += `**Points Remaining Today:** ${remaining} pts`;

    // Add zero-point tip if applicable
    const hasZeroPoint = mealData.foods.some(isFoodZeroPoint);
    if (hasZeroPoint) {
        confirmation += `\n\n💡 <em>Great choice using zero-point foods! They let you eat more while staying in budget.</em>`;
    }

    return confirmation;
}

async function processMealLogging(userMessage, context) {
    try {
        // Call API to parse meal
        const responseText = await callMealParsingAPI(userMessage);

        // Parse and validate response
        const parsedResult = parseMealDataFromResponse(responseText);

        if (parsedResult.type === 'clarification') {
            return parsedResult.text;
        }

        // Log meal items to database
        await logMealItems(parsedResult.data);

        // Update UI
        await updateAllUI();

        // Return confirmation message
        return buildMealConfirmation(parsedResult.data, context);

    } catch (error) {
        console.error('Meal logging error:', error);

        if (error.message === 'API_NOT_CONFIGURED') {
            return "⚠️ API key not configured. I can't parse your meal automatically. Please use the manual food logger.";
        }

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
    
    // Get some zero-point foods to suggest
    const zeroVeggies = getRandomZeroPointFoods('Vegetables', 5).join(', ');
    const zeroProteins = getRandomZeroPointFoods('Poultry & Meat', 3).join(', ');
    const zeroFish = getRandomZeroPointFoods('Fish & Shellfish', 3).join(', ');
    
    const systemPrompt = `You are a wellness-focused recipe creator. Generate recipes with:
1. Both metric AND imperial measurements
2. SmartPoints calculation (formula: Calories×0.0305 + SatFat×0.275 + Sugar×0.12 - Protein×0.098)
3. Clear cooking instructions
4. Prep time, cook time, servings

ZERO-POINT FOODS TO FAVOR (assign 0 points):
🥬 Vegetables: ${zeroVeggies}
🍗 Proteins: ${zeroProteins}
🐟 Seafood: ${zeroFish}
🥚 Also: eggs, egg whites, non-fat greek yogurt, beans, lentils, fresh fruits

RECIPE STRATEGY:
- Build recipes AROUND zero-point foods (bulk with veggies, protein base)
- Use zero-point foods to make recipes filling and satisfying
- Save points for flavor additions (oils, cheese, sauces)
- Example: Grilled chicken (0 pts) + roasted veggies (0 pts) + 1 tbsp olive oil dressing (3 pts) = 3 pts total!
- Mention which ingredients are zero-point in parentheses

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

Mark zero-point ingredients with: <span style="color: #28a745; font-weight: bold;">(0 pts)</span>

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

Zero-Point Foods (ALWAYS FAVOR in recipes):
These foods cost 0 points and should be prioritized in meal suggestions:
- ${context.zeroPointFoods.exampleFoods.slice(0, 5).join(', ')} (and many more)
- Categories: ${context.zeroPointFoods.categories.join(', ')}
- When suggesting recipes, build them around zero-point foods to maximize nutrition while minimizing points
- Examples: grilled chicken breast, steamed vegetables, fresh fruit, egg whites, non-fat greek yogurt

Be encouraging, specific, and action-oriented. Keep responses concise (2-3 paragraphs max). 
Use their name occasionally. Reference their current stats when relevant.
For exercise questions, suggest specific activities with duration and expected points.
For food questions, mention points and provide practical tips. ALWAYS mention if ingredients are zero-point.
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
async function switchTab(tab) {
    // Safety: wait if app not ready
    if (!appReady) {
        console.warn('⏳ App not ready, deferring tab switch');
        setTimeout(() => switchTab(tab), 300);
        return;
    }
    
    currentTab = tab;
    
    // Update session state
    updateSessionState({
        lastActiveTab: tab,
        lastActiveDate: new Date().toISOString().split('T')[0]
    });
    
    // Safely remove active from all
    const btns = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    btns.forEach(btn => {
        if (btn && btn.classList) btn.classList.remove('active');
    });
    
    contents.forEach(content => {
        if (content && content.classList) content.classList.remove('active');
    });
    
    // Safely add active to selected
    const tabContent = document.getElementById(tab + 'Tab');
    if (tabContent && tabContent.classList) {
        tabContent.classList.add('active');
    }
    
    // Find and activate button
    btns.forEach(btn => {
        if (btn && btn.onclick) {
            const str = btn.onclick.toString();
            if (str.includes(`switchTab('${tab}')`)) {
                if (btn.classList) btn.classList.add('active');
            }
        }
    });
    
    // Update AI context (if exists)
    if (typeof updateAIContext === 'function') {
        try {
            updateAIContext();
        } catch (e) {
            console.warn('updateAIContext error:', e);
        }
    }
    
    // Load settings if needed
    if (tab === 'settings') {
        console.log('🔍 Switching to settings tab, current userSettings:', {
            exists: !!userSettings,
            id: userSettings?.id,
            userId: userSettings?.userId,
            proxyUrl: userSettings?.proxyUrl,
            useProxy: userSettings?.useProxy
        });

        // Safety check: reload userSettings if missing
        if (!userSettings) {
            console.warn('⚠️ userSettings missing, reloading...');
            const userId = getCurrentUserId();
            if (userId) {
                try {
                    userSettings = await dbGet('settings', `user_${userId}`);
                    console.log('✅ userSettings reloaded:', {
                        id: userSettings?.id,
                        userId: userSettings?.userId,
                        proxyUrl: userSettings?.proxyUrl,
                        useProxy: userSettings?.useProxy
                    });
                } catch (error) {
                    console.error('❌ Failed to reload userSettings:', error);
                }
            }
        }

        // Ensure API config is loaded from dedicated storage
        await initAPIConfig();

        if (userSettings) {
            const els = {
            name: document.getElementById('settingsName'),
            email: document.getElementById('settingsEmail'),
            birthday: document.getElementById('settingsBirthday'),
            gender: document.getElementById('settingsGender'),
            weight: document.getElementById('settingsWeight'),
            goalWeight: document.getElementById('settingsGoalWeight'),
            heightFeet: document.getElementById('settingsHeightFeet'),
            heightInches: document.getElementById('settingsHeightInches'),
            activity: document.getElementById('settingsActivity'),
            resetTime: document.getElementById('settingsResetTime'),
            proxyUrl: document.getElementById('settingsProxyUrl')
            // useProxy checkbox removed - AI features are always enabled with hardcoded URL
        };

        if (els.name) els.name.value = userSettings.name || '';
        if (els.email) els.email.value = userSettings.email || '';
        if (els.birthday) els.birthday.value = userSettings.birthday || '';
        if (els.gender) els.gender.value = userSettings.gender || 'male';
        if (els.weight) els.weight.value = userSettings.currentWeight || '';
        if (els.goalWeight) els.goalWeight.value = userSettings.goalWeight || '';
        if (els.resetTime) els.resetTime.value = userSettings.resetTime || '04:00';

        // Populate API config with hardcoded values
        if (els.proxyUrl) {
            els.proxyUrl.value = 'https://ultimate-wellness.your4ship.workers.dev/';
            els.proxyUrl.readOnly = true; // Make it read-only
        }
        // No checkbox to populate anymore since it was removed

        console.log('🔍 Populated API form fields with hardcoded values:', {
            proxyUrlValue: els.proxyUrl?.value,
            hardcoded: true
        });
        
        const feet = Math.floor((userSettings.heightInInches || 0) / 12);
        const inches = (userSettings.heightInInches || 0) % 12;
        if (els.heightFeet) els.heightFeet.value = feet;
        if (els.heightInches) els.heightInches.value = inches;
        if (els.activity) els.activity.value = userSettings.activity || 'moderate';
        
        console.log('✅ Settings form populated:', {
            name: userSettings.name,
            email: userSettings.email,
            birthday: userSettings.birthday,
            currentWeight: userSettings.currentWeight
        });
        
        if (typeof displayPointsBreakdown === 'function') {
            try {
                displayPointsBreakdown();
            } catch (e) {
                console.warn('displayPointsBreakdown error:', e);
            }
        }
        } else {
            console.error('❌ userSettings still missing after reload attempt');
            alert('⚠️ Unable to load your settings. Please refresh the page.');
        }
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
    const allPantry = await dbGetAll('pantry_items');
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

// Update version display from database
async function updateVersionDisplay() {
    const version = userSettings?.appVersion || APP_VERSION;
    
    // Update header version
    const headerVersion = document.querySelector('.version');
    if (headerVersion) {
        headerVersion.textContent = `v${version}`;
    }
    
    // Update about section version
    const aboutVersion = document.getElementById('aboutVersion');
    if (aboutVersion) {
        aboutVersion.textContent = `Ultimate Wellness System v${version}`;
    }
}

async function updateAllUI() {
    await updateWeightDisplay();
    await updatePointsDisplay();
    await updateTodayLog();
    await updateWaterDisplay();
    await updateExercisePoints();
    await updateSleepLog();
    await updateSleepUI(); // v2.0 - Update sleep status and history
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
// Supports: JPEG, PNG, WebP, GIF, HEIC/HEIF (iOS), and video formats (MP4, MOV, WebM, etc.)
async function handleFileUpload(event) {
    let file = event.target.files[0];
    if (!file) return;

    const resultDiv = document.getElementById('scanResult');
    const useCaseSelector = document.getElementById('useCaseSelector');
    const container = document.getElementById('cameraContainer');
    const image = document.getElementById('scanImage');
    const video = document.getElementById('scanVideo');

    // Check if file is HEIC/HEIF and convert to JPEG
    const isHEIC = file.type === 'image/heic' || file.type === 'image/heif' ||
                   file.name.toLowerCase().endsWith('.heic') ||
                   file.name.toLowerCase().endsWith('.heif');

    if (isHEIC) {
        try {
            resultDiv.innerHTML = '<div class="spinner"></div><p>Converting iOS photo format...</p>';

            // Convert HEIC to JPEG using heic2any library
            const convertedBlob = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9
            });

            // Create a new File object from the converted blob
            file = new File([convertedBlob], file.name.replace(/\.heic$/i, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now()
            });
        } catch (error) {
            console.error('HEIC conversion error:', error);
            resultDiv.innerHTML = `
                <div style="color: var(--warning); padding: 20px; text-align: center;">
                    <p>⚠️ Could not convert iOS photo format</p>
                    <p style="font-size: 14px; margin-top: 10px;">Try using the camera feature instead.</p>
                </div>
            `;
            return;
        }
    }

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

    // Extract media type and base64 data from data URL
    // Example: "data:image/png;base64,iVBORw..." -> media_type: "image/png", base64Data: "iVBORw..."
    const [header, base64Data] = imageDataUrl.split(',');
    const mediaTypeMatch = header.match(/data:(image\/[^;]+)/);
    const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/jpeg';
    
    try {
        // For barcode scanning, use UPC lookup instead of just AI
        if (useCase === 'barcode') {
            resultDiv.innerHTML = '<div class="spinner"></div><p>Reading barcode...</p>';
            
            // First, use AI to extract the UPC code
            const upcPrompt = `Look at this image and extract any UPC, EAN, or barcode number you see.

Respond with ONLY the numeric code, nothing else. If you see multiple barcodes, return the longest one. If no barcode is visible, respond with "NONE".`;

            const upcResponse = await callClaudeVision(base64Data, upcPrompt, mediaType);
            const upcText = upcResponse.rawText || upcResponse.toString();
            const upcMatch = upcText.match(/\d{8,14}/); // Match 8-14 digit codes (UPC/EAN)
            
            if (!upcMatch) {
                // No UPC found, fall back to regular AI analysis
                resultDiv.innerHTML = '<div class="spinner"></div><p>No barcode detected, analyzing product visually...</p>';
                const prompt = getAnalysisPrompt(useCase);
                const response = await callClaudeVision(base64Data, prompt, mediaType);
                displayScanResult(response, useCase);
                return;
            }
            
            const upc = upcMatch[0];
            console.log(`📊 Extracted UPC: ${upc}`);
            
            // Lookup UPC in database/API
            resultDiv.innerHTML = '<div class="spinner"></div><p>Looking up product database...</p>';
            const productData = await lookupUPC(upc);
            
            // Show UPC product interface
            await showUPCProduct(productData, upc);
            return;
        }
        
        // For other scan types, use regular AI analysis
        const prompt = getAnalysisPrompt(useCase);
        const response = await callClaudeVision(base64Data, prompt, mediaType);
        
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
// Supports multiple image formats: JPEG, PNG, WebP, GIF
// mediaType should be in format 'image/jpeg', 'image/png', 'image/webp', etc.
async function callClaudeVision(base64Image, prompt, mediaType = 'image/jpeg') {
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
                            media_type: mediaType,
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

// ============ UPC BARCODE LOOKUP MODULE ============

// ============ CORS-SAFE UPC LOOKUP v2.2.2 ============
// 3-Level Cascade: Local Cache → OpenFoodFacts v2 API → Manual Entry
// Works on GitHub Pages without backend proxy

async function lookupUPC(upc) {
    try {
        console.log(`🔍 Looking up UPC: ${upc}`);

        // Use the comprehensive UPCDatabase module for multi-source lookup
        // This provides: local cache check, OpenFoodFacts, Barcode Monster, UPCitemdb APIs
        if (window.UPCDatabase) {
            const result = await window.UPCDatabase.lookupEnhanced(upc);
            return result;
        } else {
            console.error('❌ UPCDatabase module not loaded');
            return null;
        }

    } catch (error) {
        console.error('UPC lookup error:', error);
        return null; // Will trigger manual entry UI
    }
}

// Calculate SmartPoints from nutrition info
function calculateSmartPoints(nutrition) {
    // SmartPoints formula (simplified WW algorithm)
    // Points = (calories * 0.0305) + (saturated_fat * 0.275) + (sugar * 0.12) - (protein * 0.098)
    
    const calories = nutrition.calories || 0;
    const protein = nutrition.protein || 0;
    const sugar = nutrition.sugar || 0;
    const saturated_fat = nutrition.saturated_fat || 0;
    
    let points = (calories * 0.0305) + (saturated_fat * 0.275) + (sugar * 0.12) - (protein * 0.098);
    
    // Minimum 0 points
    points = Math.max(0, points);
    
    // Round to nearest whole number
    return Math.round(points);
}

// Parse serving size string to extract amount in grams
// Examples: "100g" → 100, "28g (1 oz)" → 28, "1 cup (240ml)" → 240
function parseServingSize(servingSizeStr) {
    if (!servingSizeStr) return 100;
    
    // Try to extract grams
    const gramsMatch = servingSizeStr.match(/(\d+\.?\d*)\s*g/i);
    if (gramsMatch) {
        return parseFloat(gramsMatch[1]);
    }
    
    // Try to extract ml (approximate as grams for liquids)
    const mlMatch = servingSizeStr.match(/(\d+\.?\d*)\s*ml/i);
    if (mlMatch) {
        return parseFloat(mlMatch[1]);
    }
    
    // Default to 100g if can't parse
    return 100;
}

// Show UPC product with editable points
async function showUPCProduct(productData, upc) {
    const resultDiv = document.getElementById('scanResult');
    
    if (!productData) {
        // Product not found - allow manual entry
        resultDiv.innerHTML = `
            <div class="card" style="margin-top: 15px; border: 2px solid var(--warning);">
                <h3>⚠️ UPC Not Found</h3>
                <p style="color: var(--text-secondary);">UPC: ${upc}</p>
                <p style="margin: 15px 0;">This barcode is not in our database. Please enter product details:</p>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Product Name:</label>
                    <input type="text" id="manualProductName" placeholder="e.g., Organic Milk" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
                </div>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">Brand (optional):</label>
                    <input type="text" id="manualBrand" placeholder="e.g., Organic Valley" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
                </div>
                
                <div style="margin: 15px 0;">
                    <label style="display: block; margin-bottom: 5px; font-weight: bold;">SmartPoints:</label>
                    <input type="number" id="manualPoints" value="0" min="0" style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg-light); color: var(--text);">
                </div>
                
                <button class="btn" onclick="saveManualUPC('${upc}')">
                    💾 Save to Local Database
                </button>
                <button class="btn btn-secondary" style="margin-left: 10px;" onclick="closeScan()">
                    Cancel
                </button>
            </div>
        `;
        return;
    }
    
    // Product found - show with editable points
    const pointsStatus = productData.verified ? '✓ Verified by you' : '⚠️ From OpenFoodFacts - Please verify';
    const statusColor = productData.verified ? 'var(--success)' : 'var(--warning)';
    const sourceTag = productData.source === 'openfoodfacts' ? '🌐 OpenFoodFacts' : '💾 Local Cache';
    
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                <div>
                    <h3 style="margin: 0;">${productData.product_name}</h3>
                    ${productData.brand ? `<p style="color: var(--text-secondary); margin: 5px 0;">${productData.brand}</p>` : ''}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); text-align: right;">
                    ${sourceTag}<br>
                    UPC: ${upc}
                </div>
            </div>
            
            ${productData.image_url ? `
                <img src="${productData.image_url}" alt="${productData.product_name}" style="max-width: 200px; max-height: 200px; margin: 15px 0; border-radius: 8px;">
            ` : ''}
            
            <div style="margin: 15px 0;">
                <div style="font-size: 14px; color: ${statusColor}; margin-bottom: 10px;">
                    ${pointsStatus}
                </div>

                <!-- Standardized Points per 100g/100ml (Base Calculation) -->
                ${productData.points_per_100g ? `
                    <div style="background: var(--bg-light); padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid var(--primary);">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 5px;">
                            📊 Standardized (per 100g/100ml):
                        </div>
                        <div style="font-size: 28px; font-weight: bold; color: var(--primary);">
                            ${productData.points_per_100g} points
                        </div>
                    </div>
                ` : ''}

                <!-- Serving Size Points (For Logging) -->
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">
                    SmartPoints per serving (${productData.serving_size || 'serving'}):
                </label>
                <input type="number" id="upcPoints" value="${productData.points}" min="0"
                    onchange="highlightPointsChange('${upc}', ${productData.points})"
                    style="width: 100px; padding: 10px; font-size: 24px; font-weight: bold; border: 2px solid var(--success); border-radius: 8px; background: var(--bg-light); color: var(--success); text-align: center;">
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 5px;">
                    This is what will be logged to your food diary
                </div>
            </div>
            
            ${productData.nutrition ? `
                <div style="font-size: 13px; color: var(--text-secondary); margin: 15px 0; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                    <strong style="color: var(--text);">Nutrition per 100g:</strong><br>
                    <div style="margin-top: 8px; line-height: 1.6;">
                        📊 ${Math.round(productData.nutrition.calories)} calories<br>
                        💪 ${Math.round(productData.nutrition.protein)}g protein<br>
                        🍞 ${Math.round(productData.nutrition.carbs)}g carbs (${Math.round(productData.nutrition.sugar)}g sugar)<br>
                        🥑 ${Math.round(productData.nutrition.fat)}g fat (${Math.round(productData.nutrition.saturated_fat)}g saturated)<br>
                        ${productData.nutrition.fiber ? `🌾 ${Math.round(productData.nutrition.fiber)}g fiber<br>` : ''}
                        ${productData.nutrition.sodium ? `🧂 ${Math.round(productData.nutrition.sodium * 1000)}mg sodium` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div id="pointsChangeWarning" style="display: none; margin: 15px 0; padding: 15px; background: var(--warning); color: #000; border-radius: 8px; font-weight: bold;">
                ⚠️ Points changed from ${productData.points} to <span id="newPoints"></span>
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

// Highlight when points are changed
function highlightPointsChange(upc, originalPoints) {
    const newPoints = parseInt(document.getElementById('upcPoints').value);
    const warning = document.getElementById('pointsChangeWarning');
    const newPointsSpan = document.getElementById('newPoints');
    
    if (newPoints !== originalPoints) {
        warning.style.display = 'block';
        newPointsSpan.textContent = newPoints;
    } else {
        warning.style.display = 'none';
    }
}

// Confirm UPC product and save to cache
async function confirmUPCProduct(upc, productData) {
    const points = parseInt(document.getElementById('upcPoints').value);
    const originalPoints = productData.points;
    
    // Check if points were changed
    if (points !== originalPoints) {
        const confirmed = confirm(`UPC ${upc}: Change points from ${originalPoints} to ${points}?\n\nThis will be saved for future scans.`);
        if (!confirmed) {
            return;
        }
    }
    
    // Update points
    productData.points = points;
    productData.verified = true;

    // Save to local cache using UPCDatabase module
    if (window.UPCDatabase) {
        await window.UPCDatabase.saveProduct(productData);
        console.log(`✅ Saved UPC ${upc} with ${points} points to local cache`);
    } else {
        console.error('❌ UPCDatabase module not loaded');
    }
    
    // Log food
    await logFood(productData.product_name, points, null);
    
    // Show success
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px; text-align: center;">
            <h3 style="color: var(--success);">✅ Logged Successfully!</h3>
            <p>${productData.product_name}</p>
            <p style="font-size: 32px; font-weight: bold; color: var(--primary);">${points} pts</p>
            <p style="font-size: 12px; color: var(--text-secondary); margin-top: 10px;">
                UPC ${upc} saved to local database
            </p>
            <button class="btn" style="margin-top: 20px;" onclick="closeScan()">
                Done
            </button>
        </div>
    `;
    
    // Update UI
    await updateAllUI();
}

// Save manual UPC entry
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
        nutrition: null,
        serving_size: 'serving',
        verified: true,
        source: 'manual'
    };

    // Save to local cache using UPCDatabase module
    if (window.UPCDatabase) {
        await window.UPCDatabase.saveProduct(productData);
        console.log(`✅ Saved manual UPC ${upc} to local cache`);
    } else {
        console.error('❌ UPCDatabase module not loaded');
    }
    
    // Log food
    await logFood(productName, points, null);
    
    // Show success
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px; text-align: center;">
            <h3 style="color: var(--success);">✅ Saved & Logged!</h3>
            <p>${productName}</p>
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
    
    // Update UI
    await updateAllUI();
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

// ============================================================================
// HELPER FUNCTIONS FOR AUTH SYSTEM
// ============================================================================

// Note: getCurrentUserId() is defined in auth.js

function getCurrentUser() {
    return currentUser;
}

// ============================================================================
// AUTO-SAVE SESSION HOOKS
// ============================================================================

// Auto-save session on window close
window.addEventListener('beforeunload', () => {
    if (getCurrentUserId()) {
        saveSession();
    }
});

// Periodic session save (every 30 seconds)
console.log('⏰ Auto-save enabled: Session will save every 30 seconds');
let autoSaveCount = 0;

setInterval(() => {
    if (getCurrentUserId() && sessionState.initialized) {
        autoSaveCount++;
        console.log(`🔄 Auto-save #${autoSaveCount} triggered`);
        saveSession();
    }
}, 30000);

// Export functions for global access
// Note: getCurrentUserId is exported by auth.js
window.getCurrentUser = getCurrentUser;

console.log('✅ App.js fully loaded - Auth & Session system ready');
