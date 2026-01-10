// ============ COMPLETE ADMIN PANEL - ALL USER DATA ============
// Ultimate Wellness - Development Admin Interface
// Full visibility into everything being tracked

// ============ STATE ============
let currentTab = 'dashboard';
let allData = {};

// ============ INITIALIZATION ============
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔬 Complete Admin Panel Initialized');
    
    // Initialize database
    await initDB();
    
    // Load all data
    await loadAllData();
    
    // Load stats
    await refreshStats();
});

// ============ TAB SWITCHING ============
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tabs
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    
    // Auto-load data for tab
    if (tabName !== 'dashboard' && tabName !== 'insights') {
        loadTable(tabName);
    }
}

// ============ LOAD ALL DATA ============
async function loadAllData() {
    console.log('📥 Loading all user data...');
    
    try {
        allData = {
            sleep: await dbGetAll('sleep') || [],
            tasks: await dbGetAll('tasks') || [],
            weight_logs: await dbGetAll('weight_logs') || [],
            water: await dbGetAll('water') || [],
            medications: await dbGetAll('medications') || [],
            foods: await dbGetAll('foods') || [],
            exercise: await dbGetAll('exercise') || [],
            pantry: await dbGetAll('pantry_items') || [],
            photos: await dbGetAll('photos') || [],
            settings: await getSettings() || {},
            zpf: loadZeroPointFoodsTable(),
            upc: await dbGetAll('upc_database') || [],
            bot: JSON.parse(localStorage.getItem('botScenarios') || '[]')
        };
        
        console.log('✅ All data loaded:', {
            sleep: allData.sleep.length,
            tasks: allData.tasks.length,
            weight: allData.weight_logs.length,
            water: allData.water.length,
            meds: allData.medications.length,
            foods: allData.foods.length,
            exercise: allData.exercise.length,
            pantry: allData.pantry.length,
            photos: allData.photos.length
        });
        
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function loadZeroPointFoodsTable() {
    const stored = localStorage.getItem('zeroPointFoods');
    let zpf = stored ? JSON.parse(stored) : (typeof ZERO_POINT_FOODS !== 'undefined' ? ZERO_POINT_FOODS : {});
    
    const rows = [];
    for (const [category, foods] of Object.entries(zpf)) {
        for (const food of foods) {
            rows.push({
                program: 'Core',
                category: category,
                food_item: food
            });
        }
    }
    return rows;
}

// ============ STATS DASHBOARD ============
async function refreshStats() {
    // Sleep
    const sleep = allData.sleep || await dbGetAll('sleep') || [];
    document.getElementById('statSleep').textContent = sleep.length;
    
    // Tasks (active only)
    const tasks = allData.tasks || await dbGetAll('tasks') || [];
    const activeTasks = tasks.filter(t => t.status === 'active');
    document.getElementById('statTasks').textContent = activeTasks.length;
    
    // Weight
    const weight = allData.weight_logs || await dbGetAll('weight_logs') || [];
    document.getElementById('statWeight').textContent = weight.length;
    
    // Water
    const water = allData.water || await dbGetAll('water') || [];
    document.getElementById('statWater').textContent = water.length;
    
    // Meds
    const meds = allData.medications || await dbGetAll('medications') || [];
    document.getElementById('statMeds').textContent = meds.length;
    
    // Foods
    const foods = allData.foods || await dbGetAll('foods') || [];
    document.getElementById('statFoods').textContent = foods.length;
    
    // Exercise
    const exercise = allData.exercise || await dbGetAll('exercise') || [];
    document.getElementById('statExercise').textContent = exercise.length;
    
    // Photos
    const photos = allData.photos || await dbGetAll('photos') || [];
    document.getElementById('statPhotos').textContent = photos.length;
}

// ============ TABLE LOADING ============
async function loadTable(tableName) {
    let data = [];
    let tbody;
    
    switch(tableName) {
        case 'sleep':
            data = allData.sleep || await dbGetAll('sleep') || [];
            tbody = document.querySelector('#tableSleep tbody');
            renderSleepTable(tbody, data);
            break;
            
        case 'tasks':
            data = allData.tasks || await dbGetAll('tasks') || [];
            tbody = document.querySelector('#tableTasks tbody');
            renderTasksTable(tbody, data);
            break;
            
        case 'weight':
            data = allData.weight_logs || await dbGetAll('weight_logs') || [];
            tbody = document.querySelector('#tableWeight tbody');
            renderWeightTable(tbody, data);
            break;
            
        case 'water':
            data = allData.water || await dbGetAll('water') || [];
            tbody = document.querySelector('#tableWater tbody');
            renderWaterTable(tbody, data);
            break;
            
        case 'meds':
            data = allData.medications || await dbGetAll('medications') || [];
            tbody = document.querySelector('#tableMeds tbody');
            renderMedsTable(tbody, data);
            break;
            
        case 'foods':
            data = allData.foods || await dbGetAll('foods') || [];
            tbody = document.querySelector('#tableFoods tbody');
            renderFoodsTable(tbody, data);
            break;
            
        case 'exercise':
            data = allData.exercise || await dbGetAll('exercise') || [];
            tbody = document.querySelector('#tableExercise tbody');
            renderExerciseTable(tbody, data);
            break;
            
        case 'pantry':
            data = allData.pantry || await dbGetAll('pantry_items') || [];
            tbody = document.querySelector('#tablePantry tbody');
            renderPantryTable(tbody, data);
            break;
            
        case 'zpf':
            data = allData.zpf || loadZeroPointFoodsTable();
            tbody = document.querySelector('#tableZpf tbody');
            renderZpfTable(tbody, data);
            break;
            
        case 'upc':
            data = allData.upc || await dbGetAll('upc_database') || [];
            tbody = document.querySelector('#tableUpc tbody');
            renderUpcTable(tbody, data);
            break;
            
        case 'bot':
            data = allData.bot || JSON.parse(localStorage.getItem('botScenarios') || '[]');
            tbody = document.querySelector('#tableBot tbody');
            renderBotTable(tbody, data);
            break;
    }
    
    console.log(`Loaded ${data.length} rows for ${tableName}`);
}

// ============ TABLE RENDERERS ============

function renderSleepTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">No sleep data logged yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td>${row.date || 'N/A'}</td>
            <td>${row.sleepTime || 'N/A'}</td>
            <td>${row.wakeTime || 'N/A'}</td>
            <td>${row.hoursSlept || calculateHours(row.sleepTime, row.wakeTime)}</td>
            <td><span class="badge ${getQualityClass(row.quality)}">${row.quality || 'N/A'}</span></td>
            <td>${row.scenario || 'N/A'}</td>
            <td>
                <button onclick="viewJSON('sleep', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('sleep', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderTasksTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No tasks yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td>${row.date || 'N/A'}</td>
            <td><span class="badge info">${row.type || 'N/A'}</span></td>
            <td>${row.text || 'N/A'}</td>
            <td><span class="badge ${row.status === 'complete' ? 'zero' : 'warning'}">${row.status || 'active'}</span></td>
            <td>
                <button onclick="viewJSON('tasks', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('tasks', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderWeightTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No weight data yet</td></tr>';
        return;
    }
    
    // Sort by date
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    tbody.innerHTML = data.map((row, idx) => {
        const prev = idx < data.length - 1 ? data[idx + 1].weight : row.weight;
        const change = row.weight - prev;
        const changeStr = change === 0 ? '→' : (change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1));
        const settings = allData.settings || {};
        const toGoal = settings.goalWeight ? (row.weight - settings.goalWeight).toFixed(1) : 'N/A';
        const bmi = settings.height ? calculateBMI(row.weight, settings.height) : 'N/A';
        
        return `
        <tr>
            <td>${row.date || 'N/A'}</td>
            <td><strong>${row.weight}</strong></td>
            <td style="color: ${change < 0 ? 'var(--primary)' : (change > 0 ? 'var(--danger)' : 'var(--text-secondary)')}">${changeStr}</td>
            <td>${bmi}</td>
            <td>${toGoal}</td>
            <td>
                <button onclick="viewJSON('weight_logs', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('weight_logs', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `}).join('');
}

function renderWaterTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No water data yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => {
        const drops = row.drops || 0;
        const foodWater = row.foodWater || 0;
        const totalMl = (drops * 250) + foodWater;
        const percent = Math.round((totalMl / 2000) * 100);
        
        return `
        <tr>
            <td>${row.date || 'N/A'}</td>
            <td>${drops}</td>
            <td>${foodWater}</td>
            <td><strong>${totalMl}</strong></td>
            <td><span class="badge ${percent >= 100 ? 'zero' : 'warning'}">${percent}%</span></td>
            <td>
                <button onclick="viewJSON('water', '${row.date}')" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('water', '${row.date}')" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `}).join('');
}

function renderMedsTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--text-secondary);">No medications set up yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td>${row.name || 'N/A'}</td>
            <td>${row.dosage || 'N/A'}</td>
            <td>${(row.times || []).join(', ') || 'N/A'}</td>
            <td>${row.status || 'active'}</td>
            <td>
                <button onclick="viewJSON('medications', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('medications', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderFoodsTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">No food logged yet</td></tr>';
        return;
    }
    
    // Sort by date desc
    data.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
    });
    
    tbody.innerHTML = data.map(row => {
        const isZero = row.points === 0 || (typeof isZeroPointFood !== 'undefined' && isZeroPointFood(row.name));
        
        return `
        <tr>
            <td>${row.date || 'N/A'}</td>
            <td>${row.time || 'N/A'}</td>
            <td>${row.name || 'N/A'}</td>
            <td><strong>${row.points}</strong></td>
            <td><span class="badge info">${row.source || 'manual'}</span></td>
            <td>${isZero ? '<span class="badge zero">✓ Zero</span>' : ''}</td>
            <td>
                <button onclick="viewJSON('foods', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('foods', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `}).join('');
}

function renderExerciseTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">No exercise logged yet</td></tr>';
        return;
    }
    
    // Sort by date desc
    data.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return b.time.localeCompare(a.time);
    });
    
    tbody.innerHTML = data.map(row => `
        <tr>
            <td>${row.date || 'N/A'}</td>
            <td>${row.time || 'N/A'}</td>
            <td>${row.type || 'N/A'}</td>
            <td>${row.minutes || 'N/A'}</td>
            <td><strong>${row.points || 0}</strong></td>
            <td>
                <button onclick="viewJSON('exercise', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('exercise', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderPantryTable(tbody, data) {
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--text-secondary);">Pantry is empty</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.map(row => {
        const isZero = row.is_zero_point || (typeof isZeroPointFood !== 'undefined' && isZeroPointFood(row.name));
        
        return `
        <tr style="${row.quantity === 0 ? 'opacity: 0.5;' : ''}">
            <td>${row.name || 'N/A'}</td>
            <td>${row.upc || 'N/A'}</td>
            <td><strong>${row.quantity || 0}</strong></td>
            <td>${row.unit || 'item'}</td>
            <td>${row.points_per_serving || 'N/A'}</td>
            <td>${row.serving_size || 'N/A'}</td>
            <td>${isZero ? '<span class="badge zero">✓ Zero</span>' : ''}</td>
            <td>
                <button onclick="viewJSON('pantry_items', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('pantry_items', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `}).join('');
}

function renderZpfTable(tbody, data) {
    tbody.innerHTML = data.map((row, idx) => `
        <tr>
            <td>${row.program || 'Core'}</td>
            <td>${row.category || 'N/A'}</td>
            <td>${row.food_item || 'N/A'}</td>
            <td>
                <button onclick="viewJSON('zpf', ${idx})" style="font-size: 11px; padding: 4px 8px;">View</button>
            </td>
        </tr>
    `).join('');
}

