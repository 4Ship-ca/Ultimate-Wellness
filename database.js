// ============ DATABASE LAYER - IndexedDB ============
// Handles all data persistence for multi-year tracking
// Tables: settings, foods, exercise, sleep, medications, water, tasks, photos, pantry, preferences, weightLogs

const DB_NAME = 'UltimateWellnessDB';
const DB_VERSION = 1;
let db = null;

// Initialize IndexedDB
async function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            console.log('✅ Database initialized');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('🔧 Creating database schema...');

            // SETTINGS table (single row)
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings', { keyPath: 'id' });
            }

            // FOODS table (daily food logs)
            if (!db.objectStoreNames.contains('foods')) {
                const foodStore = db.createObjectStore('foods', { keyPath: 'id', autoIncrement: true });
                foodStore.createIndex('date', 'date', { unique: false });
                foodStore.createIndex('name', 'name', { unique: false });
            }

            // EXERCISE table (daily exercise logs)
            if (!db.objectStoreNames.contains('exercise')) {
                const exerciseStore = db.createObjectStore('exercise', { keyPath: 'id', autoIncrement: true });
                exerciseStore.createIndex('date', 'date', { unique: false });
                exerciseStore.createIndex('activity', 'activity', { unique: false });
            }

            // SLEEP table (daily sleep logs)
            if (!db.objectStoreNames.contains('sleep')) {
                const sleepStore = db.createObjectStore('sleep', { keyPath: 'id', autoIncrement: true });
                sleepStore.createIndex('date', 'date', { unique: false });
            }

            // MEDICATIONS table (medication definitions)
            if (!db.objectStoreNames.contains('medications')) {
                db.createObjectStore('medications', { keyPath: 'id', autoIncrement: true });
            }

            // MED_LOGS table (daily medication tracking)
            if (!db.objectStoreNames.contains('med_logs')) {
                const medLogStore = db.createObjectStore('med_logs', { keyPath: 'id', autoIncrement: true });
                medLogStore.createIndex('date', 'date', { unique: false });
                medLogStore.createIndex('medId', 'medId', { unique: false });
            }

            // WATER table (daily water intake)
            if (!db.objectStoreNames.contains('water')) {
                const waterStore = db.createObjectStore('water', { keyPath: 'id', autoIncrement: true });
                waterStore.createIndex('date', 'date', { unique: false });
            }

            // TASKS table (daily tasks)
            if (!db.objectStoreNames.contains('tasks')) {
                const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
                taskStore.createIndex('date', 'date', { unique: false });
                taskStore.createIndex('type', 'type', { unique: false });
            }

            // PHOTOS table (all photos - base64 or blob URLs)
            if (!db.objectStoreNames.contains('photos')) {
                const photoStore = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
                photoStore.createIndex('date', 'date', { unique: false });
                photoStore.createIndex('type', 'type', { unique: false }); // barcode, receipt, pantry
            }

            // PANTRY table (pantry items from receipts/snapshots)
            if (!db.objectStoreNames.contains('pantry')) {
                const pantryStore = db.createObjectStore('pantry', { keyPath: 'id', autoIncrement: true });
                pantryStore.createIndex('date', 'date', { unique: false });
                pantryStore.createIndex('name', 'name', { unique: false });
            }

            // PREFERENCES table (food likes/dislikes, no-go foods)
            if (!db.objectStoreNames.contains('preferences')) {
                db.createObjectStore('preferences', { keyPath: 'id' });
            }

            // WEIGHT_LOGS table (weight tracking history)
            if (!db.objectStoreNames.contains('weight_logs')) {
                const weightStore = db.createObjectStore('weight_logs', { keyPath: 'id', autoIncrement: true });
                weightStore.createIndex('date', 'date', { unique: false });
            }

            // RECIPES table (saved/favorite recipes)
            if (!db.objectStoreNames.contains('recipes')) {
                const recipeStore = db.createObjectStore('recipes', { keyPath: 'id', autoIncrement: true });
                recipeStore.createIndex('name', 'name', { unique: false });
            }

            // STORES table (grocery store history)
            if (!db.objectStoreNames.contains('stores')) {
                const storeStore = db.createObjectStore('stores', { keyPath: 'id', autoIncrement: true });
                storeStore.createIndex('date', 'date', { unique: false });
                storeStore.createIndex('store', 'store', { unique: false });
            }

            // POINTS_BANK table (banked points with expiry)
            if (!db.objectStoreNames.contains('points_bank')) {
                const bankStore = db.createObjectStore('points_bank', { keyPath: 'id', autoIncrement: true });
                bankStore.createIndex('date', 'date', { unique: false });
                bankStore.createIndex('expires', 'expires', { unique: false });
            }

            console.log('✅ Database schema created');
        };
    });
}

// ============ GENERIC DB OPERATIONS ============

async function dbAdd(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

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

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function dbClear(storeName) {
    return new Promise((resolve, reject) => {
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
    return await dbPut('settings', settings);
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

async function updateTask(id, updates) {
    const task = await dbGet('tasks', id);
    if (task) {
        Object.assign(task, updates);
        return await dbPut('tasks', task);
    }
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
async function addToPointsBank(points, date, expires) {
    return await dbAdd('points_bank', { points, date, expires, timestamp: Date.now() });
}

async function getPointsBank() {
    const all = await dbGetAll('points_bank');
    const today = new Date().toISOString().split('T')[0];
    // Filter out expired
    return all.filter(p => p.expires >= today);
}

async function clearExpiredPointsBank() {
    const all = await dbGetAll('points_bank');
    const today = new Date().toISOString().split('T')[0];
    const expired = all.filter(p => p.expires < today);
    for (const p of expired) {
        await dbDelete('points_bank', p.id);
    }
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

// ============ DAILY MAINTENANCE ============

async function performDailyMaintenance() {
    const today = new Date().toISOString().split('T')[0];
    const lastMaintenance = localStorage.getItem('lastMaintenance');
    
    if (lastMaintenance === today) return;

    console.log('🔧 Performing daily maintenance...');

    // Clear expired points bank
    await clearExpiredPointsBank();

    // Bank unused points from yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const settings = await getSettings();
    if (settings && settings.dailyPoints) {
        const yesterdayFoods = await getFoodsByDate(yesterday);
        const yesterdayExercise = await getExerciseByDate(yesterday);
        
        const foodPoints = yesterdayFoods.reduce((sum, f) => sum + f.points, 0);
        const exercisePoints = yesterdayExercise.reduce((sum, e) => sum + e.points, 0);
        const netPoints = foodPoints - exercisePoints;
        const unused = Math.max(0, settings.dailyPoints - netPoints);
        
        if (unused > 0) {
            const expires = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
            await addToPointsBank(unused, yesterday, expires);
            console.log(`💰 Banked ${unused} unused points from ${yesterday}`);
        }
    }

    localStorage.setItem('lastMaintenance', today);
    console.log('✅ Daily maintenance complete');
}
