// ============ DATABASE LAYER - IndexedDB ============
// Handles all data persistence for multi-year tracking
// Tables: settings, foods, exercise, sleep, medications, water, tasks, photos, pantry, preferences, weightLogs

const APP_VERSION = '1.9.6';
const DB_NAME = 'UltimateWellnessDB';
const DB_VERSION = 3; // Bumped for upc_cache table
let db = null;

// Initialize IndexedDB
async function initDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Opening database:', DB_NAME, 'version:', DB_VERSION);
        
        // Add timeout
        const timeout = setTimeout(() => {
            reject(new Error('Database open timeout after 10 seconds'));
        }, 10000);
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            clearTimeout(timeout);
            console.error('❌ Database error:', request.error);
            console.error('❌ Error name:', request.error?.name);
            console.error('❌ Error message:', request.error?.message);
            reject(request.error);
        };
        
        request.onblocked = () => {
            clearTimeout(timeout);
            console.warn('⚠️ Database blocked - close other tabs using this app');
            reject(new Error('Database blocked by another tab. Please close other tabs and refresh.'));
        };
        
        request.onsuccess = () => {
            clearTimeout(timeout);
            db = request.result;
            
            // Add error handler to database
            db.onerror = (event) => {
                console.error('❌ Database error event:', event);
            };
            
            db.onversionchange = () => {
                console.warn('⚠️ Database version change detected');
                db.close();
                alert('Database updated. Please refresh the page.');
            };
            
            console.log('✅ Database initialized successfully');
            console.log('📋 Available tables:', Array.from(db.objectStoreNames));
            console.log('🔢 Table count:', db.objectStoreNames.length);
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            clearTimeout(timeout);
            db = event.target.result;
            console.log('🔧 Upgrading database from version', event.oldVersion, 'to', event.newVersion);
            console.log('📋 Existing tables:', Array.from(db.objectStoreNames));

            try {
                // SETTINGS table (single row)
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'id' });
                    console.log('   ✓ Created settings table');
                }

                // FOODS table (daily food logs)
                if (!db.objectStoreNames.contains('foods')) {
                    const foodStore = db.createObjectStore('foods', { keyPath: 'id', autoIncrement: true });
                    foodStore.createIndex('date', 'date', { unique: false });
                    foodStore.createIndex('name', 'name', { unique: false });
                    console.log('   ✓ Created foods table');
                }

                // EXERCISE table (daily exercise logs)
                if (!db.objectStoreNames.contains('exercise')) {
                    const exerciseStore = db.createObjectStore('exercise', { keyPath: 'id', autoIncrement: true });
                    exerciseStore.createIndex('date', 'date', { unique: false });
                    exerciseStore.createIndex('activity', 'activity', { unique: false });
                    console.log('   ✓ Created exercise table');
                }

                // SLEEP table (daily sleep logs)
                if (!db.objectStoreNames.contains('sleep')) {
                    const sleepStore = db.createObjectStore('sleep', { keyPath: 'id', autoIncrement: true });
                    sleepStore.createIndex('date', 'date', { unique: false });
                    console.log('   ✓ Created sleep table');
                }

                // MEDICATIONS table (medication definitions)
                if (!db.objectStoreNames.contains('medications')) {
                    db.createObjectStore('medications', { keyPath: 'id', autoIncrement: true });
                    console.log('   ✓ Created medications table');
                }

                // MED_LOGS table (daily medication tracking)
                if (!db.objectStoreNames.contains('med_logs')) {
                    const medLogStore = db.createObjectStore('med_logs', { keyPath: 'id', autoIncrement: true });
                    medLogStore.createIndex('date', 'date', { unique: false });
                    medLogStore.createIndex('medId', 'medId', { unique: false });
                    console.log('   ✓ Created med_logs table');
                }

                // WATER table (daily water intake)
                if (!db.objectStoreNames.contains('water')) {
                    const waterStore = db.createObjectStore('water', { keyPath: 'id', autoIncrement: true });
                    waterStore.createIndex('date', 'date', { unique: false });
                    console.log('   ✓ Created water table');
                }

                // TASKS table (daily tasks)
                if (!db.objectStoreNames.contains('tasks')) {
                    const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                    taskStore.createIndex('date', 'date', { unique: false });
                    taskStore.createIndex('type', 'type', { unique: false });
                    console.log('   ✓ Created tasks table');
                }

                // PHOTOS table (all photos - base64 or blob URLs)
                if (!db.objectStoreNames.contains('photos')) {
                    const photoStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                    photoStore.createIndex('date', 'date', { unique: false });
                    photoStore.createIndex('type', 'type', { unique: false }); // barcode, receipt, pantry
                    console.log('   ✓ Created photos table');
                }

                // PANTRY table (pantry items from receipts/snapshots)
                if (!db.objectStoreNames.contains('pantry')) {
                    const pantryStore = db.createObjectStore('pantry', { keyPath: 'id', autoIncrement: true });
                    pantryStore.createIndex('date', 'date', { unique: false });
                    pantryStore.createIndex('name', 'name', { unique: false });
                    console.log('   ✓ Created pantry table');
                }

                // PREFERENCES table (food likes/dislikes, no-go foods)
                if (!db.objectStoreNames.contains('preferences')) {
                    db.createObjectStore('preferences', { keyPath: 'id' });
                    console.log('   ✓ Created preferences table');
                }

                // WEIGHT_LOGS table (weight tracking history)
                if (!db.objectStoreNames.contains('weight_logs')) {
                    const weightStore = db.createObjectStore('weight_logs', { keyPath: 'id', autoIncrement: true });
                    weightStore.createIndex('date', 'date', { unique: false });
                    console.log('   ✓ Created weight_logs table');
                }

                // RECIPES table (saved/favorite recipes)
                if (!db.objectStoreNames.contains('recipes')) {
                    const recipeStore = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
                    recipeStore.createIndex('name', 'name', { unique: false });
                    console.log('   ✓ Created recipes table');
                }

                // STORES table (grocery store history)
                if (!db.objectStoreNames.contains('stores')) {
                    const storeStore = db.createObjectStore('stores', { keyPath: 'id', autoIncrement: true });
                    storeStore.createIndex('date', 'date', { unique: false });
                    storeStore.createIndex('store', 'store', { unique: false });
                    console.log('   ✓ Created stores table');
                }

                // POINTS_BANK table (banked points with expiry)
                if (!db.objectStoreNames.contains('points_bank')) {
                    const bankStore = db.createObjectStore('points_bank', { keyPath: 'id', autoIncrement: true });
                    bankStore.createIndex('date', 'date', { unique: false });
                    bankStore.createIndex('expires', 'expires', { unique: false });
                    console.log('   ✓ Created points_bank table');
                }
                
                if (!db.objectStoreNames.contains('naps')) {
                    const napStore = db.createObjectStore('naps', { keyPath: 'id', autoIncrement: true });
                    napStore.createIndex('date', 'date', { unique: false });
                    console.log('   ✓ Created naps table');
                }
                
                // UPC_CACHE table (barcode product lookup cache)
                if (!db.objectStoreNames.contains('upc_cache')) {
                    const upcStore = db.createObjectStore('upc_cache', { keyPath: 'upc' });
                    upcStore.createIndex('product_name', 'product_name', { unique: false });
                    upcStore.createIndex('verified', 'verified', { unique: false });
                    console.log('   ✓ Created upc_cache table');
                }

                console.log('✅ Database schema complete');
                console.log('📋 Final tables:', Array.from(db.objectStoreNames));
                
            } catch (upgradeError) {
                console.error('❌ Error during database upgrade:', upgradeError);
                reject(upgradeError);
            }
        };
    });
}

