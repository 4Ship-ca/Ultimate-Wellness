// ============ COMPREHENSIVE BOT DATA API ============
// Full access to ALL user tracking data for AI bot interactions
// Sleep, Tasks, Weight, Water, Meds, Foods, Exercise, Pantry, Photos, Settings

const BotDataAPI = {
    // ============ USER STATS & SUMMARY ============
    
    /**
     * Get comprehensive user stats for today
     */
    async getUserStats() {
        const today = getTodayKey();
        const foods = await getFoodsByDate(today);
        const exercise = await getExerciseByDate(today);
        const water = await getWaterByDate(today);
        const tasks = await getTasksByDate(today);
        
        return {
            // Points
            pointsUsed: foods.reduce((sum, f) => sum + f.points, 0),
            pointsEarned: exercise.reduce((sum, e) => sum + e.points, 0),
            pointsRemaining: userSettings.dailyPoints - foods.reduce((sum, f) => sum + f.points, 0) + exercise.reduce((sum, e) => sum + e.points, 0),
            dailyAllowance: userSettings.dailyPoints,
            bonusPoints: await getBonusPoints(),
            
            // Water
            waterMl: (water.drops || 0) * 250 + (water.foodWater || 0),
            waterGoal: 2000,
            waterPercent: Math.round((((water.drops || 0) * 250 + (water.foodWater || 0)) / 2000) * 100),
            
            // Weight & Goals
            currentWeight: userSettings.currentWeight,
            goalWeight: userSettings.goalWeight,
            weightToGo: userSettings.currentWeight - userSettings.goalWeight,
            
            // Activity counts
            mealsToday: foods.length,
            exerciseToday: exercise.length,
            tasksActive: tasks.filter(t => t.status === 'active').length,
            tasksComplete: tasks.filter(t => t.status === 'complete').length,
            
            // Date
            date: today
        };
    },
    
    /**
     * Get weekly summary
     */
    async getWeeklySummary() {
        const last7Days = getLast7Days();
        const allFoods = await dbGetAll('foods') || [];
        const allExercise = await dbGetAll('exercise') || [];
        const allWeight = await dbGetAll('weight_logs') || [];
        
        const weekFoods = allFoods.filter(f => last7Days.includes(f.date));
        const weekExercise = allExercise.filter(e => last7Days.includes(e.date));
        const weekWeight = allWeight.filter(w => last7Days.includes(w.date)).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return {
            totalPoints: weekFoods.reduce((sum, f) => sum + f.points, 0),
            totalExercise: weekExercise.reduce((sum, e) => sum + e.minutes, 0),
            exercisePoints: weekExercise.reduce((sum, e) => sum + e.points, 0),
            avgPointsPerDay: weekFoods.reduce((sum, f) => sum + f.points, 0) / 7,
            weightChange: weekWeight.length > 1 ? (weekWeight[weekWeight.length - 1].weight - weekWeight[0].weight) : 0,
            daysTracked: last7Days.filter(d => weekFoods.some(f => f.date === d)).length
        };
    },
    
    // ============ SLEEP DATA ============
    
    /**
     * Get sleep logs
     * @param {Object} options - {days: 7, date: 'YYYY-MM-DD'}
     */
    async querySleep(options = {}) {
        const allSleep = await dbGetAll('sleep') || [];
        
        if (options.date) {
            return allSleep.find(s => s.date === options.date);
        }
        
        if (options.days) {
            return allSleep.slice(-options.days);
        }
        
        return allSleep;
    },
    
    /**
     * Get last night's sleep
     */
    async getLastSleep() {
        const allSleep = await dbGetAll('sleep') || [];
        if (allSleep.length === 0) return null;
        
        return allSleep.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    },
    
    /**
     * Get sleep quality summary
     */
    async getSleepSummary(days = 7) {
        const allSleep = await dbGetAll('sleep') || [];
        const recent = allSleep.slice(-days);
        
        const qualities = recent.filter(s => s.quality).map(s => s.quality);
        const goodNights = qualities.filter(q => q === 'zonked' || q === 'good').length;
        const avgHours = recent.reduce((sum, s) => sum + (s.hoursSlept || 0), 0) / recent.length;
        
        return {
            totalNights: recent.length,
            goodNights: goodNights,
            poorNights: qualities.filter(q => q === 'restless' || q === 'poor').length,
            avgHours: avgHours.toFixed(1),
            qualityPercent: Math.round((goodNights / qualities.length) * 100) || 0
        };
    },
    
    // ============ TASKS ============
    
    /**
     * Get tasks
     * @param {Object} filter - {type: 'want'|'need'|'grateful', status: 'active'|'complete'}
     */
    async queryTasks(filter = {}) {
        const today = getTodayKey();
        const allTasks = await getTasksByDate(today);
        
        let filtered = allTasks;
        
        if (filter.type) {
            filtered = filtered.filter(t => t.type === filter.type);
        }
        
        if (filter.status) {
            filtered = filtered.filter(t => t.status === filter.status);
        }
        
        return filtered;
    },
    
    /**
     * Get task counts
     */
    async getTaskCounts() {
        const today = getTodayKey();
        const tasks = await getTasksByDate(today);
        
        return {
            want: tasks.filter(t => t.type === 'want').length,
            need: tasks.filter(t => t.type === 'need').length,
            grateful: tasks.filter(t => t.type === 'grateful').length,
            active: tasks.filter(t => t.status === 'active').length,
            complete: tasks.filter(t => t.status === 'complete').length
        };
    },
    
    // ============ WEIGHT HISTORY ============
    
    /**
     * Get weight logs
     * @param {Object} options - {days: 30, startDate, endDate}
     */
    async queryWeight(options = {}) {
        const allWeight = await dbGetAll('weight_logs') || [];
        let filtered = allWeight.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (options.days) {
            filtered = filtered.slice(0, options.days);
        }
        
        if (options.startDate) {
            filtered = filtered.filter(w => w.date >= options.startDate);
        }
        
        if (options.endDate) {
            filtered = filtered.filter(w => w.date <= options.endDate);
        }
        
        return filtered;
    },
    
    /**
     * Get latest weight
     */
    async getLatestWeight() {
        const allWeight = await dbGetAll('weight_logs') || [];
        if (allWeight.length === 0) return null;
        
        return allWeight.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    },
    
    /**
     * Get weight progress
     */
    async getWeightProgress() {
        const allWeight = await dbGetAll('weight_logs') || [];
        if (allWeight.length === 0) return null;
        
        const sorted = allWeight.sort((a, b) => new Date(a.date) - new Date(b.date));
        const first = sorted[0];
        const latest = sorted[sorted.length - 1];
        
        return {
            startWeight: first.weight,
            currentWeight: latest.weight,
            totalLoss: first.weight - latest.weight,
            goalWeight: userSettings.goalWeight,
            toGo: latest.weight - userSettings.goalWeight,
            percentToGoal: ((first.weight - latest.weight) / (first.weight - userSettings.goalWeight)) * 100
        };
    },
    
    // ============ WATER INTAKE ============
    
    /**
     * Get water logs
     * @param {Object} options - {days: 7, date: 'YYYY-MM-DD'}
     */
    async queryWater(options = {}) {
        const allWater = await dbGetAll('water') || [];
        
        if (options.date) {
            return allWater.find(w => w.date === options.date);
        }
        
        if (options.days) {
            const last = getLast7Days().slice(0, options.days);
            return allWater.filter(w => last.includes(w.date));
        }
        
        return allWater;
    },
    
    /**
     * Get today's water
     */
    async getTodayWater() {
        const today = getTodayKey();
        return await getWaterByDate(today);
    },
    
    /**
     * Get water summary
     */
    async getWaterSummary(days = 7) {
        const allWater = await dbGetAll('water') || [];
        const recent = allWater.slice(-days);
        
        const totalMl = recent.reduce((sum, w) => sum + ((w.drops || 0) * 250) + (w.foodWater || 0), 0);
        const avgMl = totalMl / days;
        const daysAtGoal = recent.filter(w => ((w.drops || 0) * 250) + (w.foodWater || 0) >= 2000).length;
        
        return {
            avgDaily: Math.round(avgMl),
            daysAtGoal: daysAtGoal,
            goalPercent: Math.round((daysAtGoal / days) * 100),
            totalWeek: totalMl
        };
    },
    
    // ============ MEDICATIONS ============
    
    /**
     * Get medications
     */
    async queryMedications() {
        return await dbGetAll('medications') || [];
    },
    
    /**
     * Get today's medication schedule
     */
    async getTodayMeds() {
        const meds = await dbGetAll('medications') || [];
        const today = getTodayKey();
        
        return meds.map(med => ({
            name: med.name,
            dosage: med.dosage,
            times: med.times,
            taken: med.takenDates && med.takenDates.includes(today)
        }));
    },
    
    // ============ FOOD LOGS ============
    
    /**
     * Get food logs
     * @param {Object} options - {days: 7, date, startDate, endDate}
     */
    async queryFoodLogs(options = {}) {
        const allFoods = await dbGetAll('foods') || [];
        
        if (options.date) {
            return allFoods.filter(f => f.date === options.date);
        }
        
        if (options.days) {
            const last = getLast7Days().slice(0, options.days);
            return allFoods.filter(f => last.includes(f.date));
        }
        
        if (options.startDate || options.endDate) {
            let filtered = allFoods;
            if (options.startDate) filtered = filtered.filter(f => f.date >= options.startDate);
            if (options.endDate) filtered = filtered.filter(f => f.date <= options.endDate);
            return filtered;
        }
        
        return allFoods;
    },
    
    /**
     * Get today's meals
     */
    async getTodayFoods() {
        const today = getTodayKey();
        return await getFoodsByDate(today);
    },
    
    /**
     * Analyze food patterns
     */
    async analyzeFoodPatterns(days = 30) {
        const allFoods = await dbGetAll('foods') || [];
        const recent = allFoods.filter(f => {
            const daysAgo = Math.floor((new Date() - new Date(f.date)) / (1000 * 60 * 60 * 24));
            return daysAgo <= days;
        });
        
        const totalPoints = recent.reduce((sum, f) => sum + f.points, 0);
        const zeroPointMeals = recent.filter(f => f.points === 0 || (typeof isZeroPointFood !== 'undefined' && isZeroPointFood(f.name))).length;
        const avgDaily = totalPoints / days;
        const mealsPerDay = recent.length / days;
        
        return {
            totalMeals: recent.length,
            avgMealsPerDay: mealsPerDay.toFixed(1),
            avgPointsPerDay: avgDaily.toFixed(1),
            zeroPointMeals: zeroPointMeals,
            zeroPointPercent: Math.round((zeroPointMeals / recent.length) * 100)
        };
    },
    
    // ============ EXERCISE LOGS ============
    
    /**
     * Get exercise logs
     * @param {Object} options - {days: 7, type, date}
     */
    async queryExercise(options = {}) {
        const allExercise = await dbGetAll('exercise') || [];
        
        if (options.date) {
            return allExercise.filter(e => e.date === options.date);
        }
        
        if (options.type) {
            return allExercise.filter(e => e.type === options.type);
        }
        
        if (options.days) {
            const last = getLast7Days().slice(0, options.days);
            return allExercise.filter(e => last.includes(e.date));
        }
        
        return allExercise;
    },
    
    /**
     * Get exercise summary
     */
    async getExerciseSummary(days = 7) {
        const allExercise = await dbGetAll('exercise') || [];
        const recent = allExercise.filter(e => {
            const daysAgo = Math.floor((new Date() - new Date(e.date)) / (1000 * 60 * 60 * 24));
            return daysAgo <= days;
        });
        
        const totalMinutes = recent.reduce((sum, e) => sum + e.minutes, 0);
        const totalPoints = recent.reduce((sum, e) => sum + e.points, 0);
        const types = {};
        recent.forEach(e => {
            types[e.type] = (types[e.type] || 0) + 1;
        });
        const mostCommon = Object.entries(types).sort((a, b) => b[1] - a[1])[0];
        
        return {
            totalWorkouts: recent.length,
            totalMinutes: totalMinutes,
            totalPoints: totalPoints,
            avgMinutesPerDay: (totalMinutes / days).toFixed(0),
            mostCommonType: mostCommon ? mostCommon[0] : null,
            daysActive: [...new Set(recent.map(e => e.date))].length
        };
    },
    
    // ============ PANTRY ============
    
    /**
     * Query pantry items
     * @param {Object} filter - {name: string, category: string}
     */
    async queryPantry(filter = {}) {
        let items = await dbGetAll('pantry_items') || [];
        
        if (filter.name) {
            const search = filter.name.toLowerCase();
            items = items.filter(item => 
                item.name.toLowerCase().includes(search)
            );
        }
        
        if (filter.category) {
            items = items.filter(item => item.category === filter.category);
        }
        
        // Exclude zero quantity (out of stock)
        items = items.filter(item => (item.quantity || 0) > 0);
        
        return items.map(item => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            points: item.points_per_serving,
            servingSize: item.serving_size,
            upc: item.upc,
            isZeroPoint: item.is_zero_point || (typeof isZeroPointFood !== 'undefined' && isZeroPointFood(item.name))
        }));
    },
    
    /**
     * Check if item exists in pantry
     */
    async hasPantryItem(itemName) {
        const items = await this.queryPantry({ name: itemName });
        return items.length > 0 ? items[0] : null;
    },
    
    // ============ PHOTOS ============
    
    /**
     * Get photos
     * @param {Object} filter - {type: 'food'|'progress'|'receipt', date}
     */
    async queryPhotos(filter = {}) {
        let photos = await dbGetAll('photos') || [];
        
        if (filter.type) {
            photos = photos.filter(p => p.type === filter.type);
        }
        
        if (filter.date) {
            photos = photos.filter(p => p.date === filter.date);
        }
        
        return photos;
    },
    
    // ============ ZERO-POINT FOODS ============
    
    /**
     * Get zero-point foods by category
     */
    queryZeroPointFoods(category = null) {
        const zpf = typeof ZERO_POINT_FOODS !== 'undefined' ? ZERO_POINT_FOODS : 
            JSON.parse(localStorage.getItem('zeroPointFoods') || '{}');
        
        if (category && zpf[category]) {
            return zpf[category];
        }
        
        return Object.entries(zpf).map(([cat, foods]) => ({
            category: cat,
            foods: foods
        }));
    },
    
    /**
     * Check if food is zero-point
     */
    isZeroPoint(foodName) {
        if (typeof isZeroPointFood !== 'undefined') {
            return isZeroPointFood(foodName);
        }
        
        const zpf = JSON.parse(localStorage.getItem('zeroPointFoods') || '{}');
        const allFoods = Object.values(zpf).flat();
        const normalized = foodName.toLowerCase();
        
        return allFoods.some(f => normalized.includes(f.toLowerCase()));
    },
    
    // ============ UPC DATABASE ============
    
    /**
     * Lookup product by UPC
     */
    async queryUPC(upc) {
        const db = await dbGetAll('upc_database') || [];
        return db.find(item => item.upc === upc);
    },
    
    // ============ SETTINGS ============
    
    /**
     * Get user settings
     */
    async getSettings() {
        return await getSettings();
    },
    
    // ============ MUTATION METHODS ============
    
    /**
     * Log food item
     */
    async logFood(food) {
        const today = getTodayKey();
        
        const entry = {
            date: today,
            name: food.name,
            points: food.points,
            time: food.time || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
        
        await addFood(entry);
        return entry;
    },
    
    /**
     * Log exercise
     */
    async logExercise(exercise) {
        const today = getTodayKey();
        const points = Math.floor(exercise.minutes / 15);
        
        const entry = {
            date: today,
            type: exercise.type,
            minutes: exercise.minutes,
            points: points,
            time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        };
        
        await addExercise(entry);
        return entry;
    },
    
    /**
     * Add water
     */
    async addWater(drops = 1) {
        const today = getTodayKey();
        const water = await getWaterByDate(today);
        
        water.drops = (water.drops || 0) + drops;
        
        await dbPut('water', { date: today, ...water });
        return water;
    },
    
    /**
     * Update pantry quantity
     */
    async updatePantryQuantity(itemName, quantity) {
        const items = await dbGetAll('pantry_items') || [];
        const item = items.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        
        if (!item) {
            throw new Error(`Item "${itemName}" not found in pantry`);
        }
        
        item.quantity = Math.max(0, (item.quantity || 0) - quantity);
        
        await dbPut('pantry_items', item);
        
        return {
            item: item.name,
            newQuantity: item.quantity,
            unit: item.unit
        };
    },
    
    /**
     * Add to pantry
     */
    async addToPantry(item) {
        const existing = await dbGetAll('pantry_items') || [];
        let found = existing.find(i => 
            i.name.toLowerCase() === item.name.toLowerCase() ||
            (item.upc && i.upc === item.upc)
        );
        
        if (found) {
            found.quantity = (found.quantity || 0) + (item.quantity || 1);
            await dbPut('pantry_items', found);
            return found;
        }
        
        const newItem = {
            id: Date.now(),
            name: item.name,
            quantity: item.quantity || 1,
            unit: item.unit || 'item',
            points_per_serving: item.points || 0,
            serving_size: item.servingSize || '1 serving',
            upc: item.upc || null,
            is_zero_point: this.isZeroPoint(item.name),
            category: item.category || 'Pantry',
            added_date: new Date().toISOString()
        };
        
        await dbPut('pantry_items', newItem);
        return newItem;
    },
    
    /**
     * Add UPC to database
     */
    async addUPC(product) {
        const entry = {
            upc: product.upc,
            product_name: product.name,
            brand: product.brand || 'Unknown',
            points_per_serving: product.points,
            serving_size: product.servingSize || '1 serving',
            is_zero_point: this.isZeroPoint(product.name),
            added_date: new Date().toISOString(),
            verified: false
        };
        
        await dbPut('upc_database', entry);
        return entry;
    }
};

// ============ HELPER FUNCTIONS ============

function getLast7Days() {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split('T')[0]);
    }
    return days;
}

function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

// ============ EXPORT ============
window.BotDataAPI = BotDataAPI;

console.log('🤖 Comprehensive Bot Data API loaded - Full access to ALL user data');
