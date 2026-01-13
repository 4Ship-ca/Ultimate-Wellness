// ============ AUTHENTICATION MODULE v2.2.0 ============
// User authentication, registration, and session management

// ============ PASSWORD HASHING ============

/**
 * Simple SHA-256 hash for passwords
 * NOTE: In production with real security needs, use bcrypt or similar
 * This is sufficient for local-only multi-user separation
 */
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function verifyPassword(password, hash) {
    const passwordHash = await hashPassword(password);
    return passwordHash === hash;
}

// ============ USER AUTHENTICATION ============

/**
 * Register a new user
 */
async function registerUser(username, password, profile = {}) {
    // Validate username
    if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters');
    }
    
    if (username.length > 20) {
        throw new Error('Username must be 20 characters or less');
    }
    
    // Check if username already exists
    const existing = await getUserByUsername(username);
    if (existing) {
        throw new Error('Username already exists');
    }
    
    // Validate password
    if (!password || password.length < 6) {
        throw new Error('Password must be at least 6 characters');
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const userId = await createUser(username, passwordHash, profile);
    
    console.log(`✅ User registered: ${username} (ID: ${userId})`);
    
    return userId;
}

/**
 * Login user
 */
async function loginUser(username, password) {
    // Get user by username
    const user = await getUserByUsername(username);
    
    if (!user) {
        throw new Error('Invalid username or password');
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
        throw new Error('Invalid username or password');
    }
    
    // Check if user is active
    if (!user.isActive) {
        throw new Error('Account is disabled');
    }
    
    // Update last login
    await updateUserLastLogin(user.id);
    
    // Set as current user
    setCurrentUserId(user.id);
    
    // Save login session
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUsername', username);
    
    console.log(`✅ User logged in: ${username} (ID: ${user.id})`);
    
    return user;
}

/**
 * Logout current user
 */
function logoutUser() {
    const username = localStorage.getItem('currentUsername');
    
    // Clear session
    clearCurrentUser();
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUsername');
    
    // Clear session state
    clearSessionState();
    
    console.log(`👋 User logged out: ${username}`);
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return localStorage.getItem('isAuthenticated') === 'true' && getCurrentUserId() !== null;
}

/**
 * Get current authenticated user
 */
async function getCurrentUser() {
    const userId = getCurrentUserId();
    
    if (!userId) {
        return null;
    }
    
    return await dbGet('users', userId);
}

/**
 * Get current user's username
 */
function getCurrentUsername() {
    return localStorage.getItem('currentUsername') || 'Guest';
}

/**
 * Get all users from database
 */
async function getAllUsers() {
    try {
        const users = await dbGetAll('users');
        return users || [];
    } catch (error) {
        console.warn('Error getting all users:', error);
        return [];
    }
}

/**
 * Get user by username
 */
async function getUserByUsername(username) {
    try {
        const users = await getAllUsers();
        return users.find(u => u.username === username) || null;
    } catch (error) {
        console.warn('Error getting user by username:', error);
        return null;
    }
}

// ============ PASSWORD MANAGEMENT ============

/**
 * Change password for current user
 */
async function changePassword(currentPassword, newPassword) {
    const user = await getCurrentUser();
    
    if (!user) {
        throw new Error('No user logged in');
    }
    
    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    
    if (!isValid) {
        throw new Error('Current password is incorrect');
    }
    
    // Validate new password
    if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
    }
    
    // Hash new password
    const newHash = await hashPassword(newPassword);
    
    // Update user
    user.passwordHash = newHash;
    await dbPut('users', user);
    
    console.log('✅ Password changed successfully');
}

/**
 * Reset password (for when user forgets)
 * NOTE: Without server, we can't do email reset
 * This requires user to verify identity some other way
 */
async function resetPassword(username, newPassword) {
    // In a real app, this would require email verification
    // For local-only app, we'll require showing a recovery code
    // that was given during registration
    
    throw new Error('Password reset not yet implemented');
}

// ============ USER SWITCHING ============

/**
 * Switch to different user (requires login)
 */
async function switchUser(username, password) {
    // Save current session state
    saveSessionState();
    
    // Login as new user
    const user = await loginUser(username, password);
    
    // Load new user's data
    await loadUserData(user.id);
    
    // Restore their session
    await restoreSession();
    
    console.log(`✅ Switched to user: ${username}`);
    
    return user;
}

/**
 * Quick user switch (for when multiple users on one device)
 */
async function quickSwitchUser(userId) {
    // This assumes user is already authenticated on this device
    // Just switches context without requiring password again
    
    const user = await dbGet('users', userId);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    // Save current session
    saveSessionState();
    
    // Switch user
    setCurrentUserId(userId);
    localStorage.setItem('currentUsername', user.username);
    
    // Load new user's data
    await loadUserData(userId);
    
    // Restore their session
    await restoreSession();
    
    console.log(`✅ Quick switched to: ${user.username}`);
    
    return user;
}

// ============ USER DATA MANAGEMENT ============

/**
 * Load user's data (called on login/switch)
 */
async function loadUserData(userId) {
    // Load user settings
    window.userSettings = await getSettings(userId);
    
    if (!window.userSettings) {
        // Create default settings if none exist
        window.userSettings = await createDefaultSettings(userId);
    }
    
    console.log(`📊 Loaded data for user ${userId}`);
}

/**
 * Delete user account and all data
 */
