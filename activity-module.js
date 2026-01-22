// ============ ACTIVITY MODULE v1.0 ============
// Independent module for exercise/activity tracking
// Extracted from app.js for better maintainability
//
// Dependencies: database.js (dbPut, dbGet, dbDelete, dbGetByUserAndDate)
// Globals used: userSettings, getCurrentUserId, getTodayKey

const ActivityModule = (function() {
    'use strict';

    // ============ ACTIVITY LOOKUP TABLE (LUT) ============
    // Standardized exercise database with MET values
    // MET = Metabolic Equivalent of Task (1 MET = resting metabolic rate)

    const ACTIVITY_LUT = {
        // Cardiovascular Activities
        walking_slow: {
            id: 'walking_slow',
            name: 'Walking (Slow)',
            category: 'cardio',
            met_value: 2.0,
            icon: '🚶',
            description: 'Leisurely walk, <2.5 mph',
            typical_duration: 30
        },
        walking_brisk: {
            id: 'walking_brisk',
            name: 'Walking (Brisk)',
            category: 'cardio',
            met_value: 3.5,
            icon: '🚶‍♂️',
            description: 'Brisk pace, 3-4 mph',
            typical_duration: 30
        },
        jogging: {
            id: 'jogging',
            name: 'Jogging',
            category: 'cardio',
            met_value: 7.0,
            icon: '🏃',
            description: 'Light running, 5 mph',
            typical_duration: 30
        },
        running: {
            id: 'running',
            name: 'Running',
            category: 'cardio',
            met_value: 9.8,
            icon: '🏃‍♂️',
            description: 'Fast running, 6+ mph',
            typical_duration: 30
        },
        cycling_leisure: {
            id: 'cycling_leisure',
            name: 'Cycling (Leisure)',
            category: 'cardio',
            met_value: 4.0,
            icon: '🚴',
            description: 'Casual biking, <10 mph',
            typical_duration: 45
        },
        cycling_fast: {
            id: 'cycling_fast',
            name: 'Cycling (Fast)',
            category: 'cardio',
            met_value: 8.0,
            icon: '🚴‍♂️',
            description: 'Vigorous biking, 14+ mph',
            typical_duration: 45
        },
        swimming_laps: {
            id: 'swimming_laps',
            name: 'Swimming (Laps)',
            category: 'cardio',
            met_value: 8.0,
            icon: '🏊',
            description: 'Freestyle, moderate pace',
            typical_duration: 30
        },
        swimming_leisure: {
            id: 'swimming_leisure',
            name: 'Swimming (Leisure)',
            category: 'cardio',
            met_value: 6.0,
            icon: '🏊‍♀️',
            description: 'Recreational swimming',
            typical_duration: 30
        },
        // Strength Training
        weight_training: {
            id: 'weight_training',
            name: 'Weight Training',
            category: 'strength',
            met_value: 6.0,
            icon: '🏋️',
            description: 'General weight lifting',
            typical_duration: 45
        },
        weight_training_heavy: {
            id: 'weight_training_heavy',
            name: 'Weight Training (Heavy)',
            category: 'strength',
            met_value: 8.0,
            icon: '🏋️‍♂️',
            description: 'Intense lifting, short rests',
            typical_duration: 45
        },
        bodyweight: {
            id: 'bodyweight',
            name: 'Bodyweight Exercises',
            category: 'strength',
            met_value: 3.8,
            icon: '💪',
            description: 'Push-ups, pull-ups, etc.',
            typical_duration: 30
        },
        // Sports
        basketball: {
            id: 'basketball',
            name: 'Basketball',
            category: 'sports',
            met_value: 6.5,
            icon: '🏀',
            description: 'Game or practice',
            typical_duration: 60
        },
        tennis: {
            id: 'tennis',
            name: 'Tennis',
            category: 'sports',
            met_value: 7.3,
            icon: '🎾',
            description: 'Singles or doubles',
            typical_duration: 60
        },
        soccer: {
            id: 'soccer',
            name: 'Soccer',
            category: 'sports',
            met_value: 7.0,
            icon: '⚽',
            description: 'Game or practice',
            typical_duration: 60
        },
        golf: {
            id: 'golf',
            name: 'Golf',
            category: 'sports',
            met_value: 4.5,
            icon: '⛳',
            description: 'Walking course',
            typical_duration: 120
        },
        // Mind-Body
        yoga: {
            id: 'yoga',
            name: 'Yoga',
            category: 'flexibility',
            met_value: 2.5,
            icon: '🧘',
            description: 'Hatha, general',
            typical_duration: 60
        },
        yoga_power: {
            id: 'yoga_power',
            name: 'Power Yoga',
            category: 'flexibility',
            met_value: 4.0,
            icon: '🧘‍♀️',
            description: 'Vigorous vinyasa',
            typical_duration: 60
        },
        pilates: {
            id: 'pilates',
            name: 'Pilates',
            category: 'flexibility',
            met_value: 3.0,
            icon: '🤸',
            description: 'Mat or reformer',
            typical_duration: 45
        },
        stretching: {
            id: 'stretching',
            name: 'Stretching',
            category: 'flexibility',
            met_value: 2.3,
            icon: '🙆',
            description: 'General stretching',
            typical_duration: 15
        },
        // Daily Activities
        dancing: {
            id: 'dancing',
            name: 'Dancing',
            category: 'recreation',
            met_value: 4.5,
            icon: '💃',
            description: 'Social or aerobic',
            typical_duration: 45
        },
        gardening: {
            id: 'gardening',
            name: 'Gardening',
            category: 'recreation',
            met_value: 3.8,
            icon: '🌱',
            description: 'Digging, planting',
            typical_duration: 60
        },
        house_cleaning: {
            id: 'house_cleaning',
            name: 'House Cleaning',
            category: 'recreation',
            met_value: 3.5,
            icon: '🧹',
            description: 'General cleaning',
            typical_duration: 60
        },
        hiking: {
            id: 'hiking',
            name: 'Hiking',
            category: 'cardio',
            met_value: 5.3,
            icon: '🥾',
            description: 'Trail walking',
            typical_duration: 90
        },
        stairs: {
            id: 'stairs',
            name: 'Stair Climbing',
            category: 'cardio',
            met_value: 8.0,
            icon: '🪜',
            description: 'Up and down stairs',
            typical_duration: 15
        },
        // HIIT / Cross-Training
        hiit: {
            id: 'hiit',
            name: 'HIIT Training',
            category: 'cardio',
            met_value: 8.0,
            icon: '⚡',
            description: 'High-intensity intervals',
            typical_duration: 30
        },
        crossfit: {
            id: 'crossfit',
            name: 'CrossFit',
            category: 'strength',
            met_value: 8.0,
            icon: '🔥',
            description: 'Mixed functional fitness',
            typical_duration: 45
        },
        // Machines
        elliptical: {
            id: 'elliptical',
            name: 'Elliptical',
            category: 'cardio',
            met_value: 5.0,
            icon: '🎯',
            description: 'Moderate pace',
            typical_duration: 30
        },
        rowing: {
            id: 'rowing',
            name: 'Rowing Machine',
            category: 'cardio',
            met_value: 7.0,
            icon: '🚣',
            description: 'Moderate pace',
            typical_duration: 30
        },
        treadmill: {
            id: 'treadmill',
            name: 'Treadmill',
            category: 'cardio',
            met_value: 6.0,
            icon: '🏃‍♀️',
            description: 'Moderate jog',
            typical_duration: 30
        },
        stationary_bike: {
            id: 'stationary_bike',
            name: 'Stationary Bike',
            category: 'cardio',
            met_value: 5.5,
            icon: '🚲',
            description: 'Moderate effort',
            typical_duration: 30
        },
        // Other
        other_cardio: {
            id: 'other_cardio',
            name: 'Other Cardio',
            category: 'cardio',
            met_value: 5.0,
            icon: '❤️',
            description: 'General cardio activity',
            typical_duration: 30
        },
        other_strength: {
            id: 'other_strength',
            name: 'Other Strength',
            category: 'strength',
            met_value: 4.0,
            icon: '💪',
            description: 'General strength training',
            typical_duration: 30
        }
    };

    // ============ CATEGORY DEFINITIONS ============
    const ACTIVITY_CATEGORIES = {
        cardio: { name: 'Cardio', icon: '❤️', description: 'Heart-pumping aerobic activities' },
        strength: { name: 'Strength', icon: '💪', description: 'Resistance and weight training' },
        sports: { name: 'Sports', icon: '⚽', description: 'Competitive and recreational sports' },
        flexibility: { name: 'Flexibility', icon: '🧘', description: 'Stretching and mind-body activities' },
        recreation: { name: 'Recreation', icon: '🌱', description: 'Active daily living and hobbies' }
    };

    // ============ ACTIVITY PACKS BY FITNESS LEVEL ============
    const ACTIVITY_PACKS = {
        low: {
            name: 'Household & Light Activity',
            description: 'Perfect for beginners or those focusing on daily movement',
            activities: [
                'walking_slow', 'walking_brisk', 'house_cleaning', 'gardening',
                'yoga', 'stretching', 'elliptical', 'treadmill', 'stationary_bike', 'pilates'
            ]
        },
        moderate: {
            name: 'Fitness & Cardio',
            description: 'For regular exercisers with moderate intensity workouts',
            activities: [
                'jogging', 'running', 'swimming_leisure', 'swimming_laps', 'cycling_leisure',
                'weight_training', 'bodyweight', 'hiit', 'elliptical', 'rowing',
                'treadmill', 'yoga_power', 'dancing'
            ]
        },
        high: {
            name: 'Endurance & Sports',
            description: 'For athletes and high-intensity training',
            activities: [
                'running', 'cycling_fast', 'swimming_laps', 'hiit', 'crossfit',
                'weight_training_heavy', 'basketball', 'tennis', 'soccer',
                'rowing', 'stairs', 'hiking', 'golf'
            ]
        }
    };

    // Map activity level numbers to pack keys
    const ACTIVITY_LEVEL_MAP = {
        1: 'low',      // Sedentary
        2: 'low',      // Lightly active
        3: 'moderate', // Moderately active
        4: 'high',     // Very active
        5: 'high'      // Extremely active
    };

    // ============ CONSTANTS ============
    const EXERCISE_POINTS_PER_100_CALORIES = 2;
    const DEFAULT_USER_WEIGHT_KG = 70;
    const MAX_UNDO_STACK = 5;

    // ============ STATE ============
    let exerciseUndoStack = [];
    let exerciseSelectedCategory = 'all';
    let activityBrowserCategory = 'all';

    // ============ LUT HELPER FUNCTIONS ============

    function getAllActivities(category = null) {
        const activities = Object.values(ACTIVITY_LUT);
        if (category && category !== 'all') {
            return activities.filter(a => a.category === category);
        }
        return activities;
    }

    function getActivityById(activityId) {
        return ACTIVITY_LUT[activityId] || null;
    }

    function searchActivities(query) {
        const lowerQuery = query.toLowerCase();
        return Object.values(ACTIVITY_LUT).filter(a =>
            a.name.toLowerCase().includes(lowerQuery) ||
            a.description.toLowerCase().includes(lowerQuery)
        );
    }

    function getUserWeightKg() {
        if (window.userSettings && window.userSettings.currentWeight) {
            return window.userSettings.currentWeight * 0.453592;
        }
        return DEFAULT_USER_WEIGHT_KG;
    }

    function calculateCaloriesBurned(activityId, durationMinutes) {
        const activity = getActivityById(activityId);
        if (!activity) return 0;

        const weightKg = getUserWeightKg();
        const hours = durationMinutes / 60;
        const calories = activity.met_value * weightKg * hours;

        return Math.round(calories * 10) / 10;
    }

    function calculatePointsFromCalories(calories) {
        const points = (calories / 100) * EXERCISE_POINTS_PER_100_CALORIES;
        return Math.round(points * 10) / 10;
    }

    function calculateActivityRewards(activityId, durationMinutes) {
        const activity = getActivityById(activityId);
        if (!activity) {
            return { calories: 0, points: 0, activity: null };
        }

        const calories = calculateCaloriesBurned(activityId, durationMinutes);
        const points = calculatePointsFromCalories(calories);

        return { calories, points, activity };
    }

    // ============ USER ACTIVITY MANAGEMENT ============

    function getUserActivityPackKey() {
        if (window.userSettings && window.userSettings.activityLevel) {
            return ACTIVITY_LEVEL_MAP[window.userSettings.activityLevel] || 'moderate';
        }
        return 'moderate';
    }

    function getDefaultActivitiesForUser() {
        const packKey = getUserActivityPackKey();
        const pack = ACTIVITY_PACKS[packKey];
        return pack ? pack.activities : ACTIVITY_PACKS.moderate.activities;
    }

    function getUserActivities() {
        if (window.userSettings && window.userSettings.customActivities) {
            return window.userSettings.customActivities;
        }
        return getDefaultActivitiesForUser();
    }

    async function saveUserActivities(activityIds) {
        if (!window.userSettings) return false;

        window.userSettings.customActivities = activityIds;

        try {
            if (typeof dbPut === 'function') {
                await dbPut('settings', window.userSettings);
                console.log('✅ User activities saved:', activityIds.length, 'activities');
            } else {
                console.warn('dbPut not available, activities saved to memory only');
            }
            return true;
        } catch (error) {
            console.error('Error saving user activities:', error);
            return false;
        }
    }

    async function initializeUserActivities() {
        if (!window.userSettings) return;

        if (!window.userSettings.customActivities) {
            const defaults = getDefaultActivitiesForUser();
            await saveUserActivities(defaults);
            console.log('📋 Initialized default activities for user:', getUserActivityPackKey());
        }
    }

    async function addActivityToUserList(activityId) {
        const currentList = getUserActivities();

        if (currentList.includes(activityId)) {
            console.log('Activity already in list:', activityId);
            return false;
        }

        const updatedList = [...currentList, activityId];
        const success = await saveUserActivities(updatedList);

        if (success) {
            await updateExerciseUI();
        }

        return success;
    }

    async function removeActivityFromUserList(activityId) {
        const currentList = getUserActivities();

        if (!currentList.includes(activityId)) {
            console.log('Activity not in list:', activityId);
            return false;
        }

        const updatedList = currentList.filter(id => id !== activityId);
        const success = await saveUserActivities(updatedList);

        if (success) {
            await updateExerciseUI();
        }

        return success;
    }

    async function resetUserActivitiesToDefault() {
        const defaults = getDefaultActivitiesForUser();
        const success = await saveUserActivities(defaults);

        if (success) {
            await updateExerciseUI();
        }

        return success;
    }

    function getAvailableActivitiesToAdd() {
        const userActivities = getUserActivities();
        return Object.values(ACTIVITY_LUT).filter(a => !userActivities.includes(a.id));
    }

    function getUserActivityObjects() {
        const activityIds = getUserActivities();
        return activityIds
            .map(id => getActivityById(id))
            .filter(a => a !== null);
    }

    // ============ HELPER WRAPPERS FOR EXTERNAL DEPENDENCIES ============
    // These wrap functions from other modules to handle cases where they might not be loaded yet

    function safeGetCurrentUserId() {
        if (typeof getCurrentUserId === 'function') {
            return getCurrentUserId();
        }
        if (typeof window.getCurrentUserId === 'function') {
            return window.getCurrentUserId();
        }
        console.warn('getCurrentUserId not available');
        return null;
    }

    function safeGetTodayKey() {
        if (typeof getTodayKey === 'function') {
            return getTodayKey();
        }
        if (typeof window.getTodayKey === 'function') {
            return window.getTodayKey();
        }
        // Fallback: return today's date in YYYY-MM-DD format
        return new Date().toISOString().split('T')[0];
    }

    // ============ DATABASE FUNCTIONS ============

    async function getExerciseByDate(userId, date) {
        try {
            if (typeof dbGetByUserAndDate !== 'function') {
                console.warn('dbGetByUserAndDate not available');
                return [];
            }
            const exercises = await dbGetByUserAndDate('exercise', userId, date);
            return exercises || [];
        } catch (error) {
            console.warn('Error getting exercise by date:', error);
            return [];
        }
    }

    async function addExercise(exerciseData) {
        try {
            if (!exerciseData.activity || !exerciseData.minutes || exerciseData.minutes <= 0) {
                console.warn('Cannot add exercise: missing or invalid data');
                return null;
            }

            const userId = safeGetCurrentUserId();
            if (!userId) {
                console.warn('Cannot add exercise: no user ID');
                return null;
            }

            const exercise = {
                id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: userId,
                date: exerciseData.date,
                activity: exerciseData.activity,
                activity_id: exerciseData.activity_id || null,
                minutes: exerciseData.minutes,
                calories: exerciseData.calories || 0,
                points: exerciseData.points || 0,
                met_value: exerciseData.met_value || null,
                time: exerciseData.time,
                timestamp: exerciseData.timestamp || Date.now()
            };

            if (typeof dbPut === 'function') {
                await dbPut('exercise', exercise);
            } else {
                console.warn('dbPut not available');
            }
            return exercise;
        } catch (error) {
            console.error('Error adding exercise:', error);
            return null;
        }
    }

    async function deleteExerciseByActivity(date, activity) {
        try {
            const userId = safeGetCurrentUserId();
            const exercises = await getExerciseByDate(userId, date);
            const toDelete = exercises.filter(e => e.activity === activity);

            if (typeof dbDelete === 'function') {
                for (const exercise of toDelete) {
                    await dbDelete('exercise', exercise.id);
                }
            }

            console.log(`Deleted ${toDelete.length} ${activity} entries for ${date}`);
        } catch (error) {
            console.error('Error deleting exercise by activity:', error);
        }
    }

    // ============ EXERCISE TRACKING UI ============

    function calculateExerciseTotals(exercises) {
        if (!exercises || exercises.length === 0) {
            return {
                total_duration: 0,
                total_calories: 0,
                total_points: 0,
                activity_count: 0,
                last_activity: null
            };
        }

        const totals = exercises.reduce((acc, ex) => {
            return {
                total_duration: acc.total_duration + (ex.minutes || 0),
                total_calories: acc.total_calories + (ex.calories || 0),
                total_points: acc.total_points + (ex.points || 0),
                activity_count: acc.activity_count + 1,
                last_activity: ex.timestamp || acc.last_activity
            };
        }, {
            total_duration: 0,
            total_calories: 0,
            total_points: 0,
            activity_count: 0,
            last_activity: null
        });

        totals.total_calories = Math.round(totals.total_calories * 10) / 10;
        totals.total_points = Math.round(totals.total_points * 10) / 10;

        return totals;
    }

    async function updateExerciseUI() {
        const userId = safeGetCurrentUserId();
        if (!userId) {
            console.warn('⚠️ No user ID for exercise UI');
            return;
        }

        const today = safeGetTodayKey();
        const todayExercise = await getExerciseByDate(userId, today);
        const totals = calculateExerciseTotals(todayExercise);

        await renderActivitySelector();
        renderExerciseIntervals(todayExercise, totals);
        updateUndoButton(todayExercise);
        updateExercisePointsDisplay(totals);
    }

    // ============ GRID ACTIVITY STATE ============
    // Track which activities are displayed in the grid
    let activeGridActivities = [];

    async function initializeActiveGridActivities() {
        const userActivities = getUserActivities();
        // Limit to first 4 activities by default
        activeGridActivities = userActivities.slice(0, 4);
        await saveActiveGridActivities();
    }

    async function saveActiveGridActivities() {
        if (!window.userSettings) return false;
        window.userSettings.activeGridActivities = activeGridActivities;
        try {
            if (typeof dbPut === 'function') {
                await dbPut('settings', window.userSettings);
            }
            return true;
        } catch (error) {
            console.error('Error saving active grid activities:', error);
            return false;
        }
    }

    function getActiveGridActivities() {
        if (window.userSettings && window.userSettings.activeGridActivities) {
            return window.userSettings.activeGridActivities;
        }
        // Fallback to first 4 user activities
        const userActivities = getUserActivities();
        return userActivities.slice(0, 4);
    }

    function getCumulativeActivityTime(activityId, exercises) {
        if (!exercises) return 0;
        return exercises
            .filter(ex => ex.activity_id === activityId)
            .reduce((sum, ex) => sum + (ex.minutes || 0), 0);
    }

    async function renderActivitySelector() {
        const grid = document.getElementById('exerciseGrid');
        if (!grid) return;

        const userId = safeGetCurrentUserId();
        const today = safeGetTodayKey();
        const todayExercises = await getExerciseByDate(userId, today);

        activeGridActivities = getActiveGridActivities();
        const gridActivityObjects = activeGridActivities
            .map(id => getActivityById(id))
            .filter(a => a !== null);

        if (gridActivityObjects.length === 0) {
            grid.innerHTML = `
                <div style="text-align: center; padding: 30px 15px; color: var(--text-secondary);">
                    <p>No activities in grid. Click + to add one!</p>
                </div>
            `;
            return;
        }

        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">';

        for (const activity of gridActivityObjects) {
            const cumulativeTime = getCumulativeActivityTime(activity.id, todayExercises);
            const interval = activity.typical_duration || 15;
            const btn1x = interval;
            const btn2x = interval * 2;
            const btn3x = interval * 3;
            const btn4x = interval * 4;

            html += `
                <div class="activity-card">
                    <div class="activity-card-header">
                        <div class="activity-card-title">
                            <span class="activity-card-icon">${activity.icon}</span>
                            <span>${activity.name}</span>
                        </div>
                        <div class="activity-card-controls">
                            <button class="activity-refresh-btn" onclick="ActivityModule.resetActivityGridTime('${activity.id}')" title="Reset time">↻</button>
                            <button class="activity-remove-btn" onclick="ActivityModule.removeFromGrid('${activity.id}')" title="Remove">−</button>
                        </div>
                    </div>

                    <div class="activity-card-time">
                        <span class="activity-total-time">${cumulativeTime}m</span>
                        <span class="activity-time-label">total</span>
                    </div>

                    <div class="preset-time-buttons">
                        <button class="preset-time-btn" onclick="ActivityModule.logActivityGridTime('${activity.id}', ${btn1x})">+${btn1x}m</button>
                        <button class="preset-time-btn" onclick="ActivityModule.logActivityGridTime('${activity.id}', ${btn2x})">+${btn2x}m</button>
                        <button class="preset-time-btn" onclick="ActivityModule.logActivityGridTime('${activity.id}', ${btn3x})">+${btn3x}m</button>
                        <button class="preset-time-btn" onclick="ActivityModule.logActivityGridTime('${activity.id}', ${btn4x})">+${btn4x}m</button>
                    </div>
                </div>
            `;
        }

        html += '</div>';
        grid.innerHTML = html;
    }

    async function openActivitySelector() {
        const userActivities = getUserActivities();
        const currentGridActivities = getActiveGridActivities();
        const availableActivities = userActivities.filter(id => !currentGridActivities.includes(id));

        if (availableActivities.length === 0) {
            alert('All your activities are already in the grid!');
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'activitySelectorModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content activity-browser-modal" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Add Activity to Grid</h3>
                    <button class="modal-close-btn" onclick="document.getElementById('activitySelectorModal').remove()">×</button>
                </div>
                <div style="padding: 20px; flex: 1; overflow-y: auto;">
                    ${availableActivities.map(id => {
                        const activity = getActivityById(id);
                        if (!activity) return '';
                        return `
                            <button onclick="ActivityModule.addToGrid('${activity.id}')" style="
                                display: block;
                                width: 100%;
                                text-align: left;
                                padding: 12px;
                                background: var(--bg-light);
                                border: 1px solid var(--bg-light);
                                border-radius: 8px;
                                margin-bottom: 8px;
                                cursor: pointer;
                                color: var(--text-primary);
                                transition: all 0.2s;
                            " onmouseover="this.style.background='var(--primary)'; this.style.color='white';" onmouseout="this.style.background='var(--bg-light)'; this.style.color='var(--text-primary)';">
                                ${activity.icon} ${activity.name}
                            </button>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    async function addToGrid(activityId) {
        activeGridActivities = getActiveGridActivities();
        if (!activeGridActivities.includes(activityId)) {
            activeGridActivities.push(activityId);
            await saveActiveGridActivities();
            await updateExerciseUI();
        }
        const modal = document.getElementById('activitySelectorModal');
        if (modal) modal.remove();
    }

    async function removeFromGrid(activityId) {
        if (confirm('Remove this activity from the grid?')) {
            activeGridActivities = getActiveGridActivities();
            activeGridActivities = activeGridActivities.filter(id => id !== activityId);
            await saveActiveGridActivities();
            await updateExerciseUI();
        }
    }

    async function logActivityGridTime(activityId, minutes) {
        const activity = getActivityById(activityId);
        if (!activity) return;

        const calculation = calculateActivityRewards(activityId, minutes);
        const today = safeGetTodayKey();

        const exercise = {
            date: today,
            activity: activity.name,
            activity_id: activityId,
            minutes: minutes,
            calories: calculation.calories,
            points: calculation.points,
            met_value: activity.met_value,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            timestamp: Date.now()
        };

        await addExercise(exercise);

        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        }
        await updateExerciseUI();
    }

    async function resetActivityGridTime(activityId) {
        const activity = getActivityById(activityId);
        if (!activity) return;

        if (confirm(`Reset ${activity.name} time to zero?`)) {
            const today = safeGetTodayKey();
            await deleteExerciseByActivity(today, activity.name);
            if (typeof updateAllUI === 'function') {
                await updateAllUI();
            }
            await updateExerciseUI();
        }
    }

    function filterExerciseCategory(category) {
        exerciseSelectedCategory = category;
        renderActivitySelector();
        updateExercisePreview();
    }

    function setExerciseDuration(minutes) {
        const input = document.getElementById('durationInput');
        if (input) {
            input.value = minutes;
            updateExercisePreview();
        }
    }

    function updateExercisePreview() {
        const activitySelect = document.getElementById('activitySelect');
        const durationInput = document.getElementById('durationInput');
        const preview = document.getElementById('exercisePreview');
        const logBtn = document.getElementById('logExerciseBtn');

        if (!activitySelect || !durationInput || !preview) return;

        const activityId = activitySelect.value;
        const duration = parseInt(durationInput.value) || 0;

        if (!activityId || duration <= 0) {
            preview.innerHTML = '<p>Select an activity and duration</p>';
            if (logBtn) logBtn.disabled = true;
            return;
        }

        const calculation = calculateActivityRewards(activityId, duration);

        if (!calculation.activity) {
            preview.innerHTML = '<p>Invalid activity selected</p>';
            if (logBtn) logBtn.disabled = true;
            return;
        }

        preview.innerHTML = `
            <div class="preview-result">
                <div class="preview-activity">${calculation.activity.icon} ${calculation.activity.name}</div>
                <div class="preview-stats">
                    <div class="preview-stat">
                        <span class="stat-label">Duration</span>
                        <span class="stat-value">${duration} min</span>
                    </div>
                    <div class="preview-stat">
                        <span class="stat-label">Calories</span>
                        <span class="stat-value">${calculation.calories} cal</span>
                    </div>
                    <div class="preview-stat highlight">
                        <span class="stat-label">Points Earned</span>
                        <span class="stat-value">+${calculation.points} pts</span>
                    </div>
                </div>
            </div>
        `;

        if (logBtn) logBtn.disabled = false;
    }

    async function logExerciseFromForm() {
        const activitySelect = document.getElementById('activitySelect');
        const durationInput = document.getElementById('durationInput');

        if (!activitySelect || !durationInput) return;

        const activityId = activitySelect.value;
        const duration = parseInt(durationInput.value) || 0;

        if (!activityId || duration <= 0) {
            alert('Please select an activity and enter duration');
            return;
        }

        await logExercise(activityId, duration);

        activitySelect.value = '';
        durationInput.value = 30;
        updateExercisePreview();
    }

    async function logExercise(activityId, minutes) {
        const today = safeGetTodayKey();
        let activity = getActivityById(activityId);

        if (!activity) {
            const foundActivity = Object.values(ACTIVITY_LUT).find(a => a.name === activityId);
            if (foundActivity) {
                activityId = foundActivity.id;
                activity = foundActivity;
            } else {
                console.warn('Unknown activity:', activityId);
                return;
            }
        }

        const calculation = calculateActivityRewards(activityId, minutes);
        const activityInfo = calculation.activity || activity;

        const exercise = {
            date: today,
            activity: activityInfo ? activityInfo.name : activityId,
            activity_id: activityId,
            minutes: minutes,
            calories: calculation.calories,
            points: calculation.points,
            met_value: activityInfo ? activityInfo.met_value : 5.0,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            timestamp: Date.now()
        };

        const saved = await addExercise(exercise);

        if (saved) {
            exerciseUndoStack.push(saved);
            if (exerciseUndoStack.length > MAX_UNDO_STACK) {
                exerciseUndoStack.shift();
            }
        }

        if (typeof updateAllUI === 'function') {
            await updateAllUI();
        }
        await updateExerciseUI();

        const logBtn = document.getElementById('logExerciseBtn');
        if (logBtn) {
            const originalText = logBtn.textContent;
            logBtn.textContent = '✓ Logged!';
            logBtn.style.background = 'var(--success)';
            setTimeout(() => {
                logBtn.textContent = originalText;
                logBtn.style.background = '';
            }, 1000);
        }

        console.log(`🏃 Logged: ${activityInfo?.name || activityId} - ${minutes} min, ${calculation.calories} cal, +${calculation.points} pts`);
    }

    function renderExerciseIntervals(exercises, totals) {
        const container = document.getElementById('exerciseIntervals');
        if (!container) return;

        if (!exercises || exercises.length === 0) {
            container.innerHTML = `
                <div class="no-exercises">
                    <p>No activities logged today</p>
                    <p class="hint">Select an activity above to get started!</p>
                </div>
            `;
            return;
        }

        const sortedExercises = [...exercises].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        let html = `
            <div class="exercise-intervals-header">
                <h4>Today's Activities</h4>
            </div>
            <div class="exercise-intervals-list">
        `;

        sortedExercises.forEach((ex) => {
            const activityInfo = ex.activity_id ? getActivityById(ex.activity_id) : null;
            const icon = activityInfo ? activityInfo.icon : '🏃';
            const displayTime = ex.time || 'Unknown time';

            html += `
                <div class="exercise-interval" data-id="${ex.id}">
                    <div class="interval-icon">${icon}</div>
                    <div class="interval-details">
                        <div class="interval-name">${ex.activity || 'Activity'}</div>
                        <div class="interval-meta">
                            <span>${ex.minutes} min</span>
                            <span>${ex.calories || 0} cal</span>
                            <span class="interval-points">+${ex.points || 0} pts</span>
                        </div>
                    </div>
                    <div class="interval-time">${displayTime}</div>
                    <button class="interval-delete-btn" onclick="ActivityModule.deleteExerciseEntry('${ex.id}')" title="Delete">×</button>
                </div>
            `;
        });

        html += '</div>';

        html += `
            <div class="exercise-totals-summary">
                <div class="totals-grid">
                    <div class="total-item">
                        <span class="total-label">Sessions</span>
                        <span class="total-value">${totals.activity_count}</span>
                    </div>
                    <div class="total-item">
                        <span class="total-label">Duration</span>
                        <span class="total-value">${totals.total_duration} min</span>
                    </div>
                    <div class="total-item">
                        <span class="total-label">Calories</span>
                        <span class="total-value">${totals.total_calories} cal</span>
                    </div>
                    <div class="total-item highlight">
                        <span class="total-label">Points</span>
                        <span class="total-value">+${totals.total_points} pts</span>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function updateUndoButton(exercises) {
        const undoBtn = document.getElementById('undoExerciseBtn');
        if (!undoBtn) return;

        if (exercises && exercises.length > 0) {
            const lastEx = exercises[exercises.length - 1];
            const activityInfo = lastEx.activity_id ? getActivityById(lastEx.activity_id) : null;
            const name = activityInfo ? activityInfo.name : (lastEx.activity || 'last activity');

            undoBtn.disabled = false;
            undoBtn.innerHTML = `↩️ Undo ${name}`;
            undoBtn.classList.remove('disabled');
        } else {
            undoBtn.disabled = true;
            undoBtn.innerHTML = '↩️ No activities to undo';
            undoBtn.classList.add('disabled');
        }
    }

    async function undoLastExercise() {
        const userId = safeGetCurrentUserId();
        const today = safeGetTodayKey();
        const exercises = await getExerciseByDate(userId, today);

        if (!exercises || exercises.length === 0) {
            alert('No activities to undo');
            return;
        }

        const sorted = [...exercises].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const lastExercise = sorted[0];

        if (confirm(`Undo ${lastExercise.activity}? (${lastExercise.minutes} min, +${lastExercise.points} pts)`)) {
            if (typeof dbDelete === 'function') {
                await dbDelete('exercise', lastExercise.id);
            }

            const stackIndex = exerciseUndoStack.findIndex(e => e.id === lastExercise.id);
            if (stackIndex !== -1) {
                exerciseUndoStack.splice(stackIndex, 1);
            }

            if (typeof updateAllUI === 'function') {
                await updateAllUI();
            }
            await updateExerciseUI();

            console.log(`↩️ Undone: ${lastExercise.activity}`);
        }
    }

    async function deleteExerciseEntry(exerciseId) {
        const userId = safeGetCurrentUserId();
        const today = safeGetTodayKey();
        const exercises = await getExerciseByDate(userId, today);

        const exercise = exercises.find(e => e.id === exerciseId);
        if (!exercise) {
            console.warn('Exercise not found:', exerciseId);
            return;
        }

        if (confirm(`Delete ${exercise.activity}? (${exercise.minutes} min, +${exercise.points} pts)`)) {
            if (typeof dbDelete === 'function') {
                await dbDelete('exercise', exerciseId);
            }

            if (typeof updateAllUI === 'function') {
                await updateAllUI();
            }
            await updateExerciseUI();

            console.log(`🗑️ Deleted: ${exercise.activity}`);
        }
    }

    function updateExercisePointsDisplay(totals) {
        const elem = document.getElementById('exercisePoints');
        if (elem) {
            elem.innerHTML = `
                <div class="points-earned-display">
                    <span class="points-label">Points Earned Today:</span>
                    <span class="points-value">${totals.total_points} pts</span>
                </div>
            `;
        }
    }

    async function resetExercise(activityName) {
        if (confirm(`Reset all ${activityName} entries for today?`)) {
            const today = safeGetTodayKey();
            await deleteExerciseByActivity(today, activityName);
            if (typeof updateAllUI === 'function') {
                await updateAllUI();
            }
            await updateExerciseUI();
        }
    }

    // ============ ACTIVITY BROWSER MODAL ============

    function openActivityBrowser() {
        activityBrowserCategory = 'all';
        renderActivityBrowserModal();
    }

    function closeActivityBrowser() {
        const modal = document.getElementById('activityBrowserModal');
        if (modal) {
            modal.remove();
        }
    }

    function renderActivityBrowserModal() {
        closeActivityBrowser();

        const userActivityIds = getUserActivities();
        const allActivities = getAllActivities(activityBrowserCategory === 'all' ? null : activityBrowserCategory);
        const packKey = getUserActivityPackKey();
        const packInfo = ACTIVITY_PACKS[packKey];

        const inList = allActivities.filter(a => userActivityIds.includes(a.id));
        const notInList = allActivities.filter(a => !userActivityIds.includes(a.id));

        const modal = document.createElement('div');
        modal.id = 'activityBrowserModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content activity-browser-modal">
                <div class="modal-header">
                    <h3>Manage Activities</h3>
                    <button class="modal-close-btn" onclick="ActivityModule.closeActivityBrowser()">×</button>
                </div>

                <div class="activity-browser-info">
                    <p>Your pack: <strong>${packInfo ? packInfo.name : 'Custom'}</strong></p>
                    <button class="btn btn-small btn-secondary" onclick="ActivityModule.confirmResetActivities()">Reset to Default</button>
                </div>

                <div class="activity-browser-categories">
                    <button class="cat-btn ${activityBrowserCategory === 'all' ? 'active' : ''}" onclick="ActivityModule.filterActivityBrowser('all')">All</button>
                    <button class="cat-btn ${activityBrowserCategory === 'cardio' ? 'active' : ''}" onclick="ActivityModule.filterActivityBrowser('cardio')">❤️ Cardio</button>
                    <button class="cat-btn ${activityBrowserCategory === 'strength' ? 'active' : ''}" onclick="ActivityModule.filterActivityBrowser('strength')">💪 Strength</button>
                    <button class="cat-btn ${activityBrowserCategory === 'sports' ? 'active' : ''}" onclick="ActivityModule.filterActivityBrowser('sports')">⚽ Sports</button>
                    <button class="cat-btn ${activityBrowserCategory === 'flexibility' ? 'active' : ''}" onclick="ActivityModule.filterActivityBrowser('flexibility')">🧘 Flex</button>
                    <button class="cat-btn ${activityBrowserCategory === 'recreation' ? 'active' : ''}" onclick="ActivityModule.filterActivityBrowser('recreation')">🌱 Other</button>
                </div>

                <div class="activity-browser-sections">
                    <div class="activity-section">
                        <h4>Your Activities (${inList.length})</h4>
                        <div class="activity-list">
                            ${inList.length === 0 ? '<p class="no-activities-msg">No activities in this category</p>' : ''}
                            ${inList.map(a => `
                                <div class="activity-item in-list">
                                    <span class="activity-icon">${a.icon}</span>
                                    <div class="activity-info">
                                        <span class="activity-name">${a.name}</span>
                                        <span class="activity-met">MET: ${a.met_value}</span>
                                    </div>
                                    <button class="remove-activity-btn" onclick="ActivityModule.removeActivityFromList('${a.id}')" title="Remove">−</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="activity-section">
                        <h4>Available to Add (${notInList.length})</h4>
                        <div class="activity-list">
                            ${notInList.length === 0 ? '<p class="no-activities-msg">All activities in this category added</p>' : ''}
                            ${notInList.map(a => `
                                <div class="activity-item not-in-list">
                                    <span class="activity-icon">${a.icon}</span>
                                    <div class="activity-info">
                                        <span class="activity-name">${a.name}</span>
                                        <span class="activity-met">MET: ${a.met_value}</span>
                                    </div>
                                    <button class="add-activity-btn" onclick="ActivityModule.addActivityToList('${a.id}')" title="Add">+</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="ActivityModule.closeActivityBrowser()">Done</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeActivityBrowser();
            }
        });
    }

    function filterActivityBrowser(category) {
        activityBrowserCategory = category;
        renderActivityBrowserModal();
    }

    async function addActivityToList(activityId) {
        await addActivityToUserList(activityId);
        renderActivityBrowserModal();
    }

    async function removeActivityFromList(activityId) {
        await removeActivityFromUserList(activityId);
        renderActivityBrowserModal();
    }

    async function confirmResetActivities() {
        const packKey = getUserActivityPackKey();
        const packInfo = ACTIVITY_PACKS[packKey];

        if (confirm(`Reset your activities to the "${packInfo ? packInfo.name : 'default'}" pack?\n\nThis will replace your current list with the default activities for your fitness level.`)) {
            await resetUserActivitiesToDefault();
            renderActivityBrowserModal();
        }
    }

    // ============ LEGACY COMPATIBILITY ============
    // These functions maintain backwards compatibility with app.js

    async function updateExerciseGrid() {
        await updateExerciseUI();
    }

    function setupExerciseGrid() {
        updateExerciseUI();
    }

    async function updateExercisePoints() {
        const userId = safeGetCurrentUserId();
        const today = safeGetTodayKey();
        const exercises = await getExerciseByDate(userId, today);
        const totals = calculateExerciseTotals(exercises);
        updateExercisePointsDisplay(totals);
    }

    // ============ PUBLIC API ============
    return {
        // Constants (read-only access)
        get ACTIVITY_LUT() { return ACTIVITY_LUT; },
        get ACTIVITY_CATEGORIES() { return ACTIVITY_CATEGORIES; },
        get ACTIVITY_PACKS() { return ACTIVITY_PACKS; },
        get EXERCISES() { return Object.values(ACTIVITY_LUT).map(a => a.name); },

        // LUT Functions
        getAllActivities,
        getActivityById,
        searchActivities,
        calculateCaloriesBurned,
        calculatePointsFromCalories,
        calculateActivityRewards,
        calculateExerciseTotals,

        // User Activity Management
        getUserActivityPackKey,
        getDefaultActivitiesForUser,
        getUserActivities,
        getUserActivityObjects,
        saveUserActivities,
        initializeUserActivities,
        addActivityToUserList,
        removeActivityFromUserList,
        resetUserActivitiesToDefault,
        getAvailableActivitiesToAdd,

        // Database Functions
        getExerciseByDate,
        addExercise,
        deleteExerciseByActivity,

        // UI Functions
        updateExerciseUI,
        renderActivitySelector,
        filterExerciseCategory,
        setExerciseDuration,
        updateExercisePreview,
        logExerciseFromForm,
        logExercise,
        renderExerciseIntervals,
        updateUndoButton,
        undoLastExercise,
        deleteExerciseEntry,
        updateExercisePointsDisplay,
        resetExercise,

        // Grid Activity Functions
        initializeActiveGridActivities,
        getActiveGridActivities,
        getCumulativeActivityTime,
        openActivitySelector,
        addToGrid,
        removeFromGrid,
        logActivityGridTime,
        resetActivityGridTime,

        // Activity Browser Modal
        openActivityBrowser,
        closeActivityBrowser,
        renderActivityBrowserModal,
        filterActivityBrowser,
        addActivityToList,
        removeActivityFromList,
        confirmResetActivities,

        // Legacy Compatibility
        updateExerciseGrid,
        setupExerciseGrid,
        updateExercisePoints
    };
})();

// Make module available globally
window.ActivityModule = ActivityModule;

// Legacy global function aliases for backwards compatibility
window.updateExerciseUI = ActivityModule.updateExerciseUI;
window.updateExerciseGrid = ActivityModule.updateExerciseGrid;
window.setupExerciseGrid = ActivityModule.setupExerciseGrid;
window.updateExercisePoints = ActivityModule.updateExercisePoints;
window.logExercise = ActivityModule.logExercise;
window.resetExercise = ActivityModule.resetExercise;
window.undoLastExercise = ActivityModule.undoLastExercise;
window.initializeUserActivities = ActivityModule.initializeUserActivities;
window.getExerciseByDate = ActivityModule.getExerciseByDate;
window.addExercise = ActivityModule.addExercise;
window.deleteExerciseByActivity = ActivityModule.deleteExerciseByActivity;
window.calculateExerciseTotals = ActivityModule.calculateExerciseTotals;
window.getActivityById = ActivityModule.getActivityById;
window.getAllActivities = ActivityModule.getAllActivities;
window.openActivityBrowser = ActivityModule.openActivityBrowser;
window.filterExerciseCategory = ActivityModule.filterExerciseCategory;
window.setExerciseDuration = ActivityModule.setExerciseDuration;
window.updateExercisePreview = ActivityModule.updateExercisePreview;
window.logExerciseFromForm = ActivityModule.logExerciseFromForm;
window.deleteExerciseEntry = ActivityModule.deleteExerciseEntry;

console.log('✅ Activity Module v1.0 loaded');
