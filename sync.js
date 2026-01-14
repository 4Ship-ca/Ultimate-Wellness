// ============ CLOUD SYNC MODULE v2.2.0 (Preparation) ============
// Infrastructure for future cloud synchronization (v2.4.0)

// ============ SYNC CONFIGURATION ============

const SYNC_CONFIG = {
    enabled: false, // Will be enabled in v2.4.0
    endpoint: null, // Supabase URL or custom API endpoint
    apiKey: null,
    autoSync: true,
    syncInterval: 60000, // 1 minute
    wifiOnly: true,
    syncPhotos: false, // Photos use more bandwidth
    batchSize: 50
};

// ============ SYNC STATUS ============

let syncStatus = {
    lastSync: null,
    isSyncing: false,
    pendingCount: 0,
    errorCount: 0,
    lastError: null
};

/**
 * Get current sync status
 */
function getSyncStatus() {
    return { ...syncStatus };
}

/**
 * Update sync status
 */
function updateSyncStatus(updates) {
    syncStatus = { ...syncStatus, ...updates };
    
    // Update UI indicator if it exists
    if (window.updateSyncIndicator) {
        window.updateSyncIndicator(syncStatus);
    }
}

// ============ SYNC OPERATIONS (PLACEHOLDERS FOR v2.4) ============

/**
 * Get items from sync queue
 * @param {string} userId - User ID
 * @param {number} limit - Max items to return
 * @returns {Array} Queue items
 */
async function getSyncQueue(userId, limit = 100) {
    try {
        const allItems = await dbGetAll('sync_queue');
        const userItems = allItems.filter(item => item.userId === userId);
        
        // Sort by timestamp (oldest first)
        userItems.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Return limited items
        return userItems.slice(0, limit);
    } catch (error) {
        console.warn('Error getting sync queue:', error);
        return [];
    }
}

/**
 * Add item to sync queue
 * @param {string} userId - User ID
 * @param {string} tableName - Table to sync
 * @param {string} recordId - Record ID
 * @param {string} action - 'create', 'update', or 'delete'
 */
async function addToSyncQueue(userId, tableName, recordId, action = 'update') {
    try {
        const item = {
            id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: userId,
            tableName: tableName,
            recordId: recordId,
            action: action,
            timestamp: new Date().toISOString(),
            synced: false
        };
        
        await dbPut('sync_queue', item);
    } catch (error) {
        console.warn('Error adding to sync queue:', error);
    }
}

/**
 * Mark sync queue items as synced
 * @param {Array} itemIds - IDs of items to mark as synced
 */
async function markAsSynced(itemIds) {
    try {
        for (const id of itemIds) {
            await dbDelete('sync_queue', id);
        }
    } catch (error) {
        console.warn('Error marking items as synced:', error);
    }
}

/**
 * Clear sync queue
 */
async function clearSyncQueue(userId) {
    try {
        const items = await getSyncQueue(userId);
        for (const item of items) {
            await dbDelete('sync_queue', item.id);
        }
    } catch (error) {
        console.warn('Error clearing sync queue:', error);
    }
}

/**
 * Initialize sync system
 */
async function initSync() {
    console.log('☁️ Initializing sync system (v2.4 preparation)...');
    
    // Load sync config from localStorage
    loadSyncConfig();
    
    // Check pending items
    const userId = getCurrentUserId();
    if (userId) {
        const queue = await getSyncQueue(userId);
        updateSyncStatus({ pendingCount: queue.length });
    }
    
    // Set up auto-sync (if enabled)
    if (SYNC_CONFIG.enabled && SYNC_CONFIG.autoSync) {
        startAutoSync();
    }
    
    console.log('☁️ Sync system ready (not yet enabled)');
}

/**
 * Enable cloud sync
 */
async function enableSync(endpoint, apiKey) {
    SYNC_CONFIG.enabled = true;
    SYNC_CONFIG.endpoint = endpoint;
    SYNC_CONFIG.apiKey = apiKey;
    
    saveSyncConfig();
    
    // Perform initial sync
    await performFullSync();
    
    // Start auto-sync
    startAutoSync();
    
    console.log('✅ Cloud sync enabled');
}

/**
 * Disable cloud sync
 */
function disableSync() {
    SYNC_CONFIG.enabled = false;
    stopAutoSync();
    
    saveSyncConfig();
    
    console.log('☁️ Cloud sync disabled');
}

/**
 * Perform full synchronization
 */