async function deleteUserAccount(userId, password) {
    const user = await dbGet('users', userId);
    
    if (!user) {
        throw new Error('User not found');
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
        throw new Error('Incorrect password');
    }
    
    console.log(`⚠️ Deleting user account ${userId} and all data...`);
    
    // Delete all user data from all tables
    const tables = [
        'settings', 'foods', 'exercise', 'weight_logs', 'sleep', 'water',
        'medications', 'tasks', 'pantry_items', 'recipes', 'photos',
        'upc_preferences', 'login_history', 'improvement_log', 'sent_emails', 'sync_queue'
    ];
    
    for (const tableName of tables) {
        const records = await dbGetAll(tableName, userId);
        for (const record of records) {
            await dbDelete(tableName, record.id);
        }
    }
    
    // Delete user record
    await dbDelete('users', userId);
    
    console.log('✅ User account deleted');
}

/**
 * Migrate old single-user data to multi-user format
 * This is a stub function since the app is designed for single-user
 */
async function migrateToMultiUser() {
    try {
        // Check if there's any data in the old format (without userId)
        const foods = await dbGetAll('foods');
        const needsMigration = foods.some(food => !food.userId);
        
        if (needsMigration) {
            console.log('📦 Migrating old data to multi-user format...');
            
            const defaultUserId = 'default';
            const stores = ['foods', 'exercise', 'water', 'sleep', 'tasks', 'medications', 'med_logs', 'weight_logs'];
            
            for (const storeName of stores) {
                try {
                    const records = await dbGetAll(storeName);
                    for (const record of records) {
                        if (!record.userId) {
                            record.userId = defaultUserId;
                            await dbPut(storeName, record);
                        }
                    }
                } catch (err) {
                    console.warn(`Could not migrate ${storeName}:`, err);
                }
            }
            
            console.log('✅ Data migration complete');
        } else {
            console.log('ℹ️ No migration needed - data already in multi-user format');
        }
    } catch (error) {
        console.warn('⚠️ Migration check skipped:', error);
        // Don't throw - migration is optional
    }
}

// ============ FIRST-TIME SETUP ============

/**
 * Initialize authentication system
 * Called on app startup
 */
async function initAuth() {
    console.log('🔐 Initializing authentication...');
    
    // Migrate old single-user data if needed
    await migrateToMultiUser();
    
    // Check if any users exist
    const users = await getAllUsers();
    
    if (users.length === 0) {
        // No users - create default user
        console.log('No users found, creating default user...');
        
        const userId = await createUser('default', await hashPassword('wellness'), {
            name: 'My Account'
        });
        
        setCurrentUserId(userId);
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUsername', 'default');
        
        console.log('✅ Default user created');
        
        return { needsLogin: false, user: await dbGet('users', userId) };
    }
    
    // Check if user is already logged in
    if (isAuthenticated()) {
        const userId = getCurrentUserId();
        const user = await dbGet('users', userId);
        
        if (user) {
            console.log(`✅ Already authenticated: ${user.username}`);
            return { needsLogin: false, user };
        }
    }
    
    // Multiple users or logged out - need login
    if (users.length > 1) {
        console.log(`🔐 ${users.length} users found, login required`);
        return { needsLogin: true, users };
    }
    
    // Single user - auto-login
    const user = users[0];
    setCurrentUserId(user.id);
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('currentUsername', user.username);
    await updateUserLastLogin(user.id);
    
    console.log(`✅ Auto-logged in: ${user.username}`);
    
    return { needsLogin: false, user };
}

/**
 * Check if should show login screen
 */
async function shouldShowLogin() {
    const users = await getAllUsers();
    
    // Show login if:
    // - Multiple users exist
    // - OR user is not authenticated
    
    if (users.length > 1) {
        return !isAuthenticated();
    }
    
    return false;
}

// ============ SESSION PERSISTENCE ============

function clearSessionState() {
    // Clear session-specific localStorage
    const keysToKeep = [
        'zeroPointFoodsURL',
        'botScenariosURL',
        'improvementLogLUT',
        'zeroPointFoods',
        'botScenarios',
        'zpfLastFetch',
        'botScenariosLastFetch'
    ];
    
    const allKeys = Object.keys(localStorage);
    
    for (const key of allKeys) {
        if (!keysToKeep.includes(key) && !key.startsWith('user_')) {
            localStorage.removeItem(key);
        }
    }
}

// ============ UTILITY FUNCTIONS ============

/**
 * Validate username format
 */
function isValidUsername(username) {
    // 3-20 characters, alphanumeric and underscore only
    const regex = /^[a-zA-Z0-9_]{3,20}$/;
    return regex.test(username);
}

/**
 * Get user display name
 */
async function getUserDisplayName(userId = null) {
    if (!userId) {
        userId = getCurrentUserId();
    }
    
    const settings = await getSettings(userId);
    
    if (settings && settings.name && settings.name !== 'Guest') {
        return settings.name;
    }
    
    const user = await dbGet('users', userId);
    return user ? user.username : 'Guest';
}

/**
 * Check if username is available
 */
async function isUsernameAvailable(username) {
    const user = await getUserByUsername(username);
    return user === undefined;
}

// ============ EXPORT FUNCTIONS ============

// Password functions
window.hashPassword = hashPassword;
window.verifyPassword = verifyPassword;

// Authentication functions
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.getCurrentUsername = getCurrentUsername;

// Password management
window.changePassword = changePassword;
window.resetPassword = resetPassword;

// User switching
window.switchUser = switchUser;
window.quickSwitchUser = quickSwitchUser;

// User data
window.loadUserData = loadUserData;
window.deleteUserAccount = deleteUserAccount;

// Initialization
window.initAuth = initAuth;
window.shouldShowLogin = shouldShowLogin;

// Utilities
window.isValidUsername = isValidUsername;
window.getUserDisplayName = getUserDisplayName;
window.isUsernameAvailable = isUsernameAvailable;

console.log('🔐 Authentication module v2.2.0 loaded');
