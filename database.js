// ============ ULTIMATE WELLNESS DATABASE v2.2.0 ============
// Complete IndexedDB management with multi-user support

const DB_NAME = 'WellnessDB';
const DB_VERSION = 4; // Incremented for v2.2 (multi-user support)


let db;
let dbReady = false;
let dbInitPromise = null;

// ============ DATABASE INITIALIZATION ============

async function initDB() {
    // If already initializing, return that promise
    if (dbInitPromise) {
        console.log('Database initialization already in progress...');
        return dbInitPromise;
    }
    
    // Create initialization promise
    dbInitPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('❌ Database failed to open:', request.error);
            dbReady = false;
            dbInitPromise = null;
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            dbReady = true;
            console.log('✅ Database opened successfully (v' + DB_VERSION + ')');
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            const oldVersion = event.oldVersion;
            console.log(`🔄 Upgrading database from v${oldVersion} to v${DB_VERSION}...`);
            
            createObjectStores(db, oldVersion);
        };
    });
    
    return dbInitPromise;
}


// Export to window for app.js
window.initDB = initDB;
function createObjectStores(db, oldVersion) {
    // 1. Users table (NEW in v2.2 for multi-user support)
    if (!db.objectStoreNames.contains('users')) {
        const usersStore = db.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
        usersStore.createIndex('username', 'username', { unique: true });
        usersStore.createIndex('email', 'email', { unique: false });
        console.log('✅ Created: users');
    }
    
    // 2. User Settings (updated with userId)
    if (!db.objectStoreNames.contains('settings')) {
        const settingsStore = db.createObjectStore('settings', { keyPath: 'id' });
        settingsStore.createIndex('userId', 'userId', { unique: true });
        console.log('✅ Created: settings');
    } else if (oldVersion < 4) {
        // Migrate existing settings to include userId
        console.log('Migrating settings to include userId...');
    }
    
    // 3. Sleep Logs (add userId if upgrading)
    if (!db.objectStoreNames.contains('sleep')) {
        const sleepStore = db.createObjectStore('sleep', { keyPath: 'id', autoIncrement: true });
        sleepStore.createIndex('userId', 'userId', { unique: false });
        sleepStore.createIndex('date', 'date', { unique: false });
        sleepStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
        console.log('✅ Created: sleep');
    }
    
    // 4. Tasks (Want/Need/Grateful)
    if (!db.objectStoreNames.contains('tasks')) {
        const tasksStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        tasksStore.createIndex('userId', 'userId', { unique: false });
        tasksStore.createIndex('date', 'date', { unique: false });
        tasksStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
        console.log('✅ Created: tasks');
    }
    
    // 5. Weight Logs
    if (!db.objectStoreNames.contains('weight_logs')) {
        const weightStore = db.createObjectStore('weight_logs', { keyPath: 'id', autoIncrement: true });
        weightStore.createIndex('userId', 'userId', { unique: false });
        weightStore.createIndex('date', 'date', { unique: false });
        weightStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
        console.log('✅ Created: weight_logs');
    }
    
    // 6. Water Intake
    if (!db.objectStoreNames.contains('water')) {
        const waterStore = db.createObjectStore('water', { keyPath: 'id', autoIncrement: true });
        waterStore.createIndex('userId', 'userId', { unique: false });
        waterStore.createIndex('date', 'date', { unique: false });
        waterStore.createIndex('userId_date', ['userId', 'date'], { unique: true });
        console.log('✅ Created: water');
    }
    
    // 7. Medications
    if (!db.objectStoreNames.contains('medications')) {
        const medsStore = db.createObjectStore('medications', { keyPath: 'id', autoIncrement: true });
        medsStore.createIndex('userId', 'userId', { unique: false });
        medsStore.createIndex('name', 'name', { unique: false });
        console.log('✅ Created: medications');
    }
    
    // 8. Food Logs
    if (!db.objectStoreNames.contains('foods')) {
        const foodsStore = db.createObjectStore('foods', { keyPath: 'id', autoIncrement: true });
        foodsStore.createIndex('userId', 'userId', { unique: false });
        foodsStore.createIndex('date', 'date', { unique: false });
        foodsStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
        console.log('✅ Created: foods');
    }
    
    // 9. Exercise Logs
    if (!db.objectStoreNames.contains('exercise')) {
        const exerciseStore = db.createObjectStore('exercise', { keyPath: 'id', autoIncrement: true });
        exerciseStore.createIndex('userId', 'userId', { unique: false });
        exerciseStore.createIndex('date', 'date', { unique: false });
        exerciseStore.createIndex('userId_date', ['userId', 'date'], { unique: false });
        console.log('✅ Created: exercise');
    }
    
    // 10. Pantry Items
    if (!db.objectStoreNames.contains('pantry_items')) {
        const pantryStore = db.createObjectStore('pantry_items', { keyPath: 'id', autoIncrement: true });
        pantryStore.createIndex('userId', 'userId', { unique: false });
        pantryStore.createIndex('name', 'name', { unique: false });
        console.log('✅ Created: pantry_items');
    }
    
    // 11. Photos
    if (!db.objectStoreNames.contains('photos')) {
        const photosStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        photosStore.createIndex('userId', 'userId', { unique: false });
        photosStore.createIndex('date', 'date', { unique: false });
        console.log('✅ Created: photos');
    }
    
    // 12. Recipes
    if (!db.objectStoreNames.contains('recipes')) {
        const recipesStore = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
        recipesStore.createIndex('userId', 'userId', { unique: false });
        recipesStore.createIndex('name', 'name', { unique: false });
        console.log('✅ Created: recipes');
    }
    
    // 13. UPC Database (shared across users)
    if (!db.objectStoreNames.contains('upc_database')) {
        const upcStore = db.createObjectStore('upc_database', { keyPath: 'upc' });
        upcStore.createIndex('product_name', 'product_name', { unique: false });
        console.log('✅ Created: upc_database');
    }
    
    // 14. UPC Preferences (per user)
    if (!db.objectStoreNames.contains('upc_preferences')) {
        const prefsStore = db.createObjectStore('upc_preferences', { keyPath: 'id', autoIncrement: true });
        prefsStore.createIndex('userId', 'userId', { unique: false });
        prefsStore.createIndex('upc', 'upc', { unique: false });
        prefsStore.createIndex('userId_upc', ['userId', 'upc'], { unique: true });
        console.log('✅ Created: upc_preferences');
    }
    
    // 15. Login History (per user)
    if (!db.objectStoreNames.contains('login_history')) {
        const loginStore = db.createObjectStore('login_history', { keyPath: 'id', autoIncrement: true });
        loginStore.createIndex('userId', 'userId', { unique: false });
        loginStore.createIndex('timestamp', 'timestamp', { unique: false });
        console.log('✅ Created: login_history');
    }
    
    // 16. Improvement Log (per user)
    if (!db.objectStoreNames.contains('improvement_log')) {
        const logStore = db.createObjectStore('improvement_log', { keyPath: 'id', autoIncrement: true });
        logStore.createIndex('userId', 'userId', { unique: false });
        logStore.createIndex('date', 'date', { unique: false });
        console.log('✅ Created: improvement_log');
    }
    
    // 17. Sent Emails (per user)
    if (!db.objectStoreNames.contains('sent_emails')) {
        const emailStore = db.createObjectStore('sent_emails', { keyPath: 'id', autoIncrement: true });
        emailStore.createIndex('userId', 'userId', { unique: false });
        emailStore.createIndex('sentDate', 'sentDate', { unique: false });
        console.log('✅ Created: sent_emails');
    }
    
    // 18. Sync Queue (NEW - for cloud sync)
    if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('userId', 'userId', { unique: false });
        syncStore.createIndex('tableName', 'tableName', { unique: false });
        syncStore.createIndex('synced', 'synced', { unique: false });
        console.log('✅ Created: sync_queue');
    }
}

