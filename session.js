// ============ SESSION MANAGEMENT MODULE v2.2.0 ============
// Session persistence, state restoration, and daily reset logic

// ============ SESSION STATE MANAGEMENT ============

/**
 * Save current session state to localStorage
 */
function saveSessionState() {
    try {
        const userId = getCurrentUserId();
        if (!userId) return;
        
        const sessionKey = `session_user_${userId}`;
        
        const state = {
            // UI State
            currentTab: window.currentTab || 'home',
            scrollPosition: window.scrollY,
            
            // In-progress entries
            inProgressFood: getCurrentFoodEntry(),
            inProgressExercise: getCurrentExerciseEntry(),
            
            // Expanded sections
            expandedSections: getExpandedSections(),
            
            // Open modals (don't persist modals, just record they were open)
            hadOpenModal: document.querySelector('.modal.open') !== null,
            
            // Timestamp
            savedAt: new Date().toISOString()
        };
        
        localStorage.setItem(sessionKey, JSON.stringify(state));
        localStorage.setItem('lastVisit', new Date().toISOString());
        
        console.log('💾 Session state saved');
    } catch (error) {
        console.error('Failed to save session state:', error);
    }
}

/**
 * Restore session state from localStorage
 */
async function restoreSession() {
    console.log('🔄 Restoring session...');
    
    try {
        const userId = getCurrentUserId();
        if (!userId) {
            console.log('No user logged in, skipping session restore');
            return;
        }
        
        const sessionKey = `session_user_${userId}`;
        const stateJson = localStorage.getItem(sessionKey);
        
        if (!stateJson) {
            console.log('No saved session found');
            return;
        }
        
        const state = JSON.parse(stateJson);
        
        // Restore current tab
        if (state.currentTab) {
        setTimeout(() => {
            if (typeof switchTab === "function" && window.appReady && window.appReady()) {
                switchTab(state.currentTab);
            }
        }, 1000);
        }
        
        // Restore scroll position
        if (state.scrollPosition) {
            setTimeout(() => window.scrollTo(0, state.scrollPosition), 200);
        }
        
        // Restore in-progress food entry
        if (state.inProgressFood) {
            restoreFoodEntry(state.inProgressFood);
        }
        
        // Restore in-progress exercise entry
        if (state.inProgressExercise) {
            restoreExerciseEntry(state.inProgressExercise);
        }
        
        // Restore expanded sections
        if (state.expandedSections && state.expandedSections.length > 0) {
            setTimeout(() => {
                state.expandedSections.forEach(sectionId => expandSection(sectionId));
            }, 300);
        }
        
        console.log('✅ Session restored');
    } catch (error) {
        console.error('Session restoration error:', error);
    }
}

/**
 * Clear session state for user
 */
function clearSessionState(userId = null) {
    if (!userId) {
        userId = getCurrentUserId();
    }
    
    const sessionKey = `session_user_${userId}`;
    localStorage.removeItem(sessionKey);
}

// ============ DAILY RESET LOGIC ============

/**
 * Get logical day based on user's reset time
 * 
 * If current time is before reset time, logical day is "yesterday"
 * If current time is after reset time, logical day is "today"
 */
function getLogicalDay(date, resetHour, resetMinute) {
    const d = new Date(date);
    
    // Current time in minutes since midnight
    const currentMinutes = d.getHours() * 60 + d.getMinutes();
    
    // Reset time in minutes since midnight
    const resetMinutes = resetHour * 60 + resetMinute;
    
    // If we haven't hit reset time yet, we're still in "yesterday"
    if (currentMinutes < resetMinutes) {
        d.setDate(d.getDate() - 1);
    }
    
    return d.toISOString().split('T')[0];
}

/**
 * Get current logical day (what date logs should be saved under)
 */
function getCurrentLogicalDay() {
    const settings = window.userSettings;
    if (!settings) {
        return new Date().toISOString().split('T')[0];
    }
    
    const resetHour = settings.dailyResetHour !== undefined ? settings.dailyResetHour : 4;
    const resetMinute = settings.dailyResetMinute !== undefined ? settings.dailyResetMinute : 0;
    
    return getLogicalDay(new Date(), resetHour, resetMinute);
}

/**
 * Override global getTodayKey() to use logical day
 */
