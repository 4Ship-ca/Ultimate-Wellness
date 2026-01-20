// ============ SESSION MANAGEMENT MODULE v2.3.0 ============
// Session persistence, state restoration, daily reset logic, and robust heartbeat system
// Now with browser-independent sleep recovery and user interaction detection

// ============ APP HEARTBEAT / PULSE SYSTEM ============
// Robust system for detecting app wake/reanimation and handling time-sensitive state

/**
 * Heartbeat state - tracks app pulse and user interactions
 */
const HeartbeatState = {
    lastPulse: Date.now(),
    userHasInteracted: false,
    interactionCount: 0,
    lastInteraction: null,
    sleepRecoveryShown: false,
    heartbeatInterval: null,
    initialized: false
};

/**
 * Key constants for localStorage
 */
const HEARTBEAT_KEYS = {
    OPEN_SLEEP_SESSION: 'openSleepSession',
    LAST_HEARTBEAT: 'lastHeartbeat',
    LAST_INTERACTION: 'lastUserInteraction',
    PENDING_SLEEP_RECOVERY: 'pendingSleepRecovery'
};

/**
 * Mark that user has genuinely interacted with the app
 * This distinguishes from automatic browser refreshes
 */
function markUserInteraction(eventType = 'unknown') {
    HeartbeatState.userHasInteracted = true;
    HeartbeatState.interactionCount++;
    HeartbeatState.lastInteraction = {
        type: eventType,
        timestamp: Date.now()
    };

    // Persist interaction marker
    localStorage.setItem(HEARTBEAT_KEYS.LAST_INTERACTION, JSON.stringify({
        timestamp: Date.now(),
        type: eventType
    }));

    // After user interaction, check if we need to show sleep recovery
    if (!HeartbeatState.sleepRecoveryShown) {
        checkPendingSleepRecovery();
    }
}

/**
 * Initialize user interaction tracking
 * Tracks meaningful interactions: touch, click, scroll, keypress, tab switch
 */
function initInteractionTracking() {
    // Touch events (mobile)
    document.addEventListener('touchstart', () => markUserInteraction('touch'), { once: false, passive: true });

    // Click events (desktop/mobile)
    document.addEventListener('click', () => markUserInteraction('click'), { once: false });

    // Scroll events (debounced)
    let scrollTimeout;
    document.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => markUserInteraction('scroll'), 100);
    }, { passive: true });

    // Keyboard events
    document.addEventListener('keydown', () => markUserInteraction('keypress'), { once: false });

    // Tab becomes visible AND user interacts
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            // Tab became visible - but DON'T mark interaction yet
            // Wait for actual user action
            console.log('👁️ App visible - awaiting user interaction');
        }
    });

    console.log('🖐️ User interaction tracking initialized');
}

/**
 * Store open sleep session in localStorage for quick recovery
 * Called when user starts a sleep session
 */
function persistOpenSleepSession(session) {
    if (!session) return;

    const data = {
        id: session.id,
        userId: session.userId,
        start_datetime: session.start_datetime,
        date: session.date,
        persistedAt: Date.now()
    };

    localStorage.setItem(HEARTBEAT_KEYS.OPEN_SLEEP_SESSION, JSON.stringify(data));
    console.log('💾 Open sleep session persisted to localStorage');
}

/**
 * Clear open sleep session from localStorage
 * Called when user ends a sleep session
 */
function clearOpenSleepSession() {
    localStorage.removeItem(HEARTBEAT_KEYS.OPEN_SLEEP_SESSION);
    localStorage.removeItem(HEARTBEAT_KEYS.PENDING_SLEEP_RECOVERY);
    HeartbeatState.sleepRecoveryShown = false;
    console.log('🧹 Open sleep session cleared from localStorage');
}

/**
 * Get persisted open sleep session from localStorage (fast access)
 */
function getPersistedOpenSleepSession() {
    try {
        const data = localStorage.getItem(HEARTBEAT_KEYS.OPEN_SLEEP_SESSION);
        if (!data) return null;

        const session = JSON.parse(data);
        const userId = getCurrentUserId();

        // Validate it's for current user
        if (session.userId !== userId) {
            console.log('⚠️ Persisted sleep session is for different user');
            return null;
        }

        return session;
    } catch (error) {
        console.warn('Error reading persisted sleep session:', error);
        return null;
    }
}

/**
 * Check if there's a pending sleep recovery that needs user attention
 * Only prompt after user has interacted (not on auto-refresh)
 */
