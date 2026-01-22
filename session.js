// ============ SESSION MANAGEMENT MODULE v2.4.0 ============
// Session persistence, state restoration, daily reset logic, and robust heartbeat system
// Now with browser-independent sleep recovery, user interaction detection,
// and comprehensive daily reset (points/water/meds/exercise/tasks)

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
    PENDING_SLEEP_RECOVERY: 'pendingSleepRecovery',
    // Daily reset keys
    LAST_DAILY_RESET: 'lastDailyReset',
    LAST_ACTIVE_DATE: 'lastActiveDate',
    PENDING_DAY_TRANSITION: 'pendingDayTransition'
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
 * Check if sleep duration is suspiciously long (likely missed button press)
 * Returns warning message if over threshold, null otherwise
 */
function checkSleepDurationWarning(startDateTime) {
    const start = new Date(startDateTime);
    const now = new Date();
    const durationHours = (now - start) / (1000 * 60 * 60);

    // Max reasonable sleep is ~16 hours, anything over 18 is suspicious
    if (durationHours > 24) {
        return {
            level: 'error',
            message: `This session is over 24 hours. Did you forget to end a previous session?`,
            durationHours
        };
    } else if (durationHours > 16) {
        return {
            level: 'warning',
            message: `This is a long session (${Math.round(durationHours)}h). You may want to adjust the time.`,
            durationHours
        };
    }
    return null;
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
    const startDate = new Date(session.start_datetime).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });

    // Check for suspiciously long duration (missed button press)
    const durationWarning = checkSleepDurationWarning(session.start_datetime);

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

    // Build warning HTML if duration is suspicious
    const warningHtml = durationWarning ? `
        <div style="background: ${durationWarning.level === 'error' ? '#ff4444' : '#ff9800'};
                    padding: 10px; border-radius: 8px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13px; color: white;">
                ⚠️ ${durationWarning.message}
            </p>
        </div>
    ` : '';

    modal.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">${emoji}</div>
        <h2 style="margin: 0 0 8px 0; color: var(--text-primary, #fff);">${greeting}!</h2>
        <p style="color: var(--text-secondary, #aaa); margin: 0 0 16px 0;">
            You have an open sleep session
        </p>
        ${warningHtml}
        <div style="background: var(--bg-light, #252540); padding: 12px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; font-size: 14px; color: var(--text-secondary, #aaa);">Started ${startDate} at ${startTime}</p>
            <p style="margin: 0; font-size: 24px; font-weight: bold; color: ${durationWarning ? '#ff9800' : 'var(--primary, #4CAF50)'};">${duration}</p>
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
            ">${durationWarning ? 'Cancel Session' : 'Keep Sleeping'}</button>
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

    // Handle dismiss - keep sleeping OR cancel if duration is suspicious
    document.getElementById('sleepRecoveryDismiss').addEventListener('click', async () => {
        overlay.remove();

        if (durationWarning && durationWarning.level === 'error') {
            // Duration is way too long - offer to cancel/delete the session
            const shouldCancel = confirm(
                'This sleep session is over 24 hours old.\n\n' +
                'Would you like to CANCEL this session?\n' +
                '(Click OK to delete it, or Cancel to keep it open)'
            );

            if (shouldCancel) {
                try {
                    // Delete the incomplete session from DB
                    if (typeof dbDelete === 'function' && session.id) {
                        await dbDelete('sleep', session.id);
                    }
                    clearOpenSleepSession();
                    console.log('🗑️ Stale sleep session cancelled/deleted');

                    if (typeof showToast === 'function') {
                        showToast('Stale sleep session cancelled');
                    }
                    if (typeof updateSleepUI === 'function') {
                        await updateSleepUI();
                    }
                } catch (error) {
                    console.error('Error cancelling sleep session:', error);
                }
            } else {
                console.log('😴 User chose to keep the session open');
            }
        } else {
            console.log('😴 User chose to keep sleeping');
        }
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
 *
 * This is the CRITICAL function that ensures app state is correct after hibernation.
 * It answers: "What day is it? What should I check/do/update?"
 */
async function onAppWake() {
    console.log('🔄 App wake detected - running comprehensive checks...');

    const wakeReport = {
        timestamp: Date.now(),
        checks: []
    };

    // 1. CHECK: What day/time is it? Has the day changed?
    console.log('   1️⃣ Checking day/time transition...');
    let resetResult;
    try {
        resetResult = await checkDailyReset();
    } catch (error) {
        console.warn('   ⚠️ Error checking daily reset:', error);
        resetResult = { resetPerformed: false, error: error.message };
    }

    wakeReport.checks.push({
        name: 'daily_reset',
        result: resetResult || { resetPerformed: false }
    });

    if (resetResult?.resetPerformed) {
        console.log(`   ✅ Day transition handled (${resetResult.daysMissed || 0} days missed)`);
    }

    // 2. CHECK: Is there an open sleep session?
    console.log('   2️⃣ Checking for open sleep session...');
    const hasOpenSleep = getPersistedOpenSleepSession();
    if (hasOpenSleep) {
        console.log('   🛏️ Open sleep session detected - awaiting user interaction');
        // Mark that we have pending sleep recovery
        localStorage.setItem(HEARTBEAT_KEYS.PENDING_SLEEP_RECOVERY, 'true');

        wakeReport.checks.push({
            name: 'sleep_recovery',
            result: { pending: true, session: hasOpenSleep }
        });

        // If user has already interacted, show prompt now
        if (HeartbeatState.userHasInteracted && !HeartbeatState.sleepRecoveryShown) {
            checkPendingSleepRecovery();
        }
    } else {
        wakeReport.checks.push({
            name: 'sleep_recovery',
            result: { pending: false }
        });
    }

    // 3. UPDATE: Refresh all UI components
    console.log('   3️⃣ Refreshing UI components...');
    try {
        // Points/Food
        if (typeof updateFoodUI === 'function') await updateFoodUI();

        // Water
        if (typeof updateWaterUI === 'function') await updateWaterUI();

        // Exercise
        if (typeof updateExerciseUI === 'function') await updateExerciseUI();

        // Medications
        if (typeof updateMedicationUI === 'function') await updateMedicationUI();

        // Tasks
        if (typeof updateTasksUI === 'function') await updateTasksUI();

        // Sleep
        if (typeof updateSleepUI === 'function') await updateSleepUI();

        // Home stats
        if (typeof updateHomeStats === 'function') await updateHomeStats();

        // Generic fallback
        if (typeof updateAllUI === 'function') await updateAllUI();

        wakeReport.checks.push({
            name: 'ui_refresh',
            result: { success: true }
        });
    } catch (error) {
        console.warn('   ⚠️ UI refresh had errors:', error);
        wakeReport.checks.push({
            name: 'ui_refresh',
            result: { success: false, error: error.message }
        });
    }

    // 4. PERSIST: Update active date
    persistActiveDate();

    console.log('✅ App wake checks complete');
    console.log('   Wake report:', wakeReport);

    return wakeReport;
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

// ============ DAILY RESET LOGIC (ROBUST) ============
// Browser-independent daily reset with time-aware logic

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

    // Settings stores resetTime as "HH:MM" string (e.g., "04:00")
    const resetTime = settings.resetTime || '04:00';
    const [resetHour, resetMinute] = resetTime.split(':').map(Number);

    return getLogicalDay(new Date(), resetHour || 4, resetMinute || 0);
}

/**
 * Override global getTodayKey() to use logical day
 */
window.getTodayKey = getCurrentLogicalDay;

/**
 * Get reset time configuration
 * Reads from user settings where resetTime is stored as "HH:MM" string
 */
async function getResetTimeConfig() {
    const userId = getCurrentUserId();
    if (!userId) return { hour: 4, minute: 0, timeString: '04:00' };

    try {
        const settings = await getSettings(userId);
        // Settings stores resetTime as "HH:MM" string (e.g., "04:00")
        const resetTime = settings?.resetTime || '04:00';
        const [hour, minute] = resetTime.split(':').map(Number);

        return {
            hour: hour || 4,
            minute: minute || 0,
            timeString: resetTime
        };
    } catch (error) {
        return { hour: 4, minute: 0, timeString: '04:00' };
    }
}

/**
 * Calculate days between two date strings (YYYY-MM-DD format)
 */
function daysBetween(date1Str, date2Str) {
    const d1 = new Date(date1Str + 'T00:00:00');
    const d2 = new Date(date2Str + 'T00:00:00');
    const diffMs = Math.abs(d2 - d1);
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Persist the current active date to localStorage
 * Called periodically to track when user was last active
 */
function persistActiveDate() {
    const userId = getCurrentUserId();
    if (!userId) return;

    const currentLogicalDay = getCurrentLogicalDay();
    localStorage.setItem(`${HEARTBEAT_KEYS.LAST_ACTIVE_DATE}_${userId}`, JSON.stringify({
        date: currentLogicalDay,
        timestamp: Date.now(),
        actualDate: new Date().toISOString()
    }));
}

/**
 * Get the last active date from localStorage
 */
function getLastActiveDate() {
    const userId = getCurrentUserId();
    if (!userId) return null;

    try {
        const data = localStorage.getItem(`${HEARTBEAT_KEYS.LAST_ACTIVE_DATE}_${userId}`);
        if (!data) return null;
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

/**
 * Check if we've crossed the daily reset boundary
 * Robust version that handles device sleep, browser close, etc.
 */
async function checkDailyReset() {
    console.log('🕐 Checking daily reset...');

    const userId = getCurrentUserId();
    if (!userId) return { resetPerformed: false, reason: 'no_user' };

    // Get user's reset time from settings
    const { hour: resetHour, minute: resetMinute } = await getResetTimeConfig();

    // Get last reset date (user-specific)
    const resetKey = `lastDailyReset_user_${userId}`;
    const lastReset = localStorage.getItem(resetKey);

    // Calculate current logical day
    const currentLogicalDay = getLogicalDay(new Date(), resetHour, resetMinute);

    // Get last active date for gap detection
    const lastActive = getLastActiveDate();

    if (lastReset !== currentLogicalDay) {
        // Calculate how many days have passed
        const daysMissed = lastReset ? daysBetween(lastReset, currentLogicalDay) : 0;

        console.log(`🌅 Day transition detected!`);
        console.log(`   Last reset: ${lastReset || 'never'}`);
        console.log(`   Current day: ${currentLogicalDay}`);
        console.log(`   Days since last reset: ${daysMissed}`);

        if (lastActive) {
            const lastActiveTime = new Date(lastActive.timestamp);
            const hoursSinceActive = (Date.now() - lastActiveTime) / (1000 * 60 * 60);
            console.log(`   Hours since last active: ${hoursSinceActive.toFixed(1)}`);
        }

        // Perform daily reset
        await performDailyReset(lastReset, currentLogicalDay, daysMissed);

        // Save new reset date
        localStorage.setItem(resetKey, currentLogicalDay);

        // Update active date
        persistActiveDate();

        // Show time-of-day aware notification
        const { greeting, emoji } = getTimeOfDayGreeting();
        const resetTimeStr = formatResetTime(resetHour, resetMinute);

        if (window.showToast) {
            if (daysMissed > 1) {
                showToast(`${greeting}! ${emoji} Welcome back! (${daysMissed} days)`);
            } else {
                showToast(`${greeting}! ${emoji} New day started!`);
            }
        }

        return { resetPerformed: true, daysMissed, currentDay: currentLogicalDay };
    } else {
        console.log(`✅ Same day (${currentLogicalDay}), no reset needed`);

        // Still update active date
        persistActiveDate();

        return { resetPerformed: false, currentDay: currentLogicalDay };
    }
}

/**
 * Perform the actual daily reset - comprehensive version
 * Resets: points, water, meds, exercise, tasks
 */
async function performDailyReset(fromDate, toDate, daysMissed = 0) {
    console.log('🔄 Performing comprehensive daily reset...');
    console.log(`   From: ${fromDate || 'initial'} → To: ${toDate}`);

    const resetActions = [];

    // 1. POINTS - Clear cached daily points (will recalculate from DB)
    try {
        if (window.refreshFoodData) {
            await window.refreshFoodData();
            resetActions.push('points');
        }
    } catch (e) {
        console.warn('Points refresh failed:', e);
    }

    // 2. WATER - Reset water counter display
    try {
        if (window.updateWaterUI) {
            await window.updateWaterUI();
            resetActions.push('water');
        } else if (window.refreshWaterData) {
            await window.refreshWaterData();
            resetActions.push('water');
        }
    } catch (e) {
        console.warn('Water refresh failed:', e);
    }

    // 3. MEDICATIONS - Reset med tracking for new day
    try {
        if (window.updateMedicationUI) {
            await window.updateMedicationUI();
            resetActions.push('meds');
        } else if (window.refreshMedsData) {
            await window.refreshMedsData();
            resetActions.push('meds');
        }
    } catch (e) {
        console.warn('Meds refresh failed:', e);
    }

    // 4. EXERCISE - Reset exercise points display
    try {
        if (window.updateExerciseUI) {
            await window.updateExerciseUI();
            resetActions.push('exercise');
        } else if (window.refreshExerciseData) {
            await window.refreshExerciseData();
            resetActions.push('exercise');
        }
    } catch (e) {
        console.warn('Exercise refresh failed:', e);
    }

    // 5. TASKS - Reset daily tasks
    try {
        if (window.updateTasksUI) {
            await window.updateTasksUI();
            resetActions.push('tasks');
        } else if (window.refreshTasksData) {
            await window.refreshTasksData();
            resetActions.push('tasks');
        }
    } catch (e) {
        console.warn('Tasks refresh failed:', e);
    }

    // 6. SLEEP - Update sleep UI (but DON'T reset open sessions - handled separately)
    try {
        if (window.updateSleepUI) {
            await window.updateSleepUI();
            resetActions.push('sleep_ui');
        }
    } catch (e) {
        console.warn('Sleep UI refresh failed:', e);
    }

    // 7. HOME DASHBOARD - Refresh home stats
    try {
        if (window.updateHomeStats) {
            await window.updateHomeStats();
            resetActions.push('home');
        }
    } catch (e) {
        console.warn('Home stats refresh failed:', e);
    }

    // 8. GENERIC REFRESH - Fallback to general refresh functions
    try {
        if (window.refreshAllData) {
            await window.refreshAllData();
        }
        if (window.refreshStats) {
            await window.refreshStats();
        }
        if (window.updateAllUI) {
            await window.updateAllUI();
        }
    } catch (e) {
        console.warn('General refresh failed:', e);
    }

    // Log the reset event for debugging
    console.log(`✅ Daily reset complete. Reset: ${resetActions.join(', ') || 'general refresh'}`);

    // Store reset event in localStorage for debugging
    try {
        const resetLog = JSON.parse(localStorage.getItem('dailyResetLog') || '[]');
        resetLog.push({
            timestamp: Date.now(),
            from: fromDate,
            to: toDate,
            daysMissed,
            actions: resetActions
        });
        // Keep only last 10 resets
        if (resetLog.length > 10) {
            resetLog.shift();
        }
        localStorage.setItem('dailyResetLog', JSON.stringify(resetLog));
    } catch (e) {
        // Ignore logging errors
    }

    return resetActions;
}

/**
 * Get next reset time (for display)
 */
function getNextResetTime() {
    const settings = window.userSettings;
    if (!settings) return null;

    // Settings stores resetTime as "HH:MM" string (e.g., "04:00")
    const resetTime = settings.resetTime || '04:00';
    const [resetHour, resetMinute] = resetTime.split(':').map(Number);

    const now = new Date();
    const next = new Date();
    next.setHours(resetHour || 4, resetMinute || 0, 0, 0);

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

// Daily reset (robust version)
window.checkDailyReset = checkDailyReset;
window.performDailyReset = performDailyReset;
window.getLogicalDay = getLogicalDay;
window.getCurrentLogicalDay = getCurrentLogicalDay;
window.getNextResetTime = getNextResetTime;
window.formatResetTime = formatResetTime;
window.getTimeUntilReset = getTimeUntilReset;
window.getResetTimeConfig = getResetTimeConfig;
window.persistActiveDate = persistActiveDate;
window.getLastActiveDate = getLastActiveDate;
window.daysBetween = daysBetween;

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
window.checkSleepDurationWarning = checkSleepDurationWarning;

console.log('📋 Session management v2.4.0 loaded (robust heartbeat + comprehensive daily reset)');
