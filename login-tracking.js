// ============ USER LOGIN TRACKING & IMPROVEMENT LOG ============

// ============ LOGIN TRACKING ============

/**
 * Track user login with device/browser info
 */
async function trackUserLogin() {
    const loginRecord = {
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        
        // Device Info
        os: detectOS(),
        browser: detectBrowser(),
        device: detectDevice(),
        
        // App Info
        appVersion: APP_VERSION || '2.0.0',
        
        // Screen Info
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        
        // Connection
        online: navigator.onLine,
        connectionType: getConnectionType(),
        
        // Location (if available)
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language
    };
    
    // Store in IndexedDB
    await dbPut('login_history', loginRecord);
    
    // Also keep last 100 logins in localStorage for quick access
    const recentLogins = JSON.parse(localStorage.getItem('recentLogins') || '[]');
    recentLogins.unshift(loginRecord);
    recentLogins.splice(100); // Keep only last 100
    localStorage.setItem('recentLogins', JSON.stringify(recentLogins));
    
    console.log('📊 Login tracked:', loginRecord);
    
    return loginRecord;
}

/**
 * Detect operating system
 */
function detectOS() {
    const userAgent = navigator.userAgent;
    
    if (/Android/i.test(userAgent)) return 'Android';
    if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
    if (/Win/i.test(userAgent)) return 'Windows';
    if (/Mac/i.test(userAgent)) return 'macOS';
    if (/Linux/i.test(userAgent)) return 'Linux';
    if (/CrOS/i.test(userAgent)) return 'Chrome OS';
    
    return 'Unknown';
}

/**
 * Detect browser
 */
function detectBrowser() {
    const userAgent = navigator.userAgent;
    
    // Order matters - check most specific first
    if (/Edg/i.test(userAgent)) return 'Edge';
    if (/Chrome/i.test(userAgent) && /Safari/i.test(userAgent)) return 'Chrome';
    if (/Firefox/i.test(userAgent)) return 'Firefox';
    if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return 'Safari';
    if (/Opera|OPR/i.test(userAgent)) return 'Opera';
    if (/Trident|MSIE/i.test(userAgent)) return 'IE';
    
    return 'Unknown';
}

/**
 * Detect device type
 */
function detectDevice() {
    const width = window.innerWidth;
    
    if (/Mobile|Android|iPhone|iPod/i.test(navigator.userAgent)) {
        return width < 768 ? 'Mobile' : 'Tablet';
    }
    
    return 'Desktop';
}

/**
 * Get connection type
 */
function getConnectionType() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
        return connection.effectiveType || connection.type || 'unknown';
    }
    
    return 'unknown';
}

/**
 * Get login analytics
 */
async function getLoginAnalytics(days = 30) {
    const allLogins = await dbGetAll('login_history') || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentLogins = allLogins.filter(l => 
        new Date(l.timestamp) >= cutoffDate
    );
    
    // Analyze
    const osCounts = {};
    const browserCounts = {};
    const deviceCounts = {};
    
    recentLogins.forEach(login => {
        osCounts[login.os] = (osCounts[login.os] || 0) + 1;
        browserCounts[login.browser] = (browserCounts[login.browser] || 0) + 1;
        deviceCounts[login.device] = (deviceCounts[login.device] || 0) + 1;
    });
    
    return {
        totalLogins: recentLogins.length,
        uniqueDays: [...new Set(recentLogins.map(l => l.date))].length,
        avgPerDay: recentLogins.length / days,
        
        os: osCounts,
        browsers: browserCounts,
        devices: deviceCounts,
        
        lastLogin: recentLogins[0],
        mostCommonOS: Object.entries(osCounts).sort((a, b) => b[1] - a[1])[0]?.[0],
        mostCommonBrowser: Object.entries(browserCounts).sort((a, b) => b[1] - a[1])[0]?.[0],
        mostCommonDevice: Object.entries(deviceCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    };
}

// ============ IMPROVEMENT LOG ============

/**
 * Add entry to improvement log
 * @param {String} entry - User feedback
 * @param {String} category - Optional category
 */
async function addImprovementLog(entry, category = 'general') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        entry: entry,
        category: category,
        
        // Context
        appVersion: APP_VERSION || '2.0.0',
        userAgent: navigator.userAgent,
        url: window.location.href,
        
        // User state (if available)
        currentWeight: userSettings?.currentWeight,
        daysInApp: calculateDaysInApp()
    };
    
    // Store in IndexedDB
    await dbPut('improvement_log', logEntry);
    
    // Also push to external LUT (if configured)
    await syncImprovementLogToLUT(logEntry);
    
    console.log('📝 Improvement log added:', logEntry);
    
    return logEntry;
}

/**
 * Sync improvement log to external LUT
 */
async function syncImprovementLogToLUT(entry) {
    const lutUrl = localStorage.getItem('improvementLogLUT');
    if (!lutUrl) return;
    
    try {
        // Post to external endpoint (e.g., Google Sheets, GitHub Gist, etc.)
        await fetch(lutUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry)
        });
        
        console.log('✅ Synced to external LUT');
    } catch (error) {
        console.warn('⚠️ Failed to sync to LUT:', error);
        // Store for retry later
        const pending = JSON.parse(localStorage.getItem('pendingLUTSync') || '[]');
        pending.push(entry);
        localStorage.setItem('pendingLUTSync', JSON.stringify(pending));
    }
}

/**
 * Get all improvement logs
 */
async function getImprovementLogs(filters = {}) {
    let logs = await dbGetAll('improvement_log') || [];
    
    // Filter by category
    if (filters.category) {
        logs = logs.filter(l => l.category === filters.category);
    }
    
    // Filter by date range
    if (filters.startDate) {
        logs = logs.filter(l => l.date >= filters.startDate);
    }
    
    if (filters.endDate) {
        logs = logs.filter(l => l.date <= filters.endDate);
    }
    
    // Sort by timestamp (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return logs;
}