async function performFullSync() {
    if (!SYNC_CONFIG.enabled) {
        throw new Error('Sync not enabled');
    }
    
    if (syncStatus.isSyncing) {
        console.log('Sync already in progress');
        return;
    }
    
    updateSyncStatus({ isSyncing: true, lastError: null });
    
    try {
        console.log('🔄 Starting full sync...');
        
        const userId = getCurrentUserId();
        
        // Push local changes to cloud
        await pushToCloud(userId);
        
        // Pull cloud changes to local
        await pullFromCloud(userId);
        
        updateSyncStatus({
            isSyncing: false,
            lastSync: new Date().toISOString(),
            errorCount: 0
        });
        
        console.log('✅ Full sync complete');
    } catch (error) {
        console.error('❌ Sync failed:', error);
        
        updateSyncStatus({
            isSyncing: false,
            errorCount: syncStatus.errorCount + 1,
            lastError: error.message
        });
        
        throw error;
    }
}

/**
 * Push local changes to cloud
 */
async function pushToCloud(userId) {
    console.log('⬆️ Pushing local changes to cloud...');
    
    // Get sync queue
    const queue = await getSyncQueue(userId, SYNC_CONFIG.batchSize);
    
    if (queue.length === 0) {
        console.log('No changes to push');
        return;
    }
    
    console.log(`Pushing ${queue.length} changes...`);
    
    // TODO v2.4: Implement actual cloud sync
    // For now, just mark as synced (placeholder)
    
    for (const item of queue) {
        // In v2.4, this will make API calls to Supabase/custom backend
        console.log(`Would sync: ${item.tableName} record ${item.recordId}`);
        
        // Mark as synced in queue
        await markSynced(item.id);
    }
    
    updateSyncStatus({ pendingCount: 0 });
    
    console.log('✅ Push complete');
}

/**
 * Pull cloud changes to local
 */
async function pullFromCloud(userId) {
    console.log('⬇️ Pulling cloud changes to local...');
    
    // TODO v2.4: Implement actual cloud sync
    // For now, placeholder
    
    console.log('✅ Pull complete (no changes)');
}

/**
 * Resolve sync conflict
 */
async function resolveConflict(localData, cloudData) {
    console.log('⚠️ Conflict detected:', localData.id);
    
    // Last-write-wins strategy
    const localTime = new Date(localData._updatedAt || 0);
    const cloudTime = new Date(cloudData._updatedAt || 0);
    
    if (cloudTime > localTime) {
        // Cloud is newer - accept cloud version
        console.log('Accepting cloud version (newer)');
        return { resolved: cloudData, source: 'cloud' };
    } else {
        // Local is newer - keep local version
        console.log('Keeping local version (newer)');
        return { resolved: localData, source: 'local' };
    }
}

// ============ AUTO-SYNC ============

let autoSyncInterval = null;

/**
 * Start automatic sync
 */
function startAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
    }
    
    autoSyncInterval = setInterval(async () => {
        // Check if online
        if (!navigator.onLine) {
            console.log('Offline - skipping auto-sync');
            return;
        }
        
        // Check if WiFi only and not on WiFi
        if (SYNC_CONFIG.wifiOnly && !isWiFiConnection()) {
            console.log('Not on WiFi - skipping auto-sync');
            return;
        }
        
        // Perform sync
        try {
            await performFullSync();
        } catch (error) {
            console.warn('Auto-sync failed:', error);
        }
    }, SYNC_CONFIG.syncInterval);
    
    console.log(`🔄 Auto-sync started (${SYNC_CONFIG.syncInterval / 1000}s interval)`);
}

/**
 * Stop automatic sync
 */
function stopAutoSync() {
    if (autoSyncInterval) {
        clearInterval(autoSyncInterval);
        autoSyncInterval = null;
        console.log('⏸️ Auto-sync stopped');
    }
}

// ============ NETWORK DETECTION ============

/**
 * Check if device is online
 */
function isOnline() {
    return navigator.onLine;
}

/**
 * Check if connection is WiFi
 */
function isWiFiConnection() {
    // Check if Network Information API is available
    if ('connection' in navigator || 'mozConnection' in navigator || 'webkitConnection' in navigator) {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        
        if (connection.type) {
            return connection.type === 'wifi';
        }
        
        // Fallback: assume fast connection is WiFi
        if (connection.effectiveType) {
            return connection.effectiveType === '4g' || connection.effectiveType === 'wifi';
        }
    }
    
    // Can't determine - assume yes
    return true;
}