// ============ CRUD OPERATIONS (USER-SCOPED) ============

// ============ DATABASE SAFETY CHECK ============

async function ensureDBInitialized() {
    // If database is ready, return immediately
    if (db && dbReady) {
        return;
    }
    
    // If initialization is in progress, wait for it
    if (dbInitPromise) {
        console.log('⏳ Waiting for database initialization...');
        await dbInitPromise;
        return;
    }
    
    // If no initialization has started, throw error
    throw new Error('Database not initialized - call initDB() first');
}


async function dbPut(storeName, data) {
    await ensureDBInitialized();
    // Ensure userId is set
    if (!data.userId && storeName !== 'users' && storeName !== 'upc_database') {
        const currentUserId = getCurrentUserId();
        if (currentUserId) {
            data.userId = currentUserId;
        }
    }
    
    // Add sync metadata
    data._updatedAt = new Date().toISOString();
    data._needsSync = true;
    
    await ensureDBInitialized();
    return new Promise((resolve, reject) => {
    // Check if database is initialized
    if (!db) {
        console.error('Database not initialized');
        throw new Error('Database not initialized');
    }

        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => {
            // Add to sync queue
            if (storeName !== 'sync_queue') queueForSync(storeName, data, 'upsert');
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(storeName, key) {
    await ensureDBInitialized();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetAll(storeName, userId = null) {
    await ensureDBInitialized();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        // If userId provided, filter by user
        if (userId && store.indexNames.contains('userId')) {
            const index = store.index('userId');
            const request = index.getAll(userId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } else {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        }
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => {
            // Add to sync queue
            queueForSync(storeName, { id: key }, 'delete');
            resolve(request.result);
        };
        request.onerror = () => reject(request.error);
    });
}

async function dbClear(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============ QUERY HELPERS ============

async function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetByUserAndDate(storeName, userId, date) {
    await ensureDBInitialized();
    
    // Validate date parameter
    if (!date || typeof date !== 'string') {
        console.warn('Invalid date parameter:', date, '- using today');
        date = new Date().toISOString().split('T')[0];
    }
    
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            // Try compound index first
            if (store.indexNames.contains('userId_date')) {
                const index = store.index('userId_date');
                const request = index.getAll([userId, date]);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } else {
                // Fallback: get by userId and filter by date
                const index = store.index('userId');
                const request = index.getAll(userId);
                request.onsuccess = () => {
                    const filtered = request.result.filter(item => item.date === date);
                    resolve(filtered);
                };
                request.onerror = () => reject(request.error);
            }
        } catch (error) {
            reject(error);
        }
    });
}

async function dbGetByDateRange(storeName, userId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index('userId');
        const request = index.getAll(userId);
        
        request.onsuccess = () => {
            const filtered = request.result.filter(item => 
                item.date >= startDate && item.date <= endDate
            );
            resolve(filtered);
        };
        request.onerror = () => reject(request.error);
    });
}