function renderUpcTable(tbody, data) {
    tbody.innerHTML = data.map(row => `
        <tr>
            <td>${row.upc || 'N/A'}</td>
            <td>${row.product_name || 'N/A'}</td>
            <td>${row.brand || 'N/A'}</td>
            <td>${row.points_per_serving || 'N/A'}</td>
            <td>${row.serving_size || 'N/A'}</td>
            <td>
                <button onclick="viewJSON('upc_database', ${row.id})" style="font-size: 11px; padding: 4px 8px;">View</button>
                <button class="danger" onclick="deleteRow('upc_database', ${row.id})" style="font-size: 11px; padding: 4px 8px;">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderBotTable(tbody, data) {
    tbody.innerHTML = data.map((row, idx) => `
        <tr>
            <td>${row.id || 'N/A'}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${row.triggers || 'N/A'}</td>
            <td>${row.action || 'N/A'}</td>
            <td><span class="badge ${row.enabled ? 'zero' : 'warning'}">${row.enabled ? 'Yes' : 'No'}</span></td>
            <td>
                <button onclick="viewJSON('bot', ${idx})" style="font-size: 11px; padding: 4px 8px;">View</button>
            </td>
        </tr>
    `).join('');
}

// ============ HELPER FUNCTIONS ============

function calculateHours(sleepTime, wakeTime) {
    if (!sleepTime || !wakeTime) return 'N/A';
    // Simple calculation - would need proper date handling
    return 'N/A';
}

function getQualityClass(quality) {
    const map = {
        'zonked': 'zero',
        'good': 'zero',
        'restless': 'warning',
        'poor': 'warning'
    };
    return map[quality] || 'info';
}

function calculateBMI(weight, height) {
    if (!weight || !height) return 'N/A';
    const bmi = (weight / (height * height)) * 703;
    return bmi.toFixed(1);
}

// ============ VIEW JSON ============
function viewJSON(table, id) {
    let data;
    switch(table) {
        case 'zpf':
            data = allData.zpf[id];
            break;
        case 'bot':
            data = allData.bot[id];
            break;
        default:
            data = allData[table].find(r => r.id === id || r.date === id);
    }
    
    alert('JSON View:\n\n' + JSON.stringify(data, null, 2));
}

// ============ DELETE ROW ============
async function deleteRow(table, id) {
    if (!confirm(`Delete this ${table} entry?`)) return;
    
    try {
        await dbDelete(table, id);
        await loadAllData();
        await loadTable(currentTab);
        await refreshStats();
        console.log(`✅ Deleted from ${table}`);
    } catch (error) {
        console.error('Delete error:', error);
        alert('Error deleting: ' + error.message);
    }
}

// ============ EXPORT ============
async function exportTable(tableName) {
    let data = allData[tableName];
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }
    
    const csv = arrayToCSV(data);
    downloadFile(csv, `${tableName}_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
}

async function exportAllData() {
    const backup = {
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        data: allData
    };
    
    const json = JSON.stringify(backup, null, 2);
    downloadFile(json, `wellness_complete_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

function arrayToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = [headers.join(',')];
    
    for (const row of data) {
        const values = headers.map(h => {
            let val = row[h];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'object') val = JSON.stringify(val);
            if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                val = `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        });
        rows.push(values.join(','));
    }
    
    return rows.join('\n');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ============ LOAD PHOTOS ============
async function loadPhotos() {
    const photos = allData.photos || await dbGetAll('photos') || [];
    const grid = document.getElementById('photoGrid');
    
    if (photos.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-secondary); padding: 40px;">No photos stored yet</p>';
        return;
    }
    
    grid.innerHTML = photos.map((photo, idx) => `
        <div style="border: 1px solid var(--border); border-radius: 4px; padding: 10px;">
            <img src="${photo.data}" style="width: 100%; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 5px;">
            <div style="font-size: 10px; color: var(--text-secondary);">
                ${photo.type || 'N/A'}<br>
                ${photo.date || 'N/A'}
            </div>
            <button onclick="deleteRow('photos', ${photo.id})" class="danger" style="font-size: 10px; padding: 4px 8px; margin-top: 5px; width: 100%;">Delete</button>
        </div>
    `).join('');
}

// ============ LOAD SETTINGS ============
async function loadSettings() {
    const settings = allData.settings || await getSettings();
    document.getElementById('settingsView').innerHTML = `<pre>${JSON.stringify(settings, null, 2)}</pre>`;
}