window.getTodayKey = getCurrentLogicalDay;

/**
 * Check if we've crossed the daily reset boundary
 */
async function checkDailyReset() {
    console.log('🕐 Checking daily reset...');
    
    const userId = getCurrentUserId();
    if (!userId) return;
    
    // Get user's reset time from settings
    const settings = await getSettings(userId);
    const resetHour = settings?.dailyResetHour !== undefined ? settings.dailyResetHour : 4;
    const resetMinute = settings?.dailyResetMinute !== undefined ? settings.dailyResetMinute : 0;
    
    // Get last reset date
    const resetKey = `lastDailyReset_user_${userId}`;
    const lastReset = localStorage.getItem(resetKey);
    
    // Calculate current logical day
    const currentLogicalDay = getLogicalDay(new Date(), resetHour, resetMinute);
    
    if (lastReset !== currentLogicalDay) {
        console.log(`🌅 New day detected! Last reset: ${lastReset}, Current: ${currentLogicalDay}`);
        
        // Perform daily reset
        await performDailyReset();
        
        // Save new reset date
        localStorage.setItem(resetKey, currentLogicalDay);
        
        // Show notification (optional)
        if (window.showToast) {
            showToast('New day started! 🌅');
        }
    } else {
        console.log(`✅ Same day (${currentLogicalDay}), no reset needed`);
    }
}

/**
 * Perform the actual daily reset
 */
async function performDailyReset() {
    console.log('🔄 Performing daily reset...');
    
    // Clear any cached daily stats
    // (IndexedDB data persists - we just recalculate from today's data)
    
    // Reset UI counters if they exist
    if (window.refreshAllData) {
        await window.refreshAllData();
    }
    
    // Trigger UI refresh
    if (window.refreshStats) {
        await window.refreshStats();
    }
    
    console.log('✅ Daily reset complete');
}

/**
 * Get next reset time (for display)
 */
function getNextResetTime() {
    const settings = window.userSettings;
    if (!settings) return null;
    
    const resetHour = settings.dailyResetHour !== undefined ? settings.dailyResetHour : 4;
    const resetMinute = settings.dailyResetMinute !== undefined ? settings.dailyResetMinute : 0;
    
    const now = new Date();
    const next = new Date();
    next.setHours(resetHour, resetMinute, 0, 0);
    
    // If reset time has already passed today, next reset is tomorrow
    if (next <= now) {
        next.setDate(next.getDate() + 1);
    }
    
    return next;
}

/**
 * Format reset time for display (12-hour format)
 */
function formatResetTime(hour, minute) {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    const min = minute.toString().padStart(2, '0');
    return `${hour12}:${min} ${ampm}`;
}

/**
 * Get time until next reset (for display)
 */
function getTimeUntilReset() {
    const next = getNextResetTime();
    if (!next) return null;
    
    const now = new Date();
    const diff = next - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours, minutes, total: diff };
}

// ============ IN-PROGRESS ENTRY HELPERS ============

function getCurrentFoodEntry() {
    const nameInput = document.getElementById('foodName');
    const pointsInput = document.getElementById('foodPoints');
    const sourceInput = document.getElementById('foodSource');
    
    if (nameInput?.value || pointsInput?.value) {
        return {
            name: nameInput.value || '',
            points: pointsInput.value || '',
            source: sourceInput?.value || 'manual'
        };
    }
    return null;
}

function restoreFoodEntry(entry) {
    const nameInput = document.getElementById('foodName');
    const pointsInput = document.getElementById('foodPoints');
    const sourceInput = document.getElementById('foodSource');
    
    if (nameInput) nameInput.value = entry.name || '';
    if (pointsInput) pointsInput.value = entry.points || '';
    if (sourceInput) sourceInput.value = entry.source || 'manual';
    
    console.log('Restored food entry:', entry);
}

function getCurrentExerciseEntry() {
    const typeSelect = document.getElementById('exerciseType');
    const minutesInput = document.getElementById('exerciseMinutes');
    
    if (typeSelect?.value || minutesInput?.value) {
        return {
            type: typeSelect.value || '',
            minutes: minutesInput.value || ''
        };
    }
    return null;
}