// ============ USER MANAGEMENT ============

async function createUser(username, passwordHash, profile = {}) {
    const user = {
        username,
        passwordHash,
        email: profile.email || null,
        createdDate: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString(),
        isActive: true
    };
    
    const userId = await dbPut('users', user);
    
    // Create default settings for user
    await createDefaultSettings(userId, profile);
    
    return userId;
}

async function getUserByUsername(username) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('username');
        const request = index.get(username);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAllUsers() {
    return await dbGetAll('users');
}

async function updateUserLastLogin(userId) {
    const user = await dbGet('users', userId);
    if (user) {
        user.lastLogin = new Date().toISOString();
        await dbPut('users', user);
    }
}

// ============ SETTINGS HELPERS ============

async function getSettings(userId = null) {
    if (!userId) {
        userId = getCurrentUserId();
    }
    
    const settingsId = `user_${userId}`;
    return await dbGet('settings', settingsId);
}

window.getSettings = getSettings;
async function saveSettings(settings) {
    // Safety check - ensure settings object exists
    if (!settings) {
        console.error('saveSettings called with undefined/null settings');
        return null;
    }
    
    if (!settings.userId) {
        settings.userId = getCurrentUserId();
    }
    settings.id = `user_${settings.userId}`;
    settings._updatedAt = new Date().toISOString();
    return await dbPut('settings', settings);
}

async function createDefaultSettings(userId, profile = {}) {
    const today = new Date().toISOString().split('T')[0];
    
    const defaultSettings = {
        id: `user_${userId}`,
        userId: userId,
        
        // Profile
        name: profile.name || 'Guest',
        email: profile.email || null,
        birthday: null,
        gender: null,
        
        // Body Stats
        currentWeight: null,
        goalWeight: null,
        heightInInches: null,
        
        // Points
        dailyPoints: 23,
        activity: 'moderate',
        
        // Daily Reset Time (NEW in v2.2)
        dailyResetHour: 4,
        dailyResetMinute: 0,
        
        // Dates
        joinDate: today,
        lastWeighIn: null,
        lastPointsUpdate: null,
        
        // 12-week system
        periodStartDate: null,
        periodStartWeight: null,
        sixWeekCheckpointDone: false,
        
        // App
        appVersion: '2.2.0',
        lastUpdated: new Date().toISOString(),
        
        // First-time flags
        hasCompletedProfile: false,
        hasSeenWelcome: false
    };
    
    await saveSettings(defaultSettings);
    return defaultSettings;
}

// ============ USER SESSION ============

function getCurrentUserId() {
    const userIdStr = localStorage.getItem('currentUserId');
    return userIdStr ? parseInt(userIdStr) : null;
}

function setCurrentUserId(userId) {
    localStorage.setItem('currentUserId', userId.toString());
}

function clearCurrentUser() {
    localStorage.removeItem('currentUserId');
}

// ============ SYNC QUEUE (CLOUD PREPARATION) ============

async function queueForSync(tableName, data, operation) {
    try {
        const syncItem = {
            userId: data.userId || getCurrentUserId(),
            tableName: tableName,
            recordId: data.id,
            operation: operation, // 'upsert' or 'delete'
            data: operation === 'delete' ? null : data,
            timestamp: new Date().toISOString(),
            synced: false,
            syncAttempts: 0
        };
        
        await dbPut('sync_queue', syncItem);
    } catch (error) {
        console.warn('Failed to queue for sync:', error);
    }
}

