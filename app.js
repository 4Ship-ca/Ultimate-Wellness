// ============ MAIN APPLICATION LOGIC ============
// Ultimate Wellness System v1.0

// ============ CONSTANTS ============
const EXERCISES = ['Chores', 'Vacuum', 'Laundry', 'Elliptical', 'Walk', 'Yard Work'];
const EXERCISE_POINTS_PER_15MIN = 1;

// High-water foods database
const HYDRATING_FOODS = {
    // Beverages
    'milk': 250, 'coffee': 250, 'tea': 250, 'juice': 250,
    'smoothie': 300, 'shake': 300, 'latte': 250,
    
    // Soups & Broths
    'soup': 200, 'broth': 250, 'stew': 150, 'chili': 100,
    
    // Fruits
    'watermelon': 200, 'melon': 200, 'cantaloupe': 200,
    'strawberries': 150, 'strawberry': 150,
    'orange': 125, 'oranges': 125, 'grapefruit': 150,
    'peach': 125, 'peaches': 125, 'pineapple': 125,
    'apple': 100, 'apples': 100, 'grapes': 150,
    
    // Vegetables
    'cucumber': 150, 'lettuce': 125, 'salad': 100,
    'celery': 150, 'tomato': 125, 'tomatoes': 125,
    'zucchini': 125, 'spinach': 100,
    
    // Yogurt & Dairy
    'yogurt': 150, 'cottage cheese': 125,
    
    // Other
    'popsicle': 100, 'jello': 100, 'ice cream': 75
};

// ============ STATE ============
let stream = null;
let currentScanType = null;
let processingInterval = null;
let userSettings = null;

// ============ INITIALIZATION ============
async function init() {
    try {
        // Initialize database
        await initDatabase();
        
        // Perform daily maintenance
        await performDailyMaintenance();
        
        // Load user settings
        userSettings = await getSettings();
        
        if (!userSettings) {
            // Show setup screen
            document.getElementById('setupScreen').classList.add('active');
        } else {
            // Hide setup screen
            document.getElementById('setupScreen').classList.remove('active');
            
            // Check if points recalculation is needed (every 4 weeks)
            await checkPointsRecalculation();
            
            // Load UI
            await updateAllUI();
        }
        
        setupExerciseGrid();
        
    } catch (err) {
        console.error('Initialization error:', err);
        alert('Error initializing app. Please refresh the page.');
    }
}

// ============ SETUP & SETTINGS ============
async function completeSetup() {
    const name = document.getElementById('setupName').value.trim();
    const email = document.getElementById('setupEmail').value.trim();
    const birthday = document.getElementById('setupBirthday').value;
    const gender = document.getElementById('setupGender').value;
    const weight = parseFloat(document.getElementById('setupWeight').value);
    const goalWeight = parseFloat(document.getElementById('setupGoalWeight').value);
    const heightFeet = parseInt(document.getElementById('setupHeightFeet').value);
    const heightInches = parseInt(document.getElementById('setupHeightInches').value);
    const activity = document.getElementById('setupActivity').value;

    if (!name || !email || !birthday || !weight || !goalWeight || !heightFeet) {
        alert('Please fill in all fields');
        return;
    }

    // Validate email
    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email address');
        return;
    }

    const heightInInches = (heightFeet * 12) + heightInches;
    const age = calculateAge(birthday);
    
    // Calculate initial daily points
    const dailyPoints = calculateDailyPoints(gender, age, weight, heightInInches, activity);

    userSettings = {
        id: 'user', // REQUIRED for IndexedDB
        name,
        email,
        birthday,
        gender,
        currentWeight: weight,
        goalWeight,
        heightInInches,
        activity,
        dailyPoints,
        lastPointsUpdate: new Date().toISOString().split('T')[0],
        lastWeighIn: new Date().toISOString().split('T')[0],
        joinDate: new Date().toISOString().split('T')[0]
    };

    await dbPut('settings', userSettings);
    
    // Log initial weight
    await addWeightLog({
        date: new Date().toISOString().split('T')[0],
        weight: weight,
        notes: 'Starting weight'
    });

    document.getElementById('setupScreen').classList.remove('active');
    await updateAllUI();
    
    // Send welcome email
    sendWelcomeEmail();
}