/**
 * Listen for online/offline events
 */
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        console.log('🌐 Back online');
        updateSyncStatus({ lastError: null });
        
        // Try to sync
        if (SYNC_CONFIG.enabled && SYNC_CONFIG.autoSync) {
            performFullSync().catch(err => console.warn('Sync failed:', err));
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('📴 Offline');
        updateSyncStatus({ lastError: 'No internet connection' });
    });
}

// ============ SYNC CONFIGURATION PERSISTENCE ============

/**
 * Save sync config to localStorage
 */
function saveSyncConfig() {
    const configToSave = {
        enabled: SYNC_CONFIG.enabled,
        endpoint: SYNC_CONFIG.endpoint,
        // Don't save API key in localStorage for security
        autoSync: SYNC_CONFIG.autoSync,
        syncInterval: SYNC_CONFIG.syncInterval,
        wifiOnly: SYNC_CONFIG.wifiOnly,
        syncPhotos: SYNC_CONFIG.syncPhotos
    };
    
    localStorage.setItem('syncConfig', JSON.stringify(configToSave));
}

/**
 * Load sync config from localStorage
 */
function loadSyncConfig() {
    const saved = localStorage.getItem('syncConfig');
    
    if (saved) {
        try {
            const config = JSON.parse(saved);
            Object.assign(SYNC_CONFIG, config);
            console.log('Loaded sync config from storage');
        } catch (error) {
            console.warn('Failed to load sync config:', error);
        }
    }
}

// ============ SYNC UI HELPERS ============

/**
 * Get sync status for display
 */
function getSyncStatusText() {
    if (!SYNC_CONFIG.enabled) {
        return 'Not configured';
    }
    
    if (!isOnline()) {
        return 'Offline';
    }
    
    if (syncStatus.isSyncing) {
        return 'Syncing...';
    }
    
    if (syncStatus.lastError) {
        return 'Error';
    }
    
    if (syncStatus.pendingCount > 0) {
        return `${syncStatus.pendingCount} pending`;
    }
    
    if (syncStatus.lastSync) {
        const lastSync = new Date(syncStatus.lastSync);
        const now = new Date();
        const diffMinutes = Math.floor((now - lastSync) / (1000 * 60));
        
        if (diffMinutes < 1) {
            return 'Just synced';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else {
            const hours = Math.floor(diffMinutes / 60);
            return `${hours}h ago`;
        }
    }
    
    return 'Not synced';
}

/**
 * Get sync status icon
 */
function getSyncStatusIcon() {
    if (!SYNC_CONFIG.enabled) {
        return '☁️'; // Cloud (disabled)
    }
    
    if (!isOnline()) {
        return '📴'; // Offline
    }
    
    if (syncStatus.isSyncing) {
        return '🔄'; // Syncing (should be animated in UI)
    }
    
    if (syncStatus.lastError) {
        return '⚠️'; // Warning/Error
    }
    
    if (syncStatus.pendingCount > 0) {
        return '⏳'; // Pending
    }
    
    return '☁️'; // Synced (green in UI)
}

// ============ MANUAL SYNC TRIGGERS ============

/**
 * Force immediate sync
 */
async function forceSyncNow() {
    if (!SYNC_CONFIG.enabled) {
        throw new Error('Sync not enabled');
    }
    
    console.log('🔄 Force sync triggered');
    return await performFullSync();
}

/**
 * Sync specific table
 */
async function syncTable(tableName) {
    if (!SYNC_CONFIG.enabled) {
        throw new Error('Sync not enabled');
    }
    
    console.log(`🔄 Syncing table: ${tableName}`);
    
    // TODO v2.4: Implement table-specific sync
    // For now, just sync everything
    return await performFullSync();
}

// ============ EXPORT FUNCTIONS ============

// Initialization
window.initSync = initSync;

// Sync control
window.enableSync = enableSync;
window.disableSync = disableSync;
window.performFullSync = performFullSync;
window.forceSyncNow = forceSyncNow;
window.syncTable = syncTable;

// Status
window.getSyncStatus = getSyncStatus;
window.getSyncStatusText = getSyncStatusText;
window.getSyncStatusIcon = getSyncStatusIcon;

// Configuration
window.saveSyncConfig = saveSyncConfig;
window.loadSyncConfig = loadSyncConfig;

// Network
window.isOnline = isOnline;
window.isWiFiConnection = isWiFiConnection;

// Internal (for testing)
window.SYNC_CONFIG = SYNC_CONFIG;

// Set up network listeners
setupNetworkListeners();

console.log('☁️ Cloud sync module v2.2.0 loaded (v2.4 preparation)');
