// ============ ULTIMATE WELLNESS DATABASE v2.2.2 ============
// IndexedDB wrapper with all required stores

let db = null;
const DB_NAME = 'UltimateWellnessDB';
const DB_VERSION = 3;

// Initialize database with all required stores
async function initDB() {
    return new Promise((resolve, reject) => {
        console.log('📦 Initializing database...');
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => {
            console.error('❌ Database failed to open:', request.error);
            reject(request.error);
        };
        
        request.onsuccess = () => {
            db = request.result;
            window.db = db; // Export globally
            console.log('✅ Database opened successfully');
            console.log('📊 Object stores:', Array.from(db.objectStoreNames));
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            console.log('🔄 Upgrading database from version', event.oldVersion, 'to', event.newVersion);
            
            // Define all required object stores
            const stores = [
                'users',
                'login_history',
                'improvement_log',
                'sent_emails',
                'sync_queue',
                'settings',
                'foods',
                'exercise',
                'water',
                'sleep',
                'tasks',
                'medications',
                'med_logs',
                'weight_logs',
                'naps',
                'store_visits',
                'stores',
                'pantry',
                'pantry_items',
                'photos',
                'recipes',
                'upc_database',
                'upc_preferences'
            ];
            
            // Create stores that don't exist
            stores.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id' });
                    
                    // Add indexes for common queries
                    if (['foods', 'exercise', 'water', 'sleep', 'tasks', 'med_logs', 'weight_logs', 'naps', 'stores', 'store_visits'].includes(storeName)) {
                        store.createIndex('userId', 'userId', { unique: false });
                        store.createIndex('date', 'date', { unique: false });
                        store.createIndex('userId_date', ['userId', 'date'], { unique: false });
                    }
                    
                    if (storeName === 'users') {
                        store.createIndex('username', 'username', { unique: true });
                    }
                    
                    if (storeName === 'login_history') {
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('date', 'date', { unique: false });
                    }
                    
                    if (storeName === 'improvement_log') {
                        store.createIndex('timestamp', 'timestamp', { unique: false });
                        store.createIndex('date', 'date', { unique: false });
                        store.createIndex('category', 'category', { unique: false });
                    }
                    
                    if (storeName === 'sent_emails') {
                        store.createIndex('templateId', 'templateId', { unique: false });
                        store.createIndex('sentDate', 'sentDate', { unique: false });
                    }
                    
                    if (storeName === 'upc_database') {
                        store.createIndex('upc', 'upc', { unique: true });
                        store.createIndex('product_name', 'product_name', { unique: false });
                    }
                    
                    if (storeName === 'upc_preferences') {
                        store.createIndex('upc', 'upc', { unique: true });
                    }
                    
                    if (storeName === 'medications') {
                        store.createIndex('userId', 'userId', { unique: false });
                    }
                    
                    console.log('✅ Created object store:', storeName);
                } else {
                    console.log('ℹ️ Object store already exists:', storeName);
                }
            });
        };
    });
}

// Generic database operations
async function dbGet(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

async function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

async function dbDelete(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

async function dbGetAll(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch (error) {
            // If store doesn't exist, return empty array instead of error
            console.warn(`Store ${storeName} not found, returning empty array`);
            resolve([]);
        }
    });
}

async function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.warn(`Index ${indexName} not found in ${storeName}, returning empty array`);
            resolve([]);
        }
    });
}

// Helper: Get by userId and date
async function dbGetByUserAndDate(storeName, userId, date) {
    try {
        return await dbGetByIndex(storeName, 'userId_date', [userId, date]);
    } catch (error) {
        console.warn(`Error getting ${storeName} by user and date:`, error);
        return [];
    }
}

// Helper: Get by date range
async function dbGetByDateRange(storeName, userId, startDate, endDate) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index('userId_date');
            
            const range = IDBKeyRange.bound(
                [userId, startDate],
                [userId, endDate]
            );
            
            const request = index.getAll(range);
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        } catch (error) {
            console.warn(`Error getting ${storeName} by date range:`, error);
            resolve([]);
        }
    });
}

// Helper: Clear all data (for testing/reset)
async function dbClear(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log(`✅ Cleared ${storeName}`);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

// Helper: Delete entire database
async function deleteDatabase() {
    return new Promise((resolve, reject) => {
        if (db) {
            db.close();
            db = null;
        }
        
        const request = indexedDB.deleteDatabase(DB_NAME);
        
        request.onsuccess = () => {
            console.log('✅ Database deleted');
            resolve();
        };
        
        request.onerror = () => {
            console.error('❌ Error deleting database:', request.error);
            reject(request.error);
        };
        
        request.onblocked = () => {
            console.warn('⚠️ Database deletion blocked');
        };
    });
}

// Export for use in app
window.initDB = initDB;
window.db = db;
window.dbGet = dbGet;
window.dbPut = dbPut;
window.dbDelete = dbDelete;
window.dbGetAll = dbGetAll;
window.dbGetByIndex = dbGetByIndex;
window.dbGetByUserAndDate = dbGetByUserAndDate;
window.dbGetByDateRange = dbGetByDateRange;
window.dbClear = dbClear;
window.deleteDatabase = deleteDatabase;

console.log('✅ Database module loaded');
