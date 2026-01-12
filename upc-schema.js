// ============================================================================
// IndexedDB Schema - UPC Products Store
// ============================================================================

const UPC_STORE_CONFIG = {
    name: 'upc_products',
    keyPath: 'id',
    autoIncrement: false,
    indexes: [
        { name: 'upc', keyPath: 'upc', unique: false },
        { name: 'userId', keyPath: 'userId', unique: false },
        { name: 'verified', keyPath: 'verified', unique: false },
        { name: 'source', keyPath: 'source', unique: false },
        { name: 'brand', keyPath: 'brand', unique: false },
        { name: 'date_added', keyPath: 'date_added', unique: false }
    ]
};

function createUPCProductsStore(db, version) {
    if (!db.objectStoreNames.contains(UPC_STORE_CONFIG.name)) {
        const objectStore = db.createObjectStore(UPC_STORE_CONFIG.name, {
            keyPath: UPC_STORE_CONFIG.keyPath,
            autoIncrement: UPC_STORE_CONFIG.autoIncrement
        });
        
        UPC_STORE_CONFIG.indexes.forEach(index => {
            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
        });
        
        console.log(`✅ Created ${UPC_STORE_CONFIG.name} object store with ${UPC_STORE_CONFIG.indexes.length} indexes`);
    }
}

function upgradeUPCProductsStore(db, oldVersion, newVersion) {
    const transaction = db.transaction([UPC_STORE_CONFIG.name], 'readwrite');
    const objectStore = transaction.objectStore(UPC_STORE_CONFIG.name);
    
    const existingIndexes = Array.from(objectStore.indexNames);
    
    UPC_STORE_CONFIG.indexes.forEach(index => {
        if (!existingIndexes.includes(index.name)) {
            objectStore.createIndex(index.name, index.keyPath, { unique: index.unique });
            console.log(`✅ Added index: ${index.name}`);
        }
    });
}

async function initUPCDatabase(db) {
    return new Promise((resolve, reject) => {
        if (!db.objectStoreNames.contains(UPC_STORE_CONFIG.name)) {
            reject(new Error('UPC products store not found. Database version upgrade required.'));
            return;
        }
        
        console.log('✅ UPC products store initialized');
        resolve();
    });
}

// ============================================================================
// DATABASE OPERATIONS (Generic wrapper for compatibility)
// ============================================================================

async function dbGet(storeName, id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const getRequest = objectStore.get(id);
            
            getRequest.onsuccess = () => resolve(getRequest.result);
            getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function dbPut(storeName, data) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const putRequest = objectStore.put(data);
            
            putRequest.onsuccess = () => resolve(data);
            putRequest.onerror = () => reject(putRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function dbDelete(storeName, id) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const deleteRequest = objectStore.delete(id);
            
            deleteRequest.onsuccess = () => resolve(true);
            deleteRequest.onerror = () => reject(deleteRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function dbGetAll(storeName, userId = null) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const getAllRequest = objectStore.getAll();
            
            getAllRequest.onsuccess = () => {
                let results = getAllRequest.result || [];
                
                if (userId) {
                    results = results.filter(item => item.userId === userId);
                }
                
                resolve(results);
            };
            
            getAllRequest.onerror = () => reject(getAllRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function dbGetByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            const index = objectStore.index(indexName);
            const getRequest = index.getAll(value);
            
            getRequest.onsuccess = () => resolve(getRequest.result || []);
            getRequest.onerror = () => reject(getRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function dbClear(storeName) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const clearRequest = objectStore.clear();
            
            clearRequest.onsuccess = () => resolve(true);
            clearRequest.onerror = () => reject(clearRequest.error);
        };
        
        request.onerror = () => reject(request.error);
    });
}

async function dbCount(storeName, userId = null) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ultimateWellness');
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);
            
            if (userId) {
                const index = objectStore.index('userId');
                const countRequest = index.count(userId);
                
                countRequest.onsuccess = () => resolve(countRequest.result);
                countRequest.onerror = () => reject(countRequest.error);
            } else {
                const countRequest = objectStore.count();
                
                countRequest.onsuccess = () => resolve(countRequest.result);
                countRequest.onerror = () => reject(countRequest.error);
            }
        };
        
        request.onerror = () => reject(request.error);
    });
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

async function migrateToUPCStore() {
    try {
        const legacyData = localStorage.getItem('upc_cache');
        if (!legacyData) {
            console.log('No legacy UPC data to migrate');
            return 0;
        }
        
        const products = JSON.parse(legacyData);
        let migrated = 0;
        
        for (const [upc, product] of Object.entries(products)) {
            await dbPut('upc_products', {
                id: `upc_${upc}_migrated`,
                upc: upc,
                userId: getCurrentUserId(),
                ...product,
                date_added: new Date().toISOString(),
                last_updated: new Date().toISOString()
            });
            migrated++;
        }
        
        localStorage.removeItem('upc_cache');
        console.log(`✅ Migrated ${migrated} UPC products from localStorage`);
        return migrated;
        
    } catch (error) {
        console.error('Migration error:', error);
        return 0;
    }
}

// ============================================================================
// EXPORT
// ============================================================================

if (typeof window !== 'undefined') {
    window.UPCSchema = {
        config: UPC_STORE_CONFIG,
        createStore: createUPCProductsStore,
        upgradeStore: upgradeUPCProductsStore,
        init: initUPCDatabase,
        migrate: migrateToUPCStore
    };
    
    window.dbUPC = {
        get: dbGet,
        put: dbPut,
        delete: dbDelete,
        getAll: dbGetAll,
        getByIndex: dbGetByIndex,
        clear: dbClear,
        count: dbCount
    };
}