async function exportSettings() {
    const settings = allData.settings || await getSettings();
    const json = JSON.stringify(settings, null, 2);
    downloadFile(json, `settings_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
}

// ============ DEV INSIGHTS ============
async function analyzeData() {
    const content = document.getElementById('insightsContent');
    
    let html = '<h3 style="margin-bottom: 15px;">📊 Data Analysis</h3>';
    
    // Tracking completeness
    html += '<div class="insight-card">';
    html += '<h4>Tracking Completeness (Last 30 Days)</h4>';
    html += analyzeCompleteness();
    html += '</div>';
    
    // Data quality
    html += '<div class="insight-card">';
    html += '<h4>Data Quality</h4>';
    html += analyzeQuality();
    html += '</div>';
    
    // Usage patterns
    html += '<div class="insight-card">';
    html += '<h4>Usage Patterns</h4>';
    html += analyzePatterns();
    html += '</div>';
    
    content.innerHTML = html;
}

function analyzeCompleteness() {
    const last30Days = getLast30Days();
    const sleepDays = countDaysWithData(allData.sleep, last30Days);
    const weightDays = countDaysWithData(allData.weight_logs, last30Days);
    const waterDays = countDaysWithData(allData.water, last30Days);
    const foodDays = countDaysWithData(allData.foods, last30Days);
    const exerciseDays = countDaysWithData(allData.exercise, last30Days);
    
    return `
        <div class="data-quality">
            <div class="quality-indicator ${sleepDays > 20 ? 'good' : 'warning'}">
                <strong>Sleep</strong><br>${sleepDays}/30 days
            </div>
            <div class="quality-indicator ${weightDays > 20 ? 'good' : 'warning'}">
                <strong>Weight</strong><br>${weightDays}/30 days
            </div>
            <div class="quality-indicator ${waterDays > 20 ? 'good' : 'warning'}">
                <strong>Water</strong><br>${waterDays}/30 days
            </div>
            <div class="quality-indicator ${foodDays > 20 ? 'good' : 'warning'}">
                <strong>Food</strong><br>${foodDays}/30 days
            </div>
            <div class="quality-indicator ${exerciseDays > 15 ? 'good' : 'warning'}">
                <strong>Exercise</strong><br>${exerciseDays}/30 days
            </div>
        </div>
    `;
}

function analyzeQuality() {
    let issues = [];
    
    // Check for missing fields
    if (allData.foods) {
        const missingPoints = allData.foods.filter(f => !f.points && f.points !== 0);
        if (missingPoints.length > 0) {
            issues.push(`⚠️ ${missingPoints.length} food entries missing points`);
        }
    }
    
    if (allData.pantry) {
        const missingUPC = allData.pantry.filter(p => !p.upc);
        if (missingUPC.length > 0) {
            issues.push(`⚠️ ${missingUPC.length} pantry items missing UPC`);
        }
    }
    
    if (allData.sleep) {
        const missingQuality = allData.sleep.filter(s => !s.quality);
        if (missingQuality.length > 0) {
            issues.push(`⚠️ ${missingQuality.length} sleep logs missing quality rating`);
        }
    }
    
    if (issues.length === 0) {
        return '<p style="color: var(--primary);">✅ All data looks good!</p>';
    }
    
    return '<ul style="margin-left: 20px;">' + issues.map(i => `<li>${i}</li>`).join('') + '</ul>';
}

function analyzePatterns() {
    let insights = [];
    
    // Average meals per day
    if (allData.foods && allData.foods.length > 0) {
        const uniqueDays = [...new Set(allData.foods.map(f => f.date))].length;
        const avgMeals = (allData.foods.length / uniqueDays).toFixed(1);
        insights.push(`📊 Average ${avgMeals} meals logged per day`);
    }
    
    // Most common exercise
    if (allData.exercise && allData.exercise.length > 0) {
        const types = {};
        allData.exercise.forEach(e => {
            types[e.type] = (types[e.type] || 0) + 1;
        });
        const mostCommon = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
        insights.push(`💪 Most common exercise: ${mostCommon[0]} (${mostCommon[1]}x)`);
    }
    
    // Sleep quality trend
    if (allData.sleep && allData.sleep.length > 0) {
        const qualities = allData.sleep.filter(s => s.quality).map(s => s.quality);
        const goodNights = qualities.filter(q => q === 'zonked' || q === 'good').length;
        const percent = Math.round((goodNights / qualities.length) * 100);
        insights.push(`😴 ${percent}% of nights rated as good sleep`);
    }
    
    if (insights.length === 0) {
        return '<p style="color: var(--text-secondary);">Not enough data yet</p>';
    }
    
    return '<ul style="margin-left: 20px;">' + insights.map(i => `<li>${i}</li>`).join('') + '</ul>';
}

function getLast30Days() {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function countDaysWithData(data, days) {
    if (!data || data.length === 0) return 0;
    const dataDates = new Set(data.map(d => d.date));
    return days.filter(d => dataDates.has(d)).length;
}

async function checkDataQuality() {
    alert('Data Quality Check:\n\nRunning comprehensive analysis...');
    analyzeData();
}

async function findAnomalies() {
    let anomalies = [];
    
    // Weight jumps > 5 lbs
    if (allData.weight_logs && allData.weight_logs.length > 1) {
        const sorted = [...allData.weight_logs].sort((a, b) => new Date(a.date) - new Date(b.date));
        for (let i = 1; i < sorted.length; i++) {
            const diff = Math.abs(sorted[i].weight - sorted[i-1].weight);
            if (diff > 5) {
                anomalies.push(`⚠️ Weight jump of ${diff.toFixed(1)} lbs on ${sorted[i].date}`);
            }
        }
    }
    
    // Days with >100 food points
    if (allData.foods) {
        const byDate = {};
        allData.foods.forEach(f => {
            byDate[f.date] = (byDate[f.date] || 0) + f.points;
        });
        Object.entries(byDate).forEach(([date, points]) => {
            if (points > 100) {
                anomalies.push(`⚠️ Very high points (${points}) on ${date}`);
            }
        });
    }
    
    if (anomalies.length === 0) {
        alert('✅ No anomalies detected');
    } else {
        alert('Anomalies Found:\n\n' + anomalies.join('\n'));
    }
}

// ============ TEST BOT ACCESS ============
async function testBotAccess() {
    console.log('🤖 Testing bot data access...');
    
    if (typeof BotDataAPI === 'undefined') {
        alert('❌ BotDataAPI not loaded. Make sure bot-api.js is included.');
        return;
    }
    
    try {
        // Test all methods
        const stats = await BotDataAPI.getUserStats();
        const pantry = await BotDataAPI.queryPantry();
        const zpf = BotDataAPI.queryZeroPointFoods();
        
        alert(`✅ Bot Access Test Passed!\n\nUser Stats: ${JSON.stringify(stats, null, 2)}\n\nPantry Items: ${pantry.length}\nZero-Point Categories: ${zpf.length}`);
    } catch (error) {
        alert(`❌ Bot Access Test Failed:\n\n${error.message}`);
    }
}

// ============ VIEW DATA STRUCTURE ============
function viewDataStructure() {
    const structure = {
        sleep: getDataStructure(allData.sleep),
        tasks: getDataStructure(allData.tasks),
        weight_logs: getDataStructure(allData.weight_logs),
        water: getDataStructure(allData.water),
        medications: getDataStructure(allData.medications),
        foods: getDataStructure(allData.foods),
        exercise: getDataStructure(allData.exercise),
        pantry: getDataStructure(allData.pantry),
        settings: Object.keys(allData.settings || {})
    };
    
    alert('Data Structure:\n\n' + JSON.stringify(structure, null, 2));
}

function getDataStructure(data) {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
}

// ============ CLEAR DATA ============
async function clearAllData() {
    if (!confirm('⚠️ DELETE ALL DATA? This cannot be undone!')) return;
    if (!confirm('Are you ABSOLUTELY sure? All tracking data will be lost!')) return;
    
    const stores = ['sleep', 'tasks', 'weight_logs', 'water', 'medications', 'foods', 'exercise', 'pantry_items', 'photos'];
    
    for (const store of stores) {
        const all = await dbGetAll(store);
        for (const item of all) {
            if (item.id) await dbDelete(store, item.id);
            if (item.date) await dbDelete(store, item.date);
        }
    }
    
    await loadAllData();
    await refreshStats();
    alert('✅ All data cleared');
}

async function clearPhotos() {
    if (!confirm('Delete all photos?')) return;
    
    const photos = await dbGetAll('photos');
    for (const photo of photos) {
        if (photo.id) await dbDelete('photos', photo.id);
    }
    
    await loadAllData();
    await loadPhotos();
}

// Define ZERO_POINT_FOODS if not loaded
if (typeof ZERO_POINT_FOODS === 'undefined') {
    window.ZERO_POINT_FOODS = JSON.parse(localStorage.getItem('zeroPointFoods') || '{}');
}

// Define isZeroPointFood if not loaded
if (typeof isZeroPointFood === 'undefined') {
    window.isZeroPointFood = function(name) {
        if (!name) return false;
        const normalized = name.toLowerCase();
        const allFoods = Object.values(ZERO_POINT_FOODS).flat();
        return allFoods.some(f => normalized.includes(f.toLowerCase()));
    };
}