async function checkPendingSleepRecovery() {
    if (HeartbeatState.sleepRecoveryShown) return;

    // First check localStorage for fast access
    const persistedSession = getPersistedOpenSleepSession();

    if (!persistedSession) {
        // Double-check IndexedDB (in case localStorage was cleared)
        try {
            if (typeof getIncompleteSleepSession === 'function') {
                const dbSession = await getIncompleteSleepSession();
                if (dbSession) {
                    // Re-persist it
                    persistOpenSleepSession(dbSession);
                    showSleepRecoveryPrompt(dbSession);
                }
            }
        } catch (error) {
            console.warn('Error checking DB for incomplete sleep:', error);
        }
        return;
    }

    // We have an open sleep session - show recovery prompt
    showSleepRecoveryPrompt(persistedSession);
}

/**
 * Get time-of-day aware greeting
 */
function getTimeOfDayGreeting() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
        return { greeting: 'Good Morning', emoji: '☀️', period: 'morning' };
    } else if (hour >= 12 && hour < 17) {
        return { greeting: 'Good Afternoon', emoji: '🌤️', period: 'afternoon' };
    } else if (hour >= 17 && hour < 21) {
        return { greeting: 'Good Evening', emoji: '🌅', period: 'evening' };
    } else {
        return { greeting: 'Hello', emoji: '🌙', period: 'night' };
    }
}

/**
 * Format duration for display
 */