function restoreExerciseEntry(entry) {
    const typeSelect = document.getElementById('exerciseType');
    const minutesInput = document.getElementById('exerciseMinutes');
    
    if (typeSelect) typeSelect.value = entry.type || '';
    if (minutesInput) minutesInput.value = entry.minutes || '';
    
    console.log('Restored exercise entry:', entry);
}

function getExpandedSections() {
    const expanded = [];
    const sections = document.querySelectorAll('.collapsible-section.expanded');
    
    sections.forEach(section => {
        if (section.id) {
            expanded.push(section.id);
        }
    });
    
    return expanded;
}

function expandSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('expanded');
    }
}

// ============ AUTO-SAVE FUNCTIONALITY ============

/**
 * Set up automatic session saving
 */
function initAutoSave() {
    // Save every 5 seconds
    setInterval(saveSessionState, 5000);
    
    // Save on page unload
    window.addEventListener('beforeunload', saveSessionState);
    
    // Save on visibility change (switching tabs)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            saveSessionState();
        }
    });
    
    // Save on input changes (debounced)
    let saveTimeout;
    document.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveSessionState, 2000);
    });
    
    console.log('💾 Auto-save initialized (5s interval)');
}

// ============ SESSION ANALYTICS ============

/**
 * Track session duration
 */
function trackSession() {
    const sessionStart = new Date();
    
    window.addEventListener('beforeunload', () => {
        const sessionEnd = new Date();
        const duration = Math.floor((sessionEnd - sessionStart) / 1000); // seconds
        
        const userId = getCurrentUserId();
        if (userId) {
            const statsKey = `sessionStats_user_${userId}`;
            const stats = JSON.parse(localStorage.getItem(statsKey) || '{"totalSessions":0,"totalSeconds":0}');
            
            stats.totalSessions++;
            stats.totalSeconds += duration;
            stats.lastSession = sessionEnd.toISOString();
            stats.lastDuration = duration;
            
            localStorage.setItem(statsKey, JSON.stringify(stats));
        }
    });
}

/**
 * Get session statistics for user
 */
function getSessionStats(userId = null) {
    if (!userId) {
        userId = getCurrentUserId();
    }
    
    const statsKey = `sessionStats_user_${userId}`;
    const stats = JSON.parse(localStorage.getItem(statsKey) || '{"totalSessions":0,"totalSeconds":0}');
    
    return {
        totalSessions: stats.totalSessions,
        totalSeconds: stats.totalSeconds,
        totalMinutes: Math.floor(stats.totalSeconds / 60),
        totalHours: Math.floor(stats.totalSeconds / 3600),
        averageSeconds: stats.totalSessions > 0 ? Math.floor(stats.totalSeconds / stats.totalSessions) : 0,
        lastSession: stats.lastSession,
        lastDuration: stats.lastDuration
    };
}

// ============ INITIALIZATION ============

/**
 * Initialize session management
 */
async function initSession() {
    console.log('📋 Initializing session management...');
    
    // Check daily reset
    await checkDailyReset();
    
    // Restore previous session
    await restoreSession();
    
    // Set up auto-save
    initAutoSave();
    
    // Track session duration
    trackSession();
    
    console.log('✅ Session management initialized');
}

// ============ EXPORT FUNCTIONS ============

// Session state
window.saveSessionState = saveSessionState;
window.restoreSession = restoreSession;
window.clearSessionState = clearSessionState;

// Daily reset
window.checkDailyReset = checkDailyReset;
window.performDailyReset = performDailyReset;
window.getLogicalDay = getLogicalDay;
window.getCurrentLogicalDay = getCurrentLogicalDay;
window.getNextResetTime = getNextResetTime;
window.formatResetTime = formatResetTime;
window.getTimeUntilReset = getTimeUntilReset;

// In-progress helpers
window.getCurrentFoodEntry = getCurrentFoodEntry;
window.restoreFoodEntry = restoreFoodEntry;
window.getCurrentExerciseEntry = getCurrentExerciseEntry;
window.restoreExerciseEntry = restoreExerciseEntry;
window.getExpandedSections = getExpandedSections;
window.expandSection = expandSection;

// Initialization
window.initSession = initSession;

// Analytics
window.getSessionStats = getSessionStats;

console.log('📋 Session management v2.2.0 loaded');