function calculateAge(birthday) {
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function calculateDailyPoints(gender, age, weight, heightInInches, activity) {
    // Weight Watchers-style points calculation
    // Base points: Gender + Age + Weight + Height + Activity
    
    let points = 0;
    
    // Gender base
    points += gender === 'female' ? 2 : 8;
    
    // Age
    if (age >= 18 && age <= 20) points += 5;
    else if (age >= 21 && age <= 35) points += 4;
    else if (age >= 36 && age <= 50) points += 3;
    else if (age >= 51 && age <= 65) points += 2;
    else points += 1;
    
    // Weight (simplified: 1 point per 10 lbs over 100 lbs)
    points += Math.floor((weight - 100) / 10);
    
    // Height bonus
    if (heightInInches < 61) points += 1;
    else points += 2;
    
    // Activity level
    const activityPoints = {
        'sedentary': 0,
        'light': 1,
        'moderate': 2,
        'active': 4,
        'very_active': 6
    };
    points += activityPoints[activity] || 0;
    
    // Enforce guardrails: 22-28 points per day
    points = Math.max(22, Math.min(28, points));
    
    return points;
}

async function checkPointsRecalculation() {
    if (!userSettings) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastUpdate = new Date(userSettings.lastPointsUpdate);
    const daysSinceUpdate = Math.floor((new Date(today) - lastUpdate) / (1000 * 60 * 60 * 24));
    
    // Recalculate every 28 days (4 weeks)
    if (daysSinceUpdate >= 28) {
        const age = calculateAge(userSettings.birthday);
        const newPoints = calculateDailyPoints(
            userSettings.gender,
            age,
            userSettings.currentWeight,
            userSettings.heightInInches,
            userSettings.activity
        );
        
        userSettings.dailyPoints = newPoints;
        userSettings.lastPointsUpdate = today;
        await dbPut('settings', userSettings);
        
        console.log(`📊 Points recalculated: ${newPoints} (every 4 weeks)`);
    }
}

async function saveSettings() {
    const name = document.getElementById('settingsName').value.trim();
    const email = document.getElementById('settingsEmail').value.trim();
    const goalWeight = parseFloat(document.getElementById('settingsGoalWeight').value);
    const heightFeet = parseInt(document.getElementById('settingsHeightFeet').value);
    const heightInches = parseInt(document.getElementById('settingsHeightInches').value);
    const activity = document.getElementById('settingsActivity').value;

    if (!name || !email || !goalWeight || !heightFeet) {
        alert('Please fill in all fields');
        return;
    }

    // Validate email
    if (!email.includes('@') || !email.includes('.')) {
        alert('Please enter a valid email address');
        return;
    }

    const heightInInches = (heightFeet * 12) + heightInches;
    
    userSettings.name = name;
    userSettings.email = email;
    userSettings.goalWeight = goalWeight;
    userSettings.heightInInches = heightInInches;
    userSettings.activity = activity;
    
    // Recalculate points with new settings
    const age = calculateAge(userSettings.birthday);
    userSettings.dailyPoints = calculateDailyPoints(
        userSettings.gender,
        age,
        userSettings.currentWeight,
        heightInInches,
        activity
    );

    await dbPut('settings', userSettings);
    await updateAllUI();
    alert('Settings saved!');
}

async function updateWeight() {
    const weight = parseFloat(document.getElementById('settingsWeight').value);
    
    if (!weight || weight <= 0) {
        alert('Please enter a valid weight');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already weighed in today
    const todayLogs = await getAllWeightLogs();
    const existingToday = todayLogs.find(log => log.date === today);
    
    if (existingToday) {
        if (!confirm('You already logged weight today. Update?')) {
            return;
        }
    }

    // Log weight
    await addWeightLog({
        date: today,
        weight: weight,
        notes: ''
    });

    // Update current weight in settings
    userSettings.currentWeight = weight;
    userSettings.lastWeighIn = today;
    
    // Recalculate points based on new weight
    const age = calculateAge(userSettings.birthday);
    userSettings.dailyPoints = calculateDailyPoints(
        userSettings.gender,
        age,
        weight,
        userSettings.heightInInches,
        userSettings.activity
    );

    await dbPut('settings', userSettings);
    await updateAllUI();
    
    const weightChange = existingToday ? weight - existingToday.weight : 0;
    const weeklyGoal = calculateWeeklyGoal();
    
    let message = `Weight updated to ${weight} lbs! Daily points adjusted to ${userSettings.dailyPoints}.`;
    
    if (weightChange !== 0) {
        message += `\n\nChange: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} lbs`;
    }
    
    message += `\nWeekly goal: ${weeklyGoal.toFixed(1)} lbs/week`;
    message += `\nTo go: ${(weight - userSettings.goalWeight).toFixed(1)} lbs`;
    
    alert(message);
}

function calculateWeeklyGoal() {
    if (!userSettings) return 0;
    
    const delta = userSettings.currentWeight - userSettings.goalWeight;
    // Always 12 weeks away from goal
    const weeklyGoal = Math.max(0, delta / 12);
    return Math.round(weeklyGoal * 10) / 10; // Round to 1 decimal
}

function calculateWeightProgress() {
    if (!userSettings) return 0;
    
    // Assuming starting weight from join date weight log
    // For now, use a simple calculation
    const totalToLose = userSettings.currentWeight - userSettings.goalWeight;
    const alreadyLost = 0; // This would be calculated from weight logs
    
    if (totalToLose <= 0) return 100;
    
    const progress = (alreadyLost / totalToLose) * 100;
    return Math.min(100, Math.max(0, progress));
}

function getNextWeighinDate() {
    // Weigh-in every Sunday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilSunday = dayOfWeek === 0 ? 7 : 7 - dayOfWeek;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============ FOOD LOGGING ============
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

async function logFood(name, points, imageData = null) {
    const today = getTodayKey();
    
    const food = {
        date: today,
        name: name,
        points: points,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    await addFood(food);
    
    // Save photo if provided
    if (imageData) {
        await addPhoto({
            date: today,
            type: 'food',
            data: imageData,
            foodName: name
        });
    }

    await updateAllUI();
    
    // Check for hydrating foods
    checkAndPromptFoodWater(name);
}

function checkAndPromptFoodWater(foodName) {
    const nameLower = foodName.toLowerCase();
    let waterContent = 0;
    let matchedFood = '';
    
    for (const [food, ml] of Object.entries(HYDRATING_FOODS)) {
        if (nameLower.includes(food)) {
            if (ml > waterContent) {
                waterContent = ml;
                matchedFood = food;
            }
        }
    }
    
    if (waterContent > 0) {
        const message = `This ${matchedFood} contains about ${waterContent}ml of water!\n\nAdd to your daily water intake?`;
        
        if (confirm(message)) {
            addFoodWaterML(waterContent);
        }
    }
}

async function logFoodWithWater(name, points, waterMl, imageData = null) {
    const today = getTodayKey();
    
    const food = {
        date: today,
        name: name,
        points: points,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    await addFood(food);
    
    if (imageData) {
        await addPhoto({
            date: today,
            type: 'food',
            data: imageData,
            foodName: name
        });
    }

    if (waterMl > 0) {
        await addFoodWaterML(waterMl);
    }

    await updateAllUI();
}

function calculatePoints(calories, protein, sugar, saturatedFat) {
    // SmartPoints formula
    const points = (calories * 0.0305) + (saturatedFat * 0.275) + (sugar * 0.12) - (protein * 0.098);
    return Math.max(0, Math.round(points));
}

// ============ WATER TRACKING ============
async function fillWaterDrop(dropNum) {
    const today = getTodayKey();
    const currentWater = await getWaterByDate(today);
    
    let newDrops = currentWater.drops || 0;
    
    // Toggle: if clicking already filled, unfill
    if (newDrops >= dropNum) {
        newDrops = dropNum - 1;
    } else {
        newDrops = dropNum;
    }
    
    await updateWater(today, newDrops, currentWater.foodWater || 0);
    await updateWaterDisplay();
}

async function updateWaterDisplay() {
    const today = getTodayKey();
    const water = await getWaterByDate(today);
    const filled = water.drops || 0;
    const foodWaterMl = water.foodWater || 0;
    
    for (let i = 1; i <= 8; i++) {
        const drop = document.getElementById(`drop${i}`);
        if (drop) {
            if (i <= filled) {
                drop.classList.add('filled');
            } else {
                drop.classList.remove('filled');
            }
        }
    }

    const directMl = filled * 250;
    const totalMl = directMl + foodWaterMl;
    
    const totalDiv = document.getElementById('waterTotal');
    if (foodWaterMl > 0) {
        totalDiv.innerHTML = `
            <div style="font-weight: 600;">${totalMl}ml / 2000ml</div>
            <div style="font-size: 10px; opacity: 0.7;">
                Drinks: ${directMl}ml (${filled}/8) + Food: ${foodWaterMl}ml
            </div>
        `;
    } else {
        totalDiv.textContent = `${totalMl}ml / 2000ml (${filled}/8 cups)`;
    }
}

async function addFoodWaterML(ml) {
    const today = getTodayKey();
    await addFoodWaterToDate(today, ml);
    await updateWaterDisplay();
    
    // Visual feedback
    const waterTotal = document.getElementById('waterTotal');
    waterTotal.style.transform = 'scale(1.1)';
    waterTotal.style.color = 'var(--success)';
    setTimeout(() => {
        waterTotal.style.transform = 'scale(1)';
        waterTotal.style.color = '';
    }, 500);
}

function manualAddFoodWater() {
    const examples = [
        'Smoothie: 300ml',
        'Bowl of soup: 200ml', 
        'Coffee/Tea: 250ml',
        'Milk (1 cup): 250ml',
        'Watermelon: 200ml',
        'Orange: 125ml',
        'Salad: 100ml'
    ];
    
    const amount = prompt(
        'How much water did your food/drink contain?\n\n' +
        'Common amounts:\n' +
        examples.join('\n') +
        '\n\nEnter amount in ml (e.g., 250):'
    );
    
    if (amount) {
        const ml = parseInt(amount);
        if (ml > 0 && ml <= 1000) {
            addFoodWaterML(ml);
            alert(`Added ${ml}ml from food! 💧`);
        } else {
            alert('Please enter a valid amount between 1-1000ml');
        }
    }
}

// ============ EXERCISE TRACKING ============
function setupExerciseGrid() {
    updateExerciseGrid();
}

async function updateExerciseGrid() {
    const today = getTodayKey();
    const todayExercise = await getExerciseByDate(today);
    
    const grid = document.getElementById('exerciseGrid');
    if (!grid) return;
    
    grid.innerHTML = EXERCISES.map(exercise => {
        const exerciseLogs = todayExercise.filter(e => e.activity === exercise);
        const totalMinutes = exerciseLogs.reduce((sum, e) => sum + e.minutes, 0);
        const breakdown = exerciseLogs.map(e => e.minutes).join(' + ');
        
        return `
            <div class="exercise-card">
                <div class="exercise-name">
                    ${exercise}
                    ${totalMinutes > 0 ? `<button class="reset-btn" onclick="resetExercise('${exercise}')">↺</button>` : ''}
                </div>
                ${totalMinutes > 0 ? `<div class="exercise-total">${breakdown} = ${totalMinutes} min</div>` : ''}
                <div class="time-buttons">
                    <button class="time-btn" onclick="logExercise('${exercise}', 15)">15m</button>
                    <button class="time-btn" onclick="logExercise('${exercise}', 30)">30m</button>
                    <button class="time-btn" onclick="logExercise('${exercise}', 45)">45m</button>
                    <button class="time-btn" onclick="logExercise('${exercise}', 60)">60m</button>
                </div>
            </div>
        `;
    }).join('');
}

async function logExercise(activity, minutes) {
    const today = getTodayKey();
    const points = (minutes / 15) * EXERCISE_POINTS_PER_15MIN;
    
    const exercise = {
        date: today,
        activity: activity,
        minutes: minutes,
        points: points,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    };

    await addExercise(exercise);
    await updateAllUI();
    await updateExerciseGrid();
    
    // Visual feedback
    if (event && event.target) {
        const btn = event.target;
        const originalBg = btn.style.background;
        btn.style.background = 'var(--success)';
        setTimeout(() => {
            btn.style.background = originalBg;
        }, 500);
    }
}

async function resetExercise(activity) {
    if (confirm(`Reset all ${activity} entries for today?`)) {
        const today = getTodayKey();
        await deleteExerciseByActivity(today, activity);
        await updateAllUI();
        await updateExerciseGrid();
    }
}

// ============ SLEEP TRACKING ============
async function logSleep(type) {
    const today = getTodayKey();
    
    if (type === 'night') {
        let sleep = await getSleepByDate(today);
        if (!sleep) {
            await addSleep({
                date: today,
                bedtime: new Date().toISOString()
            });
        } else {
            sleep.bedtime = new Date().toISOString();
            await updateSleep(sleep.id, { bedtime: sleep.bedtime });
        }
        alert('Good night! Sleep well! 😴');
        
    } else if (type === 'morning') {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let sleep = await getSleepByDate(yesterday);
        
        if (sleep && sleep.bedtime && !sleep.wakeup) {
            await updateSleep(sleep.id, { wakeup: new Date().toISOString() });
            document.getElementById('sleepQuality').style.display = 'block';
        } else {
            alert('Good morning! ☀️');
        }
    }
    
    await updateAllUI();
}

async function setSleepQuality(quality) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const sleep = await getSleepByDate(yesterday);
    
    if (sleep) {
        await updateSleep(sleep.id, { quality });
        await updateAllUI();
        document.getElementById('sleepQuality').style.display = 'none';
        
        // Visual feedback
        document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('selected'));
        if (event && event.target) {
            event.target.classList.add('selected');
        }
        
        setTimeout(() => {
            document.querySelectorAll('.quality-btn').forEach(btn => btn.classList.remove('selected'));
        }, 2000);
    }
}

// ============ TASKS ============
async function addTask(type) {
    const input = document.getElementById(type + 'Input');
    const text = input.value.trim();
    
    if (text) {
        await dbAdd('tasks', {
            date: getTodayKey(),
            type: type,
            text: text,
            status: 'active'
        });
        
        input.value = '';
        await updateAllUI();
    }
}

async function updateTaskStatus(type, id, status) {
    await updateTask(id, { status });
    await updateAllUI();
}

// ============ MEDICATIONS ============
function openMedScanner() {
    currentScanType = 'medication';
    document.getElementById('scanTitle').textContent = 'Scan Medication Label';
    document.getElementById('scanModal').classList.add('active');
}

function showManualMed() {
    const manual = document.getElementById('manualMedEntry');
    manual.style.display = manual.style.display === 'none' ? 'block' : 'none';
}

async function addMedication() {
    const name = document.getElementById('medName').value.trim();
    const dosage = document.getElementById('medDosage').value.trim();

    if (name && dosage) {
        await dbAdd('medications', {
            name: name,
            dosage: dosage
        });

        document.getElementById('medName').value = '';
        document.getElementById('medDosage').value = '';
        await updateAllUI();
    }
}

async function addScannedMed(name, dosage) {
    await dbAdd('medications', { name, dosage });
    await updateAllUI();
}

async function markMedTaken(id, time) {
    const today = getTodayKey();
    const logs = await getMedLogsByDate(today);
    const existing = logs.find(l => l.medId === id && l.time === time);
    
    if (existing) {
        // Untake it
        await dbDelete('med_logs', existing.id);
    } else {
        // Take it
        await logMedTaken(id, today, time);
    }
    
    await updateAllUI();
}

async function resetMedication(id) {
    if (confirm('Reset today\'s medication tracking for this med?')) {
        const today = getTodayKey();
        await deleteMedLogsByMedAndDate(id, today);
        await updateAllUI();
    }
}

// Stub functions for scanning (next part will implement)
function openQuickScan(type) {
    if (type === 'receipt') {
        // Demo restaurant receipt with cost tracking
        const demoReceipt = {
            restaurant: 'Demo Restaurant',
            date: getTodayKey(),
            items: [
                { name: 'Burger & Fries', estimatedPoints: 20, price: 18.99 },
                { name: 'Chicken Caesar Salad', estimatedPoints: 12, price: 14.99 },
                { name: 'Soda', estimatedPoints: 4, price: 3.50 }
            ],
            total: 37.48
        };
        displayCheatReceiptDemo(demoReceipt);
    } else {
        alert(`Scanning feature (${type}) coming in next update!`);
    }
}

function displayCheatReceiptDemo(receipt) {
    const modal = document.getElementById('scanModal');
    const resultDiv = document.getElementById('scanResult');
    
    modal.classList.add('active');
    document.getElementById('scanTitle').textContent = '🍕 Restaurant Receipt';
    
    resultDiv.innerHTML = `
        <div class="card" style="margin-top: 15px;">
            <h3>${receipt.restaurant}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 15px;">${receipt.date}</p>
            <p style="font-weight: 600; margin-bottom: 10px;">Which item was yours?</p>
            
            <div id="cheatItems">
                ${receipt.items.map((item, index) => {
                    const costPerPoint = (item.price / item.estimatedPoints).toFixed(2);
                    const expensive = parseFloat(costPerPoint) > 1.50;
                    return `
                        <div class="receipt-item" style="flex-direction: column; align-items: flex-start; padding: 12px;">
                            <div class="item-select" style="width: 100%; margin-bottom: 8px;">
                                <input type="radio" name="cheatItem" value="${index}" id="item${index}">
                                <label for="item${index}" style="flex: 1;">
                                    <strong>${item.name}</strong><br>
                                    <span style="font-size: 14px; color: var(--text-secondary);">
                                        ${item.estimatedPoints} pts • $${item.price.toFixed(2)}
                                    </span>
                                </label>
                            </div>
                            <div style="width: 100%; padding-left: 28px; font-size: 12px; ${expensive ? 'color: var(--warning);' : 'color: var(--text-secondary);'}">
                                💰 Cost per point: $${costPerPoint}
                                ${expensive ? ' ⚠️ Pricey!' : ' ✅ Good value'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: var(--bg-light); border-radius: 8px;">
                <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">Total Bill: $${receipt.total.toFixed(2)}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    💡 Homemade meals typically cost $0.50-0.75 per point
                </div>
            </div>
            
            <button class="btn" onclick="logCheatFromReceiptDemo(${JSON.stringify(receipt).replace(/"/g, '&quot;')})" style="margin-top: 15px;">
                Log My Item
            </button>
        </div>
    `;
}

async function logCheatFromReceiptDemo(receipt) {
    const selected = document.querySelector('input[name="cheatItem"]:checked');
    if (!selected) {
        alert('Please select which item was yours');
        return;
    }

    const item = receipt.items[parseInt(selected.value)];
    const today = getTodayKey();
    
    // Log food with cost
    await addFood({
        date: today,
        name: `🍕 ${item.name}`,
        points: item.estimatedPoints,
        time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
        source: 'cheat_receipt',
        cost: item.price
    });

    // Log store visit
    await addStoreVisit({
        date: today,
        store: receipt.restaurant,
        total: item.price,
        type: 'restaurant'
    });

    await updateAllUI();
    closeScan();
    
    const costPerPoint = (item.price / item.estimatedPoints).toFixed(2);
    alert(`Cheat meal logged! 

${item.name}: ${item.estimatedPoints} pts for $${item.price.toFixed(2)}
Cost per point: $${costPerPoint}

Remember: one meal, back on track next time! 💪`);
}

function closeScan() {
    document.getElementById('scanModal').classList.remove('active');
    document.getElementById('scanResult').innerHTML = '';
}

function startCamera() {}
function handleFileUpload(event) {}

// ============ UI UPDATES ============
async function updateAllUI() {
    await updateWeightDisplay();
    await updatePointsDisplay();
    await updateTodayLog();
    await updateWaterDisplay();
    await updateExercisePoints();
    await updateSleepLog();
    await updateTasksDisplay();
    await updateMedsDisplay();
}

async function updateWeightDisplay() {
    if (!userSettings) return;
    
    document.getElementById('currentWeight').textContent = `${userSettings.currentWeight} lbs`;
    document.getElementById('goalWeight').textContent = `${userSettings.goalWeight} lbs`;
    
    const progress = calculateWeightProgress();
    document.getElementById('weightProgress').style.width = `${progress}%`;
    
    const weeklyGoal = calculateWeeklyGoal();
    document.getElementById('weeklyGoal').textContent = weeklyGoal.toFixed(1);
    
    document.getElementById('nextWeighin').textContent = getNextWeighinDate();
}

async function updatePointsDisplay() {
    const today = getTodayKey();
    const foods = await getFoodsByDate(today);
    const exercises = await getExerciseByDate(today);
    
    const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
    const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
    const netPoints = foodPoints - exercisePoints;
    
    const dailyAllowance = userSettings ? userSettings.dailyPoints : 26;
    const remaining = dailyAllowance - netPoints;
    
    document.getElementById('pointsToday').textContent = netPoints;
    document.getElementById('pointsRemaining').textContent = `${remaining} remaining`;
    document.getElementById('dailyAllowance').textContent = dailyAllowance;
    
    // Points bank
    const bank = await getPointsBank();
    const bankTotal = bank.reduce((sum, p) => sum + p.points, 0);
    document.getElementById('pointsBank').textContent = bankTotal;
    
    if (bank.length > 0) {
        const oldestExpiry = bank.sort((a, b) => new Date(a.expires) - new Date(b.expires))[0].expires;
        document.getElementById('bankExpiry').textContent = oldestExpiry;
    } else {
        document.getElementById('bankExpiry').textContent = '--';
    }
}

async function updateTodayLog() {
    const today = getTodayKey();
    const foods = await getFoodsByDate(today);
    const exercises = await getExerciseByDate(today);
    
    const foodPoints = foods.reduce((sum, f) => sum + f.points, 0);
    const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
    const netPoints = foodPoints - exercisePoints;
    
    const logContainer = document.getElementById('todayLog');
    logContainer.innerHTML = `
        <div style="margin-bottom: 15px;">
            <strong>Food:</strong> ${foodPoints} pts
            ${exercisePoints > 0 ? `<br><strong>Exercise:</strong> -${exercisePoints} pts` : ''}
            <br><strong>Net:</strong> ${netPoints} pts
        </div>
        ${foods.map(f => `<div style="margin-bottom: 5px;">${f.time} - ${f.name} (${f.points}pts)</div>`).join('')}
    `;
}

async function updateExercisePoints() {
    const today = getTodayKey();
    const exercises = await getExerciseByDate(today);
    const exercisePoints = exercises.reduce((sum, e) => sum + e.points, 0);
    
    const elem = document.getElementById('exercisePoints');
    if (elem) {
        elem.textContent = `Points Earned Today: ${exercisePoints} pts`;
    }
}

async function updateSleepLog() {
    const sleepLogs = await dbGetAll('sleep');
    const recentSleep = sleepLogs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
    
    const sleepLog = document.getElementById('sleepLog');
    if (!sleepLog) return;
    
    sleepLog.innerHTML = recentSleep.length === 0
        ? '<p style="color: var(--text-secondary);">No sleep logged yet</p>'
        : recentSleep.map(sleep => {
            const quality = sleep.quality || 'Not rated';
            const emoji = {
                'zonked': '😴',
                'good': '😊',
                'restless': '😐',
                'poor': '😞'
            }[quality] || '💤';
            
            return `
                <div class="card" style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between;">
                        <div>${sleep.date}</div>
                        <div>${emoji} ${quality}</div>
                    </div>
                </div>
            `;
        }).join('');
}

async function updateTasksDisplay() {
    const today = getTodayKey();
    const allTasks = await getTasksByDate(today);
    
    ['want', 'need', 'grateful'].forEach(type => {
        const list = document.getElementById(type + 'List');
        if (!list) return;
        
        const tasks = allTasks.filter(t => t.type === type && t.status === 'active');
        list.innerHTML = tasks.length === 0 
            ? '<p style="color: var(--text-secondary); font-size: 14px;">Nothing added yet</p>'
            : tasks.map(task => `
                <div class="task-item">
                    <div>${task.text}</div>
                    <div class="task-buttons">
                        <button class="task-btn done" onclick="updateTaskStatus('${type}', ${task.id}, 'done')">Done</button>
                        <button class="task-btn defer" onclick="updateTaskStatus('${type}', ${task.id}, 'deferred')">Defer</button>
                    </div>
                </div>
            `).join('');
    });
}

async function updateMedsDisplay() {
    const today = getTodayKey();
    const meds = await getAllMedications();
    const logs = await getMedLogsByDate(today);
    
    const medsContainer = document.getElementById('todayMeds');
    if (!medsContainer) return;
    
    medsContainer.innerHTML = meds.length === 0
        ? '<p style="color: var(--text-secondary);">No medications added</p>'
        : meds.map(med => {
            const takenMorning = logs.some(l => l.medId === med.id && l.time === 'morning');
            const takenAfternoon = logs.some(l => l.medId === med.id && l.time === 'afternoon');
            const takenEvening = logs.some(l => l.medId === med.id && l.time === 'evening');
            const anyTaken = takenMorning || takenAfternoon || takenEvening;
            
            return `
                <div class="card" style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <div style="font-weight: 600;">${med.name}</div>
                        ${anyTaken ? `<button class="reset-btn" onclick="resetMedication(${med.id})">↺ Reset</button>` : ''}
                    </div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 10px;">${med.dosage}</div>
                    <div class="med-time-group">
                        <button class="med-time-btn ${takenMorning ? 'taken' : ''}" onclick="markMedTaken(${med.id}, 'morning')">
                            Morning
                        </button>
                        <button class="med-time-btn ${takenAfternoon ? 'taken' : ''}" onclick="markMedTaken(${med.id}, 'afternoon')">
                            Afternoon
                        </button>
                        <button class="med-time-btn ${takenEvening ? 'taken' : ''}" onclick="markMedTaken(${med.id}, 'evening')">
                            Evening
                        </button>
                    </div>
                </div>
            `;
        }).join('');
}

// ============ EXPORT / IMPORT ============
async function exportData() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellness-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    document.getElementById('importFile').click();
}

async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await importAllData(data);
            alert('Data imported successfully! Refreshing...');
            location.reload();
        } catch (err) {
            alert('Error importing data: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ============ START APPLICATION ============
document.addEventListener('DOMContentLoaded', init);
setInterval(performDailyMaintenance, 60000); // Check daily maintenance every minute
setInterval(checkWeeklyReminders, 3600000); // Check weekly reminders every hour

// ============ AI WELLNESS COACH ============

let aiChatOpen = false;
let currentTab = 'home';
let measurementSystem = 'imperial'; // 'imperial' or 'metric'

// Voice interaction
let recognition = null;
let isListening = false;
let voiceOutputEnabled = true;
let currentSpeech = null;

// Initialize speech recognition
function initVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.log('Speech recognition not supported');
        return false;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
        isListening = true;
        updateVoiceButton();
    };
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('aiChatInput').value = transcript;
        sendAIMessage();
    };
    
    recognition.onerror = function(event) {
        console.error('Speech recognition error:', event.error);
        isListening = false;
        updateVoiceButton();
        
        if (event.error === 'no-speech') {
            showVoiceStatus('No speech detected. Try again!');
        } else if (event.error === 'not-allowed') {
            showVoiceStatus('Microphone access denied');
        }
    };
    
    recognition.onend = function() {
        isListening = false;
        updateVoiceButton();
    };
    
    return true;
}

function toggleVoiceInput() {
    if (!recognition) {
        if (!initVoiceRecognition()) {
            alert('Voice input is not supported in your browser. Try Chrome, Edge, or Safari.');
            return;
        }
    }
    
    if (isListening) {
        recognition.stop();
        isListening = false;
    } else {
        try {
            recognition.start();
            showVoiceStatus('Listening...');
        } catch (error) {
            console.error('Failed to start recognition:', error);
            alert('Could not start voice input. Please check microphone permissions.');
        }
    }
    
    updateVoiceButton();
}

function updateVoiceButton() {
    const btn = document.getElementById('voiceBtn');
    const icon = document.getElementById('voiceIcon');
    
    if (isListening) {
        btn.classList.add('listening');
        icon.textContent = '🔴';
    } else {
        btn.classList.remove('listening');
        icon.textContent = '🎤';
    }
}

function showVoiceStatus(message) {
    const btn = document.getElementById('voiceBtn');
    const existingStatus = btn.querySelector('.voice-status');
    
    if (existingStatus) {
        existingStatus.remove();
    }
    
    const status = document.createElement('div');
    status.className = 'voice-status';
    status.textContent = message;
    btn.style.position = 'relative';
    btn.appendChild(status);
    
    setTimeout(() => {
        status.remove();
    }, 2000);
}

function toggleVoiceOutput() {
    voiceOutputEnabled = !voiceOutputEnabled;
    const icon = document.getElementById('voiceOutputIcon');
    const text = document.getElementById('voiceOutputText');
    const btn = event.target.closest('.quick-action-btn');
    
    if (voiceOutputEnabled) {
        icon.textContent = '🔊';
        text.textContent = 'Voice On';
        btn.classList.add('voice-output-active');
    } else {
        icon.textContent = '🔇';
        text.textContent = 'Voice Off';
        btn.classList.remove('voice-output-active');
        
        // Stop any current speech
        if (currentSpeech) {
            window.speechSynthesis.cancel();
        }
    }
    
    // Save preference
    localStorage.setItem('voiceOutputEnabled', voiceOutputEnabled);
}

function speakText(text) {
    if (!voiceOutputEnabled) return;
    
    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
        console.log('Speech synthesis not supported');
        return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Strip HTML tags for speaking
    const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    
    // Don't speak if text is too long (recipes)
    if (cleanText.length > 500) {
        console.log('Text too long for speech, skipping');
        return;
    }
    
    currentSpeech = new SpeechSynthesisUtterance(cleanText);
    currentSpeech.rate = 1.0;
    currentSpeech.pitch = 1.0;
    currentSpeech.volume = 1.0;
    currentSpeech.lang = 'en-US';
    
    // Add speaking indicator
    currentSpeech.onstart = function() {
        addSpeakingIndicator();
    };
    
    currentSpeech.onend = function() {
        removeSpeakingIndicator();
        currentSpeech = null;
    };
    
    currentSpeech.onerror = function(event) {
        console.error('Speech synthesis error:', event);
        removeSpeakingIndicator();
        currentSpeech = null;
    };
    
    window.speechSynthesis.speak(currentSpeech);
}

function addSpeakingIndicator() {
    const header = document.querySelector('.ai-chat-header');
    if (!header || header.querySelector('.speaking-indicator')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'speaking-indicator';
    indicator.innerHTML = '<div class="speaking-dot"></div><div class="speaking-dot"></div><div class="speaking-dot"></div>';
    header.appendChild(indicator);
}

function removeSpeakingIndicator() {
    const indicator = document.querySelector('.speaking-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Load voice output preference on init
document.addEventListener('DOMContentLoaded', function() {
    const savedPref = localStorage.getItem('voiceOutputEnabled');
    if (savedPref !== null) {
        voiceOutputEnabled = savedPref === 'true';
        const icon = document.getElementById('voiceOutputIcon');
        const text = document.getElementById('voiceOutputText');
        
        if (icon && text) {
            if (voiceOutputEnabled) {
                icon.textContent = '🔊';
                text.textContent = 'Voice On';
            } else {
                icon.textContent = '🔇';
                text.textContent = 'Voice Off';
            }
        }
    }
});

function toggleAIChat() {
    aiChatOpen = !aiChatOpen;
    const chatWindow = document.getElementById('aiChatWindow');
    const chatBubble = document.getElementById('aiChatBubble');
    
    if (aiChatOpen) {
        chatWindow.classList.add('active');
        chatBubble.style.display = 'none';
        updateAIContext();
    } else {
        chatWindow.classList.remove('active');
        chatBubble.style.display = 'flex';
    }
}

function updateAIContext() {
    const contextMap = {
        'home': 'Ready to help with your wellness journey!',
        'scan': 'Need help identifying food or calculating points?',
        'exercise': 'Want exercise suggestions or workout plans?',
        'sleep': 'Looking for better sleep tips?',
        'tasks': 'Need help organizing your day?',
        'meds': 'Questions about medication timing?',
        'settings': 'Want to optimize your settings?'
    };
    
    const contextEl = document.getElementById('aiContext');
    if (contextEl) {
        contextEl.textContent = contextMap[currentTab] || 'How can I help?';
    }
}

async function sendAIMessage() {
    const input = document.getElementById('aiChatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    input.value = '';
    
    // Show thinking indicator
    const thinkingId = addThinkingIndicator();
    
    try {
        // Get context for AI
        const context = await buildAIContext();
        
        // Call Claude API
        const response = await callClaudeAPI(message, context);
        
        // Remove thinking indicator
        removeThinkingIndicator(thinkingId);
        
        // Add AI response
        addChatMessage(response, 'ai');
        
    } catch (error) {
        removeThinkingIndicator(thinkingId);
        addChatMessage('Sorry, I had trouble connecting. Please try again!', 'ai');
        console.error('AI chat error:', error);
    }
}

function addChatMessage(text, sender) {
    const messagesDiv = document.getElementById('aiChatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'ai-message user-message' : 'ai-message';
    
    const avatar = document.createElement('div');
    avatar.className = sender === 'user' ? 'ai-avatar user-avatar' : 'ai-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'ai-text';
    textDiv.innerHTML = text; // Allow HTML for recipes
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(textDiv);
    messagesDiv.appendChild(messageDiv);
    
    // Scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Speak AI responses (if enabled and not user message)
    if (sender === 'ai') {
        speakText(text);
    }
    
    return messageDiv;
}

function addThinkingIndicator() {
    const messagesDiv = document.getElementById('aiChatMessages');
    const thinkingDiv = document.createElement('div');
    const id = 'thinking-' + Date.now();
    thinkingDiv.id = id;
    thinkingDiv.className = 'ai-message';
    
    thinkingDiv.innerHTML = `
        <div class="ai-avatar">🤖</div>
        <div class="ai-thinking">
            <div class="spinner"></div>
            <span>Thinking...</span>
        </div>
    `;
    
    messagesDiv.appendChild(thinkingDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    return id;
}

function removeThinkingIndicator(id) {
    const element = document.getElementById(id);
    if (element) {
        element.remove();
    }
}

async function buildAIContext() {
    // Gather user context for better AI responses
    const context = {
        currentTab: currentTab,
        userName: userSettings?.name || 'there',
        dailyPoints: userSettings?.dailyPoints || 26,
        currentWeight: userSettings?.currentWeight || 0,
        goalWeight: userSettings?.goalWeight || 0,
        today: getTodayKey(),
        preferences: {}
    };
    
    // Get today's stats
    const foods = await getFoodsByDate(context.today);
    const exercise = await getExerciseByDate(context.today);
    const water = await getWaterByDate(context.today);
    
    context.todayStats = {
        foodPoints: foods.reduce((sum, f) => sum + f.points, 0),
        exercisePoints: exercise.reduce((sum, e) => sum + e.points, 0),
        waterMl: (water.drops || 0) * 250 + (water.foodWater || 0),
        mealsLogged: foods.length
    };
    
    // Get preferences
    const prefs = await getPreferences();
    context.preferences = {
        noGoFoods: prefs.noGoFoods || [],
        favoriteIngredients: Object.keys(prefs.ingredientPrefs || {}).filter(k => prefs.ingredientPrefs[k] === 'like')
    };
    
    return context;
}

async function callClaudeAPI(userMessage, context) {
    // Check if this is a recipe request
    if (isRecipeRequest(userMessage)) {
        return await generateRecipe(userMessage, context);
    }
    
    // General wellness coaching
    const systemPrompt = buildSystemPrompt(context);
    
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 1000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userMessage }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        return data.content[0].text;
        
    } catch (error) {
        console.error('Claude API error:', error);
        return getFallbackResponse(userMessage, context);
    }
}

function isRecipeRequest(message) {
    const recipeKeywords = ['recipe', 'meal', 'cook', 'make', 'prepare', 'dinner', 'lunch', 'breakfast', 'snack', 'food idea'];
    return recipeKeywords.some(keyword => message.toLowerCase().includes(keyword));
}

async function generateRecipe(userMessage, context) {
    const pointsBudget = context.dailyPoints - context.todayStats.foodPoints;
    
    const systemPrompt = `You are a wellness-focused recipe creator. Generate recipes with:
1. Both metric AND imperial measurements
2. SmartPoints calculation (formula: Calories×0.0305 + SatFat×0.275 + Sugar×0.12 - Protein×0.098)
3. Clear cooking instructions
4. Prep time, cook time, servings

User context:
- Name: ${context.userName}
- Points remaining today: ${pointsBudget}
- Avoids: ${context.preferences.noGoFoods.join(', ') || 'Nothing specific'}
- Likes: ${context.preferences.favoriteIngredients.join(', ') || 'No preferences set'}

Format your response as HTML with classes:
- recipe-card (wrapper)
- recipe-header (title)
- recipe-stats (time, servings, points)
- recipe-section (ingredients, instructions)

Include measurement toggle: <span class="measurement" data-imperial="X oz" data-metric="Y g">X oz / Y g</span>

Provide 2-3 recipe options if asked for "ideas" or "suggestions".`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 2000,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: userMessage }
                ]
            })
        });
        
        if (!response.ok) {
            throw new Error('API request failed');
        }
        
        const data = await response.json();
        return formatRecipeResponse(data.content[0].text);
        
    } catch (error) {
        console.error('Recipe API error:', error);
        return getSampleRecipe(pointsBudget);
    }
}

function formatRecipeResponse(apiResponse) {
    // Add measurement toggle button at the top
    return `
        <div style="margin-bottom: 10px;">
            <span style="font-size: 12px; color: var(--text-secondary);">Measurements:</span>
            <div class="measurement-toggle">
                <button class="active" onclick="switchMeasurements('imperial')">Imperial</button>
                <button onclick="switchMeasurements('metric')">Metric</button>
            </div>
        </div>
        ${apiResponse}
    `;
}

function switchMeasurements(system) {
    measurementSystem = system;
    
    // Update toggle buttons
    document.querySelectorAll('.measurement-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update all measurements
    document.querySelectorAll('.measurement').forEach(elem => {
        const imperial = elem.dataset.imperial;
        const metric = elem.dataset.metric;
        elem.textContent = system === 'imperial' ? imperial : metric;
    });
}

function getSampleRecipe(pointsBudget) {
    // Fallback recipe if API fails
    return formatRecipeResponse(`
        <div class="recipe-card">
            <div class="recipe-header">🍗 Grilled Chicken & Veggie Bowl</div>
            <div class="recipe-stats">
                <span>⏱️ Prep: 10 min</span>
                <span>🔥 Cook: 20 min</span>
                <span>🍽️ Servings: 2</span>
                <span>📊 Points: 6 per serving</span>
            </div>
            
            <div class="recipe-section">
                <h4>Ingredients:</h4>
                <ul>
                    <li><span class="measurement" data-imperial="8 oz" data-metric="225 g">8 oz / 225 g</span> chicken breast</li>
                    <li><span class="measurement" data-imperial="2 cups" data-metric="300 g">2 cups / 300 g</span> mixed vegetables (broccoli, bell peppers, carrots)</li>
                    <li><span class="measurement" data-imperial="1 cup" data-metric="185 g">1 cup / 185 g</span> brown rice, cooked</li>
                    <li><span class="measurement" data-imperial="1 tbsp" data-metric="15 ml">1 tbsp / 15 ml</span> olive oil</li>
                    <li><span class="measurement" data-imperial="1 tsp" data-metric="5 ml">1 tsp / 5 ml</span> garlic powder</li>
                    <li>Salt and pepper to taste</li>
                </ul>
            </div>
            
            <div class="recipe-section">
                <h4>Instructions:</h4>
                <ol>
                    <li>Season chicken with garlic powder, salt, and pepper</li>
                    <li>Heat oil in large pan over medium-high heat</li>
                    <li>Cook chicken 6-7 minutes per side until internal temp reaches 165°F (74°C)</li>
                    <li>Remove chicken, let rest, then slice</li>
                    <li>In same pan, stir-fry vegetables 5-6 minutes until tender-crisp</li>
                    <li>Serve sliced chicken over rice with veggies on side</li>
                </ol>
            </div>
            
            <div class="recipe-section">
                <h4>Nutrition (per serving):</h4>
                <ul>
                    <li>Calories: 350</li>
                    <li>Protein: 35g</li>
                    <li>Carbs: 30g</li>
                    <li>Fat: 9g (2g saturated)</li>
                    <li>Sugar: 4g</li>
                    <li><strong>SmartPoints: 6</strong></li>
                </ul>
            </div>
        </div>
    `);
}

function buildSystemPrompt(context) {
    return `You are a supportive AI wellness coach integrated into the Ultimate Wellness System app. 

Current context:
- User: ${context.userName}
- Current tab: ${context.currentTab}
- Daily points allowance: ${context.dailyPoints}
- Points used today: ${context.todayStats.foodPoints} (${context.todayStats.mealsLogged} meals logged)
- Exercise points earned: ${context.todayStats.exercisePoints}
- Water consumed: ${context.todayStats.waterMl}ml / 2000ml goal
- Current weight: ${context.currentWeight} lbs → Goal: ${context.goalWeight} lbs

User preferences:
- Avoids: ${context.preferences.noGoFoods.join(', ') || 'None specified'}
- Favorite ingredients: ${context.preferences.favoriteIngredients.join(', ') || 'None specified'}

Be encouraging, specific, and action-oriented. Keep responses concise (2-3 paragraphs max). 
Use their name occasionally. Reference their current stats when relevant.
For exercise questions, suggest specific activities with duration and expected points.
For food questions, mention points and provide practical tips.

${getTabSpecificGuidance(context.currentTab)}`;
}

function getTabSpecificGuidance(tab) {
    const guidance = {
        'exercise': 'User is on Exercise tab. Suggest specific workouts, duration, and calculate points they\'ll earn (1 point per 15 minutes).',
        'sleep': 'User is on Sleep tab. Provide science-backed sleep tips. Mention how better sleep improves weight loss.',
        'tasks': 'User is on Tasks tab. Help with prioritization, time management, or motivation.',
        'home': 'User is on Home tab. Look at their overall day - are they on track? Offer encouragement or gentle guidance.',
        'scan': 'User is on Scan tab. Ready to help identify foods, calculate points, or explain nutrition labels.',
        'meds': 'User is on Medications tab. Help with scheduling or remembering to take meds.',
        'settings': 'User is on Settings tab. Help optimize their configuration for better results.'
    };
    
    return guidance[tab] || '';
}

function getFallbackResponse(message, context) {
    // Simple fallback if API fails
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('exercise') || lowerMsg.includes('workout')) {
        return `Hi ${context.userName}! Here are some exercise ideas for you:

💪 **Quick 30-minute workout** (2 points):
- 10 min warm-up walk
- 15 min bodyweight exercises (squats, push-ups, lunges)
- 5 min cool-down stretches

🚶 **Easy walk** (1 point per 15 min):
- Perfect for starting out
- Listen to podcast/music
- Aim for 30-45 minutes

🧹 **Active chores** (1 point per 15 min):
- Vacuuming, yard work, cleaning
- Burns calories while being productive!

Which sounds good to you?`;
    }
    
    if (lowerMsg.includes('recipe') || lowerMsg.includes('meal')) {
        return getSampleRecipe(context.dailyPoints - context.todayStats.foodPoints);
    }
    
    return `I'm here to help, ${context.userName}! Right now you have ${context.dailyPoints - context.todayStats.foodPoints} points remaining today. What would you like to know about?

- Recipe ideas
- Exercise suggestions
- Meal planning
- Nutrition tips
- Motivation boost

Just ask! 💪`;
}

function quickAIPrompt(type) {
    const prompts = {
        'recipe': `I have ${userSettings.dailyPoints - (document.getElementById('pointsToday').textContent || 0)} points left today. Can you suggest 2-3 healthy recipe options?`,
        'meal-plan': `Can you create a 3-day meal plan that fits my ${userSettings.dailyPoints} daily points?`,
        'exercise': `I'm on the exercise tab. What's a good workout plan for me today?`
    };
    
    document.getElementById('aiChatInput').value = prompts[type] || '';
    sendAIMessage();
}

// Update currentTab when switching tabs
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (event && event.target) {
        event.target.classList.add('active');
    }
    document.getElementById(tab + 'Tab').classList.add('active');
    
    // Update AI context
    updateAIContext();
    
    // Load settings when switching to settings tab
    if (tab === 'settings' && userSettings) {
        document.getElementById('settingsName').value = userSettings.name || '';
        document.getElementById('settingsEmail').value = userSettings.email || '';
        document.getElementById('settingsWeight').value = userSettings.currentWeight || '';
        document.getElementById('settingsGoalWeight').value = userSettings.goalWeight || '';
        const feet = Math.floor(userSettings.heightInInches / 12);
        const inches = userSettings.heightInInches % 12;
        document.getElementById('settingsHeightFeet').value = feet;
        document.getElementById('settingsHeightInches').value = inches;
        document.getElementById('settingsActivity').value = userSettings.activity || 'moderate';
    }
}

// Allow Enter key to send messages
document.addEventListener('DOMContentLoaded', function() {
    const aiInput = document.getElementById('aiChatInput');
    if (aiInput) {
        aiInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }
    
    // Keyboard shortcut for voice input: Ctrl/Cmd + M
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            if (aiChatOpen) {
                toggleVoiceInput();
            }
        }
    });
});

// ============ EMAIL FUNCTIONS ============

function sendWelcomeEmail() {
    if (!userSettings || !userSettings.email) return;
    
    const subject = encodeURIComponent('🔥 Welcome to Your Wellness Journey!');
    const body = encodeURIComponent(`Hi ${userSettings.name}!

Welcome to Ultimate Wellness System! 🎉

Your starting stats:
• Current Weight: ${userSettings.currentWeight} lbs
• Goal Weight: ${userSettings.goalWeight} lbs
• Daily Points: ${userSettings.dailyPoints} pts
• Weekly Goal: ${calculateWeeklyGoal().toFixed(1)} lbs/week

You've got this! Let's make every day count.

Tips to get started:
✅ Log every meal (even small snacks)
✅ Track water intake throughout the day
✅ Log exercise to earn points back
✅ Weigh in weekly (Sundays recommended)
✅ Export backup every week

Your weekly progress reports will arrive every Monday morning!

Happy tracking! 💪

- Your Ultimate Wellness System`);

    window.open(`mailto:${userSettings.email}?subject=${subject}&body=${body}`);
}

async function emailWeeklyReport() {
    if (!userSettings || !userSettings.email) {
        alert('Please add your email in Settings first!');
        return;
    }

    // Calculate weekly stats
    const stats = await calculateWeeklyStats();
    
    const subject = encodeURIComponent(`📊 Your Weekly Wellness Report - ${stats.weekLabel}`);
    const body = encodeURIComponent(generateWeeklyReportBody(stats));

    window.open(`mailto:${userSettings.email}?subject=${subject}&body=${body}`);
}

async function calculateWeeklyStats() {
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Get all data from past 7 days
    const allFoods = await dbGetAll('foods');
    const allExercise = await dbGetAll('exercise');
    const allWater = await dbGetAll('water');
    const allSleep = await dbGetAll('sleep');
    const allStores = await dbGetAll('stores');
    
    // Filter to this week
    const weekFoods = allFoods.filter(f => new Date(f.date) >= weekAgo);
    const weekExercise = allExercise.filter(e => new Date(e.date) >= weekAgo);
    const weekWater = allWater.filter(w => new Date(w.date) >= weekAgo);
    const weekSleep = allSleep.filter(s => new Date(s.date) >= weekAgo);
    const weekStores = allStores.filter(s => new Date(s.date) >= weekAgo);
    
    // Calculate totals
    const totalFoodPoints = weekFoods.reduce((sum, f) => sum + f.points, 0);
    const totalExercisePoints = weekExercise.reduce((sum, e) => sum + e.points, 0);
    const totalExerciseMinutes = weekExercise.reduce((sum, e) => sum + e.minutes, 0);
    const netPoints = totalFoodPoints - totalExercisePoints;
    const avgDailyPoints = Math.round(netPoints / 7);
    
    // Water stats
    const totalWaterDrops = weekWater.reduce((sum, w) => sum + (w.drops || 0), 0);
    const totalFoodWater = weekWater.reduce((sum, w) => sum + (w.foodWater || 0), 0);
    const totalWaterMl = (totalWaterDrops * 250) + totalFoodWater;
    const avgWaterPerDay = Math.round(totalWaterMl / 7);
    const waterGoalDays = weekWater.filter(w => ((w.drops || 0) * 250 + (w.foodWater || 0)) >= 2000).length;
    
    // Sleep stats
    const sleepQualityScores = {
        'zonked': 4,
        'good': 3,
        'restless': 2,
        'poor': 1
    };
    const avgSleepScore = weekSleep.length > 0 
        ? weekSleep.reduce((sum, s) => sum + (sleepQualityScores[s.quality] || 0), 0) / weekSleep.length
        : 0;
    const goodSleepDays = weekSleep.filter(s => s.quality === 'zonked' || s.quality === 'good').length;
    
    // Spending stats
    const totalSpent = weekStores.reduce((sum, s) => sum + (s.total || 0), 0);
    
    // Restaurant spending (from cheat receipts)
    const restaurantFoods = weekFoods.filter(f => f.source === 'cheat_receipt');
    const restaurantSpending = restaurantFoods.reduce((sum, f) => sum + (f.cost || 0), 0);
    
    // Weight progress
    const weightLogs = await getAllWeightLogs();
    const recentWeights = weightLogs.filter(w => new Date(w.date) >= weekAgo).sort((a, b) => new Date(b.date) - new Date(a.date));
    const weightChange = recentWeights.length >= 2 
        ? recentWeights[0].weight - recentWeights[recentWeights.length - 1].weight
        : 0;
    
    // Days logged
    const uniqueDays = new Set(weekFoods.map(f => f.date)).size;
    
    return {
        weekLabel: `${weekAgo.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        daysLogged: uniqueDays,
        totalFoodPoints,
        totalExercisePoints,
        netPoints,
        avgDailyPoints,
        dailyAllowance: userSettings.dailyPoints,
        totalExerciseMinutes,
        exerciseSessions: weekExercise.length,
        totalWaterMl,
        avgWaterPerDay,
        waterGoalDays,
        goodSleepDays,
        sleepScore: avgSleepScore.toFixed(1),
        totalSpent,
        restaurantSpending,
        weightChange,
        currentWeight: userSettings.currentWeight,
        goalWeight: userSettings.goalWeight,
        weeklyGoal: calculateWeeklyGoal()
    };
}

function generateWeeklyReportBody(stats) {
    const onTrack = stats.avgDailyPoints <= stats.dailyAllowance;
    const waterOnTrack = stats.waterGoalDays >= 5;
    const exerciseGood = stats.exerciseSessions >= 3;
    const sleepGood = stats.goodSleepDays >= 5;
    
    // Calculate cost per point for restaurant meals
    const restaurantCPP = stats.restaurantSpending > 0 && stats.totalFoodPoints > 0
        ? (stats.restaurantSpending / stats.totalFoodPoints).toFixed(2)
        : 0;
    
    // Generate encouragement
    let encouragement = '';
    if (onTrack && waterOnTrack && exerciseGood) {
        encouragement = "🌟 AMAZING WEEK! You're crushing it! Keep this momentum going!";
    } else if (onTrack) {
        encouragement = "💪 Great job on your points! You're building strong habits!";
    } else {
        encouragement = "📈 Every day is a fresh start! Small progress is still progress. You've got this!";
    }
    
    // Smart tips based on performance
    let tips = '';
    if (!waterOnTrack) {
        tips += '\n💧 TIP: Set phone reminders to drink water throughout the day!';
    }
    if (!exerciseGood) {
        tips += '\n🏃 TIP: Even 15 minutes of movement counts! Take the stairs, park farther away.';
    }
    if (!sleepGood) {
        tips += '\n😴 TIP: Better sleep = better choices tomorrow. Aim for 7-8 hours!';
    }
    if (stats.restaurantSpending > stats.totalSpent * 0.3) {
        tips += `\n💰 TIP: Restaurant meals cost $${restaurantCPP} per point vs homemade ~$0.50/pt. Consider meal prep!`;
    }
    
    return `Hi ${userSettings.name}!

Here's your weekly wellness report 📊

═══════════════════════════════════
📅 WEEK: ${stats.weekLabel}
═══════════════════════════════════

${encouragement}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 POINTS TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Days Logged: ${stats.daysLogged}/7 days
Food Points: ${stats.totalFoodPoints} pts
Exercise Points: -${stats.totalExercisePoints} pts
Net Points: ${stats.netPoints} pts
Daily Average: ${stats.avgDailyPoints} pts (Goal: ${stats.dailyAllowance} pts)
${onTrack ? '✅ ON TRACK!' : '⚠️ Over goal - review portion sizes'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💪 EXERCISE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Sessions: ${stats.exerciseSessions} workouts
Total Time: ${stats.totalExerciseMinutes} minutes
Points Earned: ${stats.totalExercisePoints} pts
${exerciseGood ? '✅ Great activity level!' : '📈 Aim for 3+ sessions/week'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💧 HYDRATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Water: ${stats.totalWaterMl}ml
Daily Average: ${stats.avgWaterPerDay}ml (Goal: 2000ml)
Goal Days: ${stats.waterGoalDays}/7 days
${waterOnTrack ? '✅ Well hydrated!' : '💧 Drink more water!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
😴 SLEEP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Quality Score: ${stats.sleepScore}/4.0
Good Nights: ${stats.goodSleepDays}/7 days
${sleepGood ? '✅ Well rested!' : '😴 Prioritize sleep for better results'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 SPENDING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Groceries: $${(stats.totalSpent - stats.restaurantSpending).toFixed(2)}
Restaurants: $${stats.restaurantSpending.toFixed(2)}
Total: $${stats.totalSpent.toFixed(2)}
${restaurantCPP > 0 ? `Restaurant Cost per Point: $${restaurantCPP}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ WEIGHT PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Current: ${stats.currentWeight} lbs
Goal: ${stats.goalWeight} lbs
To Go: ${(stats.currentWeight - stats.goalWeight).toFixed(1)} lbs
Weekly Goal: ${stats.weeklyGoal.toFixed(1)} lbs/week
This Week: ${stats.weightChange > 0 ? '-' : '+'}${Math.abs(stats.weightChange).toFixed(1)} lbs
${Math.abs(stats.weightChange) >= stats.weeklyGoal * 0.8 ? '✅ Great progress!' : '📊 Keep at it - results take time!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 YOUR PERSONALIZED TIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${tips || '\n🎉 You\'re doing everything right! Keep it up!'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NEXT WEEK'S FOCUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${!onTrack ? '• Stay within daily points budget\n' : ''}${!waterOnTrack ? '• Hit water goal 5+ days\n' : ''}${!exerciseGood ? '• Exercise 3+ times\n' : ''}${!sleepGood ? '• Get quality sleep 5+ nights\n' : ''}${onTrack && waterOnTrack && exerciseGood && sleepGood ? '• Maintain this amazing streak!\n• Challenge yourself to 7/7 perfect days!\n' : ''}
Remember: Progress, not perfection! 🚀

You're ${((stats.currentWeight - stats.goalWeight) / (userSettings.currentWeight - stats.goalWeight) * 100).toFixed(0)}% of the way to your goal!

Keep up the great work!
- Your Ultimate Wellness System`;
}

async function emailGroceryList() {
    if (!userSettings || !userSettings.email) {
        alert('Please add your email in Settings first!');
        return;
    }

    // Get pantry items from last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const allPantry = await dbGetAll('pantry');
    const recentItems = allPantry.filter(p => p.date >= thirtyDaysAgo);
    
    // Group by category (simplified)
    const categories = {
        'Produce': [],
        'Meat & Protein': [],
        'Dairy': [],
        'Pantry Staples': [],
        'Other': []
    };
    
    recentItems.forEach(item => {
        const name = item.name.toLowerCase();
        if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || name.includes('fish')) {
            categories['Meat & Protein'].push(item.name);
        } else if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt')) {
            categories['Dairy'].push(item.name);
        } else if (name.includes('apple') || name.includes('banana') || name.includes('lettuce') || name.includes('tomato')) {
            categories['Produce'].push(item.name);
        } else if (name.includes('rice') || name.includes('pasta') || name.includes('bread') || name.includes('cereal')) {
            categories['Pantry Staples'].push(item.name);
        } else {
            categories['Other'].push(item.name);
        }
    });

    let list = `🛒 GROCERY LIST\nGenerated: ${new Date().toLocaleDateString()}\n\n`;
    
    Object.entries(categories).forEach(([category, items]) => {
        if (items.length > 0) {
            list += `━━━━━━━━━━━━━━━━━━━━\n${category.toUpperCase()}\n━━━━━━━━━━━━━━━━━━━━\n`;
            // Remove duplicates
            const unique = [...new Set(items)];
            unique.forEach(item => {
                list += `☐ ${item}\n`;
            });
            list += '\n';
        }
    });
    
    if (recentItems.length === 0) {
        list += 'No recent items found. Scan some grocery receipts to build your list!\n';
    }
    
    list += `\n💡 SHOPPING TIPS:\n`;
    list += `• Stick to the perimeter (fresh foods)\n`;
    list += `• Check unit prices, not package prices\n`;
    list += `• Avoid shopping hungry!\n`;
    list += `• Buy seasonal produce for best deals\n`;
    list += `\nHappy shopping! 🎉`;

    const subject = encodeURIComponent('🛒 Your Grocery List');
    const body = encodeURIComponent(list);

    window.open(`mailto:${userSettings.email}?subject=${subject}&body=${body}`);
}

async function checkWeeklyReminders() {
    if (!userSettings || !userSettings.email) return;
    
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
    
    // Check if it's weigh-in day (Sunday or Monday)
    if ((dayOfWeek === 0 || dayOfWeek === 1) && shouldSendWeighInReminder()) {
        sendWeighInReminder();
    }
    
    // Check if it's Monday for weekly report
    if (dayOfWeek === 1 && shouldSendWeeklyReport()) {
        emailWeeklyReport();
    }
}

function shouldSendWeighInReminder() {
    const lastReminder = localStorage.getItem('lastWeighInReminder');
    const today = getTodayKey();
    
    // Only send once per week
    if (lastReminder === today) return false;
    
    // Check if already weighed in this week
    const lastWeighIn = userSettings.lastWeighIn;
    if (!lastWeighIn) return true;
    
    const daysSinceWeighIn = Math.floor((new Date() - new Date(lastWeighIn)) / (1000 * 60 * 60 * 24));
    return daysSinceWeighIn >= 6;
}

function shouldSendWeeklyReport() {
    const lastReport = localStorage.getItem('lastWeeklyReport');
    const today = getTodayKey();
    
    // Only send once per week
    return lastReport !== today;
}

function sendWeighInReminder() {
    if (!userSettings || !userSettings.email) return;
    
    const subject = encodeURIComponent('⚖️ Time to Weigh In!');
    const body = encodeURIComponent(`Hi ${userSettings.name}!

It's weigh-in time! ⚖️

Step on the scale and log your weight in the app.

Current: ${userSettings.currentWeight} lbs
Goal: ${userSettings.goalWeight} lbs
Weekly Target: ${calculateWeeklyGoal().toFixed(1)} lbs/week

Remember:
• Weigh at the same time each week
• First thing in the morning is best
• After bathroom, before eating
• Weight fluctuates - focus on trends!

You're doing great! Keep going! 💪

- Your Ultimate Wellness System`);

    localStorage.setItem('lastWeighInReminder', getTodayKey());
    window.open(`mailto:${userSettings.email}?subject=${subject}&body=${body}`);
}

async function updateAllUI() {
    await updateWeightDisplay();
    await updatePointsDisplay();
    await updateTodayLog();
    await updateWaterDisplay();
    await updateExercisePoints();
    await updateSleepLog();
    await updateTasksDisplay();
    await updateMedsDisplay();
    await updateEmailReminders();
}

async function updateEmailReminders() {
    const elem = document.getElementById('nextEmailReminder');
    if (!elem) return;
    
    const today = new Date();
    const dayOfWeek = today.getDay();
    
    // Calculate next Monday
    const daysUntilMonday = dayOfWeek === 1 ? 7 : (8 - dayOfWeek) % 7;
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    // Calculate next Sunday/Monday for weigh-in
    const daysUntilWeighIn = dayOfWeek === 0 ? 7 : dayOfWeek === 1 ? 6 : (7 - dayOfWeek);
    const nextWeighIn = new Date(today);
    nextWeighIn.setDate(today.getDate() + daysUntilWeighIn);
    
    elem.innerHTML = `
        Next weekly report: ${nextMonday.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}<br>
        Next weigh-in reminder: ${nextWeighIn.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
    `;
}