async function getSyncQueue(userId = null, limit = 100) {
    if (!userId) {
        userId = getCurrentUserId();
    }
    
    const allQueue = await dbGetByIndex('sync_queue', 'userId', userId);
    const unsynced = allQueue.filter(item => !item.synced);
    
    return unsynced.slice(0, limit);
}

async function markSynced(syncQueueId) {
    const item = await dbGet('sync_queue', syncQueueId);
    if (item) {
        item.synced = true;
        item.syncedAt = new Date().toISOString();
        await dbPut('sync_queue', item);
    }
}

async function clearSyncQueue(userId = null) {
    if (!userId) {
        userId = getCurrentUserId();
    }
    
    const queue = await dbGetByIndex('sync_queue', 'userId', userId);
    for (const item of queue) {
        if (item.synced) {
            await dbDelete('sync_queue', item.id);
        }
    }
}

// ============ DATE HELPERS ============

function getTodayKey() {
    // Uses logical day based on reset time
    // This function will be overridden by session.js
    return new Date().toISOString().split('T')[0];
}

function getWeekStartDate() {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day;
    const weekStart = new Date(today.setDate(diff));
    return weekStart.toISOString().split('T')[0];
}

// ============ CONVENIENCE FUNCTIONS (USER-SCOPED) ============

async function getFoodsByDate(userId, date) {
    return await dbGetByUserAndDate('foods', userId, date);
}

async function getExerciseByDate(userId, date) {
    return await dbGetByUserAndDate('exercise', userId, date);
}

async function getWaterByDate(userId, date) {
    const water = await dbGetByUserAndDate('water', userId, date);
    return water[0] || { userId, date, drops: 0, foodWater: 0 };
}

async function getTasksByDate(userId, date) {
    return await dbGetByUserAndDate('tasks', userId, date);
}

async function getSleepByDate(userId, date) {
    const all = await dbGetByUserAndDate('sleep', userId, date);
    return all[0] || null;
}

async function getBonusPoints(userId) {
    const weekStart = getWeekStartDate();
    const today = getTodayKey();
    
    const weekExercise = await dbGetByDateRange('exercise', userId, weekStart, today);
    const totalMinutes = weekExercise.reduce((sum, e) => sum + (e.minutes || 0), 0);
    
    return Math.floor(totalMinutes / 15);
}

// ============ DATA MIGRATION ============

async function migrateToMultiUser() {
    console.log('🔄 Checking if migration needed...');
    
    // Check if we already have users
    const users = await getAllUsers();
    
    if (users.length === 0) {
        console.log('Creating default user for existing data...');
        
        // Create default user
        const userId = await createUser('default', 'no-password', { name: 'My Account' });
        
        // Migrate existing settings
        const oldSettings = await dbGet('settings', 'user');
        if (oldSettings) {
            oldSettings.userId = userId;
            oldSettings.id = `user_${userId}`;
            await saveSettings(oldSettings);
            await dbDelete('settings', 'user'); // Remove old settings
        }
        
        // Migrate all existing data to default user
        const tables = [
            'foods', 'exercise', 'weight_logs', 'sleep', 'water',
            'medications', 'tasks', 'pantry_items', 'recipes', 'photos'
        ];
        
        for (const tableName of tables) {
            const records = await dbGetAll(tableName);
            for (const record of records) {
                if (!record.userId) {
                    record.userId = userId;
                    await dbPut(tableName, record);
                }
            }
        }
        
        // Set as current user
        setCurrentUserId(userId);
        
        console.log('✅ Migration complete');
        return userId;
    }
    
    return null;
}

// ============ EXPORT ============
console.log('💾 Database v2.2.0 loaded - 18 tables, multi-user ready');

// ============ WINDOW EXPORTS (for app.js access) ============
window.initDB = initDB;
window.getCurrentUserId = getCurrentUserId;
window.setCurrentUserId = setCurrentUserId;
window.dbPut = dbPut;
window.dbGet = dbGet;
window.dbGetAll = dbGetAll;
window.dbDelete = dbDelete;
window.dbGetByIndex = dbGetByIndex;
window.dbGetByUserAndDate = dbGetByUserAndDate;
window.dbGetByDateRange = dbGetByDateRange;
window.getSettings = getSettings;
window.saveSettings = saveSettings;
window.createDefaultSettings = createDefaultSettings;
window.getAllUsers = getAllUsers;
window.createUser = createUser;
window.migrateToMultiUser = migrateToMultiUser;