// ============ GENERIC DB OPERATIONS ============

async function dbAdd(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function dbClear(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ============ SPECIFIC DATA OPERATIONS ============

// Settings
async function getSettings() {
    const settings = await dbGet('settings', 'user');
    return settings || null;
}

async function saveSettings(settings) {
    settings.id = 'user';
    
    // Save to database
    await dbPut('settings', settings);
    
    // BACKUP to localStorage (survives cache clears)
    try {
        localStorage.setItem('userSettingsBackup', JSON.stringify({
            name: settings.name,
            email: settings.email,
            birthday: settings.birthday,
            gender: settings.gender,
            currentWeight: settings.currentWeight,
            goalWeight: settings.goalWeight,
            heightInInches: settings.heightInInches,
            activity: settings.activity,
            dailyPoints: settings.dailyPoints,
            joinDate: settings.joinDate,
            appVersion: settings.appVersion, // Include version in backup
            lastBackup: Date.now()
        }));
        console.log('✅ User settings backed up to localStorage');
    } catch (err) {
        console.error('⚠️ Failed to backup settings:', err);
    }
    
    return settings;
}

// Update app version in user settings
async function updateAppVersion() {
    const settings = await getSettings();
    if (settings) {
        const oldVersion = settings.appVersion || 'unknown';
        if (oldVersion !== APP_VERSION) {
            console.log(`📦 Updating app version: ${oldVersion} → ${APP_VERSION}`);
            settings.appVersion = APP_VERSION;
            settings.lastUpdated = new Date().toISOString();
            await saveSettings(settings);
        }
    }
}

// Restore settings from localStorage backup if database is empty
async function restoreSettingsFromBackup() {
    try {
        const backup = localStorage.getItem('userSettingsBackup');
        if (!backup) {
            return null;
        }
        
        const settings = JSON.parse(backup);
        console.log('📦 Found settings backup from localStorage');
        
        // Restore to database
        settings.id = 'user';
        settings.lastPointsUpdate = settings.lastPointsUpdate || getTodayKey();
        settings.lastWeighIn = settings.lastWeighIn || getTodayKey();
        
        await dbPut('settings', settings);
        console.log('✅ Restored user settings from backup');
        
        return settings;
    } catch (err) {
        console.error('❌ Failed to restore from backup:', err);
        return null;
    }
}

// Foods
async function addFood(food) {
    food.timestamp = Date.now();
    return await dbAdd('foods', food);
}

async function getFoodsByDate(date) {
    return await dbGetByIndex('foods', 'date', date);
}

async function getAllFoods() {
    return await dbGetAll('foods');
}

// Exercise
async function addExercise(exercise) {
    exercise.timestamp = Date.now();
    return await dbAdd('exercise', exercise);
}

async function getExerciseByDate(date) {
    return await dbGetByIndex('exercise', 'date', date);
}

async function deleteExerciseByActivity(date, activity) {
    const exercises = await getExerciseByDate(date);
    const toDelete = exercises.filter(e => e.activity === activity);
    for (const ex of toDelete) {
        await dbDelete('exercise', ex.id);
    }
}

// Sleep
async function addSleep(sleep) {
    sleep.timestamp = Date.now();
    return await dbAdd('sleep', sleep);
}

async function getSleepByDate(date) {
    const sleeps = await dbGetByIndex('sleep', 'date', date);
    return sleeps[0] || null;
}

async function updateSleep(id, updates) {
    const sleep = await dbGet('sleep', id);
    if (sleep) {
        Object.assign(sleep, updates);
        return await dbPut('sleep', sleep);
    }
}

// Medications
async function addMedication(med) {
    return await dbAdd('medications', med);
}

async function getAllMedications() {
    return await dbGetAll('medications');
}

async function deleteMedication(id) {
    return await dbDelete('medications', id);
}

// Medication Logs
async function logMedTaken(medId, date, time) {
    return await dbAdd('med_logs', { medId, date, time, taken: true, timestamp: Date.now() });
}

async function getMedLogsByDate(date) {
    return await dbGetByIndex('med_logs', 'date', date);
}

async function deleteMedLogsByMedAndDate(medId, date) {
    const logs = await dbGetByIndex('med_logs', 'date', date);
    const toDelete = logs.filter(l => l.medId === medId);
    for (const log of toDelete) {
        await dbDelete('med_logs', log.id);
    }
}

// Water
async function addWater(water) {
    return await dbAdd('water', water);
}

async function getWaterByDate(date) {
    const waters = await dbGetByIndex('water', 'date', date);
    return waters[0] || { drops: 0, foodWater: 0 };
}

async function updateWater(date, drops, foodWater) {
    const existing = await getWaterByDate(date);
    const data = {
        date,
        drops,
        foodWater: foodWater || existing.foodWater || 0,
        timestamp: Date.now()
    };
    
    if (existing.id) {
        data.id = existing.id;
        return await dbPut('water', data);
    } else {
        return await dbAdd('water', data);
    }
}

async function addFoodWaterToDate(date, ml) {
    const existing = await getWaterByDate(date);
    const currentFoodWater = existing.foodWater || 0;
    return await updateWater(date, existing.drops || 0, currentFoodWater + ml);
}

// Tasks
async function addTask(task) {
    task.timestamp = Date.now();
    return await dbAdd('tasks', task);
}

async function getTasksByDate(date) {
    return await dbGetByIndex('tasks', 'date', date);
}

async function getAllTasks() {
    return await dbGetAll('tasks');
}

async function updateTask(id, updates) {
    const task = await dbGet('tasks', id);
    if (task) {
        Object.assign(task, updates);
        return await dbPut('tasks', task);
    }
}

async function deleteTask(id) {
    return await dbDelete('tasks', id);
}

// Photos
async function addPhoto(photo) {
    photo.timestamp = Date.now();
    return await dbAdd('photos', photo);
}

async function getPhotosByType(type) {
    return await dbGetByIndex('photos', 'type', type);
}

async function getPhotosByDate(date) {
    return await dbGetByIndex('photos', 'date', date);
}

// Pantry
async function addPantryItem(item) {
    item.timestamp = Date.now();
    return await dbAdd('pantry', item);
}

async function getAllPantryItems() {
    return await dbGetAll('pantry');
}

async function getPantryItemsByDate(date) {
    return await dbGetByIndex('pantry', 'date', date);
}

// Preferences
async function getPreferences() {
    const prefs = await dbGet('preferences', 'user');
    return prefs || { noGoFoods: [], ingredientPrefs: {}, mealRatings: {}, kidApproved: [] };
}

async function savePreferences(prefs) {
    prefs.id = 'user';
    return await dbPut('preferences', prefs);
}

// Weight Logs
async function addWeightLog(log) {
    log.timestamp = Date.now();
    return await dbAdd('weight_logs', log);
}

async function getAllWeightLogs() {
    return await dbGetAll('weight_logs');
}

async function getLatestWeightLog() {
    const logs = await getAllWeightLogs();
    return logs.sort((a, b) => new Date(b.date) - new Date(a.date))[0] || null;
}

// Points Bank
// ============ BONUS POINTS SYSTEM ============
// New system: Earn bonuses, cap at 28/week, reset Mondays

async function getBonusPoints() {
    const all = await dbGetAll('points_bank');
    
    // Get start of current week (Monday)
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    const mondayKey = monday.toISOString().split('T')[0];
    
    // Only count points from this week (Monday onwards)
    const thisWeek = all.filter(p => p.date >= mondayKey);
    const total = thisWeek.reduce((sum, p) => sum + p.points, 0);
    
    // Cap at 28
    return Math.min(total, 28);
}

async function addBonusPoints(points, reason, date) {
    // Check current total
    const current = await getBonusPoints();
    
    if (current >= 28) {
        console.log('Bonus points cap reached (28/week)');
        return;
    }
    
    // Add points (will be capped on retrieval)
    return await dbAdd('points_bank', {
        points,
        reason,
        date,
        timestamp: Date.now()
    });
}

async function deductBonusPoints(points, reason, date) {
    // Deduct by adding negative points
    return await dbAdd('points_bank', {
        points: -points,
        reason,
        date,
        timestamp: Date.now()
    });
}

async function resetWeeklyBonusIfNeeded() {
    // Check if it's Monday and we haven't reset yet
    const now = new Date();
    const lastReset = localStorage.getItem('lastBonusReset');
    const currentMonday = getMonday(now).toISOString().split('T')[0];
    
    if (lastReset !== currentMonday) {
        // New week! Clear old bonus points
        console.log('🔄 New week - clearing old bonus points');
        
        const all = await dbGetAll('points_bank');
        const previousMonday = getMonday(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
        
        // Delete points from before current week
        const old = all.filter(p => p.date < currentMonday);
        for (const p of old) {
            await dbDelete('points_bank', p.id);
        }
        
        localStorage.setItem('lastBonusReset', currentMonday);
    }
}

function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Daily bonuses
async function awardDailyBonuses(date) {
    const today = date || getTodayKey();
    
    // Check if already awarded today
    const checkInKey = `bonusAwarded_${today}`;
    if (localStorage.getItem(checkInKey)) {
        return; // Already awarded
    }
    
    // Award 2 points for check-in
    await addBonusPoints(2, 'Daily check-in', today);
    
    // Check if under budget yesterday
    const yesterday = new Date(new Date(today).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const yesterdayFoods = await getFoodsByDate(yesterday);
    const yesterdayExercise = await getExerciseByDate(yesterday);
    const foodPoints = yesterdayFoods.reduce((sum, f) => sum + f.points, 0);
    const exercisePoints = yesterdayExercise.reduce((sum, e) => sum + e.points, 0);
    const netPoints = foodPoints - exercisePoints;
    
    if (netPoints < (userSettings?.dailyPoints || 22)) {
        // Was under budget! Award 2 bonus points
        await addBonusPoints(2, 'Under budget yesterday', today);
    }
    
    // Mark as awarded
    localStorage.setItem(checkInKey, 'true');
}

// Auto-deduct when over
async function handleOverBudget(overagePoints, date) {
    const bonusAvailable = await getBonusPoints();
    
    if (bonusAvailable > 0) {
        const toDeduct = Math.min(overagePoints, bonusAvailable);
        await deductBonusPoints(toDeduct, 'Used for overage', date);
        return toDeduct;
    }
    
    return 0;
}

// Old functions (kept for compatibility)
async function addToPointsBank(points, date, expires) {
    return await addBonusPoints(points, 'Legacy', date);
}

async function getPointsBank() {
    return getBonusPoints();
}

async function clearExpiredPointsBank() {
    await resetWeeklyBonusIfNeeded();
}

// Recipes
async function addRecipe(recipe) {
    recipe.timestamp = Date.now();
    return await dbAdd('recipes', recipe);
}

async function getAllRecipes() {
    return await dbGetAll('recipes');
}

// Stores
async function addStoreVisit(visit) {
    visit.timestamp = Date.now();
    return await dbAdd('stores', visit);
}

async function getStoresByDate(date) {
    return await dbGetByIndex('stores', 'date', date);
}

async function getTotalSpending(startDate, endDate) {
    const all = await dbGetAll('stores');
    const filtered = all.filter(s => s.date >= startDate && s.date <= endDate);
    return filtered.reduce((sum, s) => sum + (s.total || 0), 0);
}

// ============ EXPORT / IMPORT ============

async function exportAllData() {
    const data = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        settings: await dbGetAll('settings'),
        foods: await dbGetAll('foods'),
        exercise: await dbGetAll('exercise'),
        sleep: await dbGetAll('sleep'),
        medications: await dbGetAll('medications'),
        med_logs: await dbGetAll('med_logs'),
        water: await dbGetAll('water'),
        tasks: await dbGetAll('tasks'),
        photos: await dbGetAll('photos'),
        pantry: await dbGetAll('pantry'),
        preferences: await dbGetAll('preferences'),
        weight_logs: await dbGetAll('weight_logs'),
        recipes: await dbGetAll('recipes'),
        stores: await dbGetAll('stores'),
        points_bank: await dbGetAll('points_bank')
    };
    return data;
}

async function importAllData(data) {
    // Clear all existing data
    const stores = ['settings', 'foods', 'exercise', 'sleep', 'medications', 'med_logs', 
                    'water', 'tasks', 'photos', 'pantry', 'preferences', 'weight_logs', 
                    'recipes', 'stores', 'points_bank'];
    
    for (const store of stores) {
        await dbClear(store);
    }

    // Import all data
    for (const [storeName, items] of Object.entries(data)) {
        if (storeName === 'version' || storeName === 'exportDate') continue;
        
        for (const item of items) {
            await dbPut(storeName, item);
        }
    }

    console.log('✅ Data imported successfully');
}

// ============ UPC BARCODE CACHE ============

async function getUPCProduct(upc) {
    try {
        return await dbGet('upc_cache', upc);
    } catch (err) {
        return null; // Not in cache
    }
}

async function saveUPCProduct(upcData) {
    // upcData: { upc, product_name, brand, points, nutrition, verified, last_updated }
    upcData.last_updated = Date.now();
    return await dbPut('upc_cache', upcData);
}

async function getAllUPCProducts() {
    return await dbGetAll('upc_cache');
}

async function deleteUPCProduct(upc) {
    return await dbDelete('upc_cache', upc);
}

// ============ DAILY MAINTENANCE ============

async function performDailyMaintenance() {
    const today = getTodayKey(); // Use new 4am reset function
    const lastMaintenance = localStorage.getItem('lastMaintenance');
    
    if (lastMaintenance === today) return;

    console.log('🔧 Performing daily maintenance...');

    // Reset weekly bonus on Monday
    await resetWeeklyBonusIfNeeded();

    // Award daily bonuses (check-in + under budget)
    await awardDailyBonuses(today);

    // Check if yesterday was over budget - auto-use bonus points
    const yesterday = new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const settings = await getSettings();
    if (settings && settings.dailyPoints) {
        const yesterdayFoods = await getFoodsByDate(yesterday);
        const yesterdayExercise = await getExerciseByDate(yesterday);
        
        const foodPoints = yesterdayFoods.reduce((sum, f) => sum + f.points, 0);
        const exercisePoints = yesterdayExercise.reduce((sum, e) => sum + e.points, 0);
        const netPoints = foodPoints - exercisePoints;
        const overage = Math.max(0, netPoints - settings.dailyPoints);
        
        if (overage > 0) {
            const deducted = await handleOverBudget(overage, yesterday);
            console.log(`🎯 Used ${deducted} bonus points for overage on ${yesterday}`);
        }
    }

    localStorage.setItem('lastMaintenance', today);
    console.log('✅ Daily maintenance complete');
}