/**
 * Export improvement logs to CSV
 */
async function exportImprovementLogs() {
    const logs = await getImprovementLogs();
    
    const csv = [
        ['Timestamp', 'Date', 'Category', 'Entry', 'App Version', 'Days in App'].join(','),
        ...logs.map(log => [
            log.timestamp,
            log.date,
            log.category,
            `"${log.entry.replace(/"/g, '""')}"`, // Escape quotes
            log.appVersion,
            log.daysInApp || ''
        ].join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `improvement_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('📥 Exported improvement logs');
}

/**
 * Calculate days user has been in app
 */
function calculateDaysInApp() {
    const firstLogin = localStorage.getItem('firstLoginDate');
    if (!firstLogin) return 0;
    
    const days = Math.floor((new Date() - new Date(firstLogin)) / (1000 * 60 * 60 * 24));
    return days;
}

// ============ SETTINGS UI INTEGRATION ============

/**
 * Add improvement log text box to settings
 */
function initImprovementLogUI() {
    const settingsTab = document.getElementById('settingsTab');
    if (!settingsTab) return;
    
    const logCard = document.createElement('div');
    logCard.className = 'card';
    logCard.innerHTML = `
        <h3>💡 Improvement Suggestions (Beta)</h3>
        <p style="font-size: 14px; color: var(--text-secondary); margin-bottom: 15px;">
            Share your feedback, bugs, or feature requests. This helps us improve the app!
        </p>
        
        <div class="input-group">
            <label>Category</label>
            <select id="improvementCategory">
                <option value="general">General Feedback</option>
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="ui">UI/UX Issue</option>
                <option value="performance">Performance</option>
                <option value="data">Data/Tracking</option>
            </select>
        </div>
        
        <div class="input-group">
            <label>Your Feedback</label>
            <textarea id="improvementText" rows="4" placeholder="Tell us what you think..."></textarea>
        </div>
        
        <button onclick="submitImprovementLog()" class="btn">
            📝 Submit Feedback
        </button>
        
        <div id="improvementSuccess" style="display: none; margin-top: 10px; padding: 10px; background: rgba(76, 175, 80, 0.1); border-radius: 4px; color: var(--primary);">
            ✅ Thanks for your feedback!
        </div>
    `;
    
    settingsTab.appendChild(logCard);
}

/**
 * Submit improvement log from UI
 */
async function submitImprovementLog() {
    const category = document.getElementById('improvementCategory').value;
    const text = document.getElementById('improvementText').value.trim();
    
    if (!text) {
        alert('Please enter your feedback');
        return;
    }
    
    await addImprovementLog(text, category);
    
    // Show success
    document.getElementById('improvementSuccess').style.display = 'block';
    document.getElementById('improvementText').value = '';
    
    // Hide success after 3s
    setTimeout(() => {
        document.getElementById('improvementSuccess').style.display = 'none';
    }, 3000);
}

// ============ ANALYTICS DASHBOARD ============

/**
 * Get comprehensive app analytics
 */
async function getAppAnalytics() {
    return {
        logins: await getLoginAnalytics(30),
        improvementLogs: (await getImprovementLogs()).length,
        
        // User engagement
        totalDaysInApp: calculateDaysInApp(),
        
        // Feature usage
        recipesViewed: (await dbGetAll('recipes') || []).length,
        recipesRated: (await dbGetAll('recipes') || []).filter(r => r.userRating).length,
        foodLogsCount: (await dbGetAll('foods') || []).length,
        exerciseLogsCount: (await dbGetAll('exercise') || []).length,
        
        // Data quality
        dataCompleteness: await calculateDataCompleteness()
    };
}

/**
 * Calculate data completeness for last 30 days
 */
async function calculateDataCompleteness() {
    const last30Days = [];
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last30Days.push(d.toISOString().split('T')[0]);
    }
    
    const foods = await dbGetAll('foods') || [];
    const exercise = await dbGetAll('exercise') || [];
    const sleep = await dbGetAll('sleep') || [];
    const water = await dbGetAll('water') || [];
    const weight = await dbGetAll('weight_logs') || [];
    
    const completeness = {
        food: last30Days.filter(d => foods.some(f => f.date === d)).length / 30,
        exercise: last30Days.filter(d => exercise.some(e => e.date === d)).length / 30,
        sleep: last30Days.filter(d => sleep.some(s => s.date === d)).length / 30,
        water: last30Days.filter(d => water.some(w => w.date === d)).length / 30,
        weight: last30Days.filter(d => weight.some(w => w.date === d)).length / 30
    };
    
    return completeness;
}

// ============ INITIALIZATION ============

// Track login on app load
// document.addEventListener('DOMContentLoaded', async () => {
//     // Track this login
//     await trackUserLogin();
//     
//     // Set first login date if not set
//     if (!localStorage.getItem('firstLoginDate')) {
//         localStorage.setItem('firstLoginDate', new Date().toISOString());
//     }
//     
//     // Initialize improvement log UI
//     initImprovementLogUI();
// });

// ============ EXPORT ============
window.LoginTracking = {
    trackUserLogin,
    getLoginAnalytics,
    detectOS,
    detectBrowser,
    detectDevice
};

window.ImprovementLog = {
    addImprovementLog,
    getImprovementLogs,
    exportImprovementLogs,
    submitImprovementLog
};

window.AppAnalytics = {
    getAppAnalytics,
    calculateDataCompleteness
};

console.log('📊 Login Tracking & Improvement Log loaded');