function formatSleepDuration(startDateTime) {
    const start = new Date(startDateTime);
    const now = new Date();
    const durationMs = now - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

/**
 * Show sleep recovery prompt to user
 * AM/PM aware greeting with option to end session
 */
function showSleepRecoveryPrompt(session) {
    if (HeartbeatState.sleepRecoveryShown) return;
    HeartbeatState.sleepRecoveryShown = true;

    const { greeting, emoji, period } = getTimeOfDayGreeting();
    const duration = formatSleepDuration(session.start_datetime);
    const startTime = new Date(session.start_datetime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    console.log(`🛏️ Sleep recovery prompt - Session started: ${startTime}, Duration: ${duration}`);

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.id = 'sleepRecoveryOverlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        padding: 20px;
    `;

    const modal = document.createElement('div');
    modal.style.cssText = `
        background: var(--bg-card, #1a1a2e);
        border-radius: 16px;
        padding: 24px;
        max-width: 360px;
        width: 100%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;

    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">${emoji}</div>
        <h2 style="margin: 0 0 8px 0; color: var(--text-primary, #fff);">${greeting}!</h2>
        <p style="color: var(--text-secondary, #aaa); margin: 0 0 16px 0;">
            You have an open sleep session
        </p>
        <div style="background: var(--bg-light, #252540); padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-secondary, #aaa);">Started at ${startTime}</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: var(--primary, #4CAF50);">${duration}</p>
        </div>
        <p style="color: var(--text-secondary, #aaa); margin: 0 0 20px 0; font-size: 14px;">
            Would you like to end your sleep session?
        </p>
        <div style="display: flex; gap: 12px;">
            <button id="sleepRecoveryDismiss" style="
                flex: 1;
                padding: 12px;
                border: 1px solid var(--border, #333);
                background: transparent;
                color: var(--text-primary, #fff);
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
            ">Keep Sleeping</button>
            <button id="sleepRecoveryEnd" style="
                flex: 1;
                padding: 12px;
                border: none;
                background: var(--primary, #4CAF50);
                color: white;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            ">End Session ${emoji}</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Handle dismiss - keep session open
    document.getElementById('sleepRecoveryDismiss').addEventListener('click', () => {
        overlay.remove();
        console.log('😴 User chose to keep sleeping');
    });

    // Handle end session
    document.getElementById('sleepRecoveryEnd').addEventListener('click', async () => {
        overlay.remove();

        try {
            // End the sleep session
            if (typeof endSleepSession === 'function') {
                await endSleepSession();
                clearOpenSleepSession();

                // Update UI
                if (typeof updateSleepUI === 'function') {
                    await updateSleepUI();
                }

                // Show success
                if (typeof showToast === 'function') {
                    showToast(`${greeting}! Sleep logged. ${emoji}`);
                } else {
                    alert(`${greeting}! Sleep session ended.`);
                }
            }
        } catch (error) {
            console.error('Error ending sleep session:', error);
            alert('Error ending sleep session: ' + error.message);
        }
    });
}

/**
 * Main heartbeat pulse - runs periodically to check app state
 */
async function heartbeatPulse() {
    const now = Date.now();
    const lastPulse = HeartbeatState.lastPulse;
    const elapsed = now - lastPulse;

    HeartbeatState.lastPulse = now;
    localStorage.setItem(HEARTBEAT_KEYS.LAST_HEARTBEAT, now.toString());

    // Detect if significant time has passed (device was asleep/tab was closed)
    const SIGNIFICANT_GAP = 60000; // 1 minute
    const wasHibernating = elapsed > SIGNIFICANT_GAP;

    if (wasHibernating) {
        console.log(`💓 Heartbeat: App was dormant for ${Math.round(elapsed / 1000)}s`);

        // App "woke up" - perform checks
        await onAppWake();
    }

    // Regular heartbeat tasks
    // Check daily reset (even if not hibernating)
    await checkDailyReset();
}

/**
 * Called when app "wakes up" after being dormant
 * Handles: device sleep, tab close/reopen, browser restart
 */
async function onAppWake() {
    console.log('🔄 App wake detected - running checks...');

    // 1. Check for day rollover (4am reset or user-defined)
    await checkDailyReset();

    // 2. Check for open sleep session (but wait for user interaction)
    const hasOpenSleep = getPersistedOpenSleepSession();
    if (hasOpenSleep) {
        console.log('🛏️ Open sleep session detected - awaiting user interaction');
        // Mark that we have pending sleep recovery
        localStorage.setItem(HEARTBEAT_KEYS.PENDING_SLEEP_RECOVERY, 'true');

        // If user has already interacted, show prompt now
        if (HeartbeatState.userHasInteracted && !HeartbeatState.sleepRecoveryShown) {
            checkPendingSleepRecovery();
        }
    }

    // 3. Refresh UI if needed
    if (typeof updateAllUI === 'function') {
        await updateAllUI();
    }

    console.log('✅ App wake checks complete');
}

/**
 * Initialize heartbeat on visibility change (tab becomes visible)
 */
function initVisibilityHeartbeat() {
    document.addEventListener('visibilitychange', async () => {
        if (!document.hidden) {
            console.log('👁️ Tab became visible - running heartbeat');
            await heartbeatPulse();
        }
    });

    // Also trigger on window focus (covers more cases)
    window.addEventListener('focus', async () => {
        console.log('🎯 Window focused - running heartbeat');
        await heartbeatPulse();
    });
}

/**
 * Initialize the heartbeat system
 */
function initHeartbeat() {
    if (HeartbeatState.initialized) {
        console.log('💓 Heartbeat already initialized');
        return;
    }

    console.log('💓 Initializing heartbeat system...');

    // Initialize interaction tracking
    initInteractionTracking();

    // Initialize visibility-based heartbeat
    initVisibilityHeartbeat();

    // Start periodic heartbeat (every 30 seconds when active)
    HeartbeatState.heartbeatInterval = setInterval(heartbeatPulse, 30000);

    // Run initial pulse
    heartbeatPulse();

    // Check for pending sleep recovery on load
    const pendingRecovery = localStorage.getItem(HEARTBEAT_KEYS.PENDING_SLEEP_RECOVERY);
    if (pendingRecovery) {
        console.log('📋 Pending sleep recovery flagged - awaiting user interaction');
    }

    HeartbeatState.initialized = true;
    console.log('✅ Heartbeat system initialized');
}

/**
 * Sync open sleep session with localStorage
 * Call this when starting a sleep session
 */
async function syncOpenSleepToLocalStorage() {
    try {
        if (typeof getIncompleteSleepSession === 'function') {
            const session = await getIncompleteSleepSession();
            if (session) {
                persistOpenSleepSession(session);
            } else {
                clearOpenSleepSession();
            }
        }
    } catch (error) {
        console.warn('Error syncing sleep to localStorage:', error);
    }
}

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

    // Initialize heartbeat system FIRST (handles wake detection, sleep recovery)
    initHeartbeat();

    // Check daily reset
    await checkDailyReset();

    // Restore previous session
    await restoreSession();

    // Sync any open sleep session to localStorage
    await syncOpenSleepToLocalStorage();

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

// Heartbeat / Pulse System (robust app wake detection)
window.initHeartbeat = initHeartbeat;
window.heartbeatPulse = heartbeatPulse;
window.onAppWake = onAppWake;

// Sleep Session Persistence (for robust recovery)
window.persistOpenSleepSession = persistOpenSleepSession;
window.clearOpenSleepSession = clearOpenSleepSession;
window.getPersistedOpenSleepSession = getPersistedOpenSleepSession;
window.checkPendingSleepRecovery = checkPendingSleepRecovery;
window.syncOpenSleepToLocalStorage = syncOpenSleepToLocalStorage;

// User Interaction Tracking
window.markUserInteraction = markUserInteraction;
window.HeartbeatState = HeartbeatState;

// Time-of-day helpers
window.getTimeOfDayGreeting = getTimeOfDayGreeting;

console.log('📋 Session management v2.3.0 loaded (with robust heartbeat system)');
