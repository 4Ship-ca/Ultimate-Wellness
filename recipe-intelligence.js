// ============ RECIPE INTELLIGENCE SYSTEM ============
// Complete recipe management with AI-powered scoring and recommendations

// ============ RECIPE DATABASE SCHEMA ============

/**
 * Recipe structure with full intelligence tracking
 */
const RecipeSchema = {
    id: 'auto_increment',
    
    // Basic Info
    name: 'Grilled Chicken Power Bowl',
    source: 'bot_suggested', // 'bot_suggested'|'user_submitted'|'web_scraped'|'ww_official'
    url: 'https://...', // If web-scraped
    
    // Nutrition & Points
    totalPoints: 5,
    servings: 4,
    pointsPerServing: 1.25,
    calories: 350, // Per serving
    
    // Timing
    prepTime: 15, // minutes
    cookTime: 20, // minutes
    totalTime: 35, // Calculated
    
    // Ingredients (detailed)
    ingredients: [
        {
            name: 'chicken breast',
            quantity: 1,
            unit: 'lb',
            points: 0,
            isZeroPoint: true,
            isMajor: true, // >75% volume
            upc: null, // If from pantry
            preference: null // 0-10 if tracked
        },
        {
            name: 'broccoli',
            quantity: 2,
            unit: 'cups',
            points: 0,
            isZeroPoint: true,
            isMajor: true,
            preference: 8 // User loves broccoli
        },
        {
            name: 'brown rice',
            quantity: 2,
            unit: 'cups',
            points: 5,
            isZeroPoint: false,
            isMajor: false,
            preference: 7
        }
    ],
    
    // Instructions
    instructions: [
        'Preheat grill to medium-high heat',
        'Season chicken breast with salt, pepper, garlic powder',
        'Grill chicken 6-7 minutes per side until 165°F',
        'Steam broccoli for 5 minutes',
        'Cook brown rice according to package',
        'Assemble bowls with rice, chicken, broccoli'
    ],
    
    // User Feedback
    userRating: 5, // 1-5 stars (null if not rated)
    wouldMakeAgain: true, // null if not asked
    kidApproved: true,
    lastMade: '2026-01-05',
    timesMade: 3,
    dislikes: [], // What user didn't like
    modifications: 'Added extra garlic', // User notes
    
    // Recipe Classification
    majorIngredients: ['chicken breast', 'broccoli'], // >75% volume
    minorIngredients: ['brown rice', 'garlic powder'], // <25%
    zeroPointCount: 2, // How many zero-point ingredients
    zeroPointPercent: 66, // % of ingredients that are zero-point
    
    // Tags & Categories
    tags: ['high-protein', 'low-carb', 'meal-prep', 'weeknight'],
    mealType: 'dinner', // 'breakfast'|'lunch'|'dinner'|'snack'
    cuisine: 'american',
    difficulty: 'easy', // 'easy'|'medium'|'hard'
    
    // Intelligence Scoring (calculated)
    perfectScore: 87.5, // 0-100
    scoreBreakdown: {
        majorIngredientsInStock: 65, // Max 65pts
        userRating: 5, // Max 5pts
        dailyActivity: 3, // Max 5pts
        cookingTime: 3, // Max 5pts
        lastCooked: 4, // Max 5pts
        dayOfWeek: 7, // Max 10pts
        availablePoints: 4 // Max 5pts
    },
    
    // Metadata
    createdDate: '2026-01-01',
    createdBy: 'bot', // 'bot'|'user'
    verified: true,
    photoUrl: 'base64_image_data',
    
    // Web Scraping (if applicable)
    scrapedFrom: 'weightwatchers.com',
    scrapedDate: '2026-01-01',
    originalUrl: 'https://...'
};

// ============ RECIPE SCORING ALGORITHM ============

/**
 * Calculate perfect recipe score (0-100)
 * @param {Object} recipe - Recipe object
 * @param {Object} context - User context
 * @returns {Number} Score 0-100
 */
async function calculateRecipeScore(recipe, context = {}) {
    let score = 0;
    let breakdown = {};
    
    // Get context if not provided
    if (!context.pantry) {
        context.pantry = await BotDataAPI.queryPantry();
    }
    if (!context.dailyActivity) {
        const exercise = await BotDataAPI.queryExercise({ days: 1 });
        context.dailyActivity = exercise.reduce((sum, e) => sum + e.minutes, 0);
    }
    if (!context.availablePoints) {
        const stats = await BotDataAPI.getUserStats();
        context.availablePoints = stats.pointsRemaining;
    }
    
    // 1. MAJOR INGREDIENTS IN STOCK (ZERO-POINT) - 65%
    const majorInStock = recipe.majorIngredients.filter(ing => {
        const inPantry = context.pantry.some(p => 
            p.name.toLowerCase().includes(ing.toLowerCase())
        );
        const isZeroPoint = isZeroPointFood(ing);
        return inPantry && isZeroPoint;
    });
    const majorScore = (majorInStock.length / recipe.majorIngredients.length) * 65;
    breakdown.majorIngredientsInStock = Math.round(majorScore);
    score += majorScore;
    
    // 2. USER RATING - 5%
    if (recipe.userRating) {
        const ratingScore = (recipe.userRating / 5) * 5;
        breakdown.userRating = ratingScore;
        score += ratingScore;
    } else {
        breakdown.userRating = 0;
    }
    
    // 3. DAILY ACTIVITY - 5%
    // More activity = more points allowed = higher score for higher-point recipes
    let activityScore;
    if (context.dailyActivity >= 120) activityScore = 5;
    else if (context.dailyActivity >= 90) activityScore = 3;
    else if (context.dailyActivity >= 60) activityScore = 2;
    else if (context.dailyActivity >= 30) activityScore = 1;
    else activityScore = 0;
    breakdown.dailyActivity = activityScore;
    score += activityScore;
    
    // 4. TOTAL COOKING TIME - 5%
    // Shorter = better (weeknight friendly)
    const totalTime = recipe.totalTime || (recipe.prepTime + recipe.cookTime);
    let timeScore;
    if (totalTime <= 10) timeScore = 5;
    else if (totalTime <= 15) timeScore = 4;
    else if (totalTime <= 20) timeScore = 3;
    else if (totalTime <= 25) timeScore = 2;
    else if (totalTime <= 30) timeScore = 1;
    else timeScore = 0;
    breakdown.cookingTime = timeScore;
    score += timeScore;
    
    // 5. LAST COOKED - 5%
    // Longer ago = better (variety)
    if (recipe.lastMade) {
        const daysAgo = Math.floor((new Date() - new Date(recipe.lastMade)) / (1000 * 60 * 60 * 24));
        let recencyScore;
        if (daysAgo >= 14) recencyScore = 5;
        else if (daysAgo >= 10) recencyScore = 4;
        else if (daysAgo >= 7) recencyScore = 3;
        else if (daysAgo >= 3) recencyScore = 2;
        else if (daysAgo >= 1) recencyScore = 1;
        else recencyScore = 0;
        breakdown.lastCooked = recencyScore;
        score += recencyScore;
    } else {
        breakdown.lastCooked = 5; // Never made = full points
        score += 5;
    }
    
    // 6. DAY OF WEEK - 10%
    // Weekend = more servings = meal prep
    const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
    const servings = recipe.servings;
    let dayScore;
    
    if (dayOfWeek === 0) { // Sunday
        dayScore = 7 + Math.min(servings, 3);
    } else if (dayOfWeek === 6) { // Saturday
        dayScore = 6 + Math.min(servings, 3);
    } else if (dayOfWeek === 5) { // Friday
        dayScore = 5 + Math.min(servings, 2);
    } else if (dayOfWeek === 4) { // Thursday
        dayScore = 4 + Math.min(servings, 2);
    } else if (dayOfWeek === 3) { // Wednesday
        dayScore = 3 + Math.min(servings, 2);
    } else if (dayOfWeek === 2) { // Tuesday
        dayScore = 2 + Math.min(servings, 1);
    } else { // Monday
        dayScore = 1 + Math.min(servings, 1);
    }
    dayScore = Math.min(dayScore, 10); // Cap at 10
    breakdown.dayOfWeek = dayScore;
    score += dayScore;
    
    // 7. AVAILABLE POINTS - 5%
    // Lower points per serving = better when low on points
    const pps = recipe.pointsPerServing || (recipe.totalPoints / recipe.servings);
    let pointsScore;
    if (pps === 0) pointsScore = 5;
    else if (pps <= 1) pointsScore = 4;
    else if (pps <= 2) pointsScore = 3;
    else if (pps <= 3) pointsScore = 2;
    else if (pps <= 4) pointsScore = 1;
    else pointsScore = 0;
    breakdown.availablePoints = pointsScore;
    score += pointsScore;
    
    return {
        score: Math.round(score * 10) / 10, // Round to 1 decimal
        breakdown: breakdown,
        maxScore: 100
    };
}

// ============ RECIPE INTELLIGENCE FUNCTIONS ============

/**
 * Get recipe recommendations with intelligence scoring
 * @param {Object} options - Filters and context
 * @returns {Array} Sorted recipes by score
 */
async function getRecipeRecommendations(options = {}) {
    // Get all recipes
    let recipes = await dbGetAll('recipes') || [];
    
    // Filter by options
    if (options.mealType) {
        recipes = recipes.filter(r => r.mealType === options.mealType);
    }
    
    if (options.maxTime) {
        recipes = recipes.filter(r => (r.prepTime + r.cookTime) <= options.maxTime);
    }
    
    if (options.maxPoints) {
        recipes = recipes.filter(r => r.pointsPerServing <= options.maxPoints);
    }
    
    if (options.tags) {
        recipes = recipes.filter(r => 
            options.tags.some(tag => r.tags && r.tags.includes(tag))
        );
    }
    
    // Score all recipes
    const context = {
        pantry: await BotDataAPI.queryPantry(),
        dailyActivity: (await BotDataAPI.queryExercise({ days: 1 })).reduce((sum, e) => sum + e.minutes, 0),
        availablePoints: (await BotDataAPI.getUserStats()).pointsRemaining
    };
    
    const scoredRecipes = [];
    for (const recipe of recipes) {
        const scoring = await calculateRecipeScore(recipe, context);
        scoredRecipes.push({
            ...recipe,
            perfectScore: scoring.score,
            scoreBreakdown: scoring.breakdown
        });
    }
    
    // Sort by score (highest first)
    scoredRecipes.sort((a, b) => b.perfectScore - a.perfectScore);
    
    // Return top N
    const limit = options.limit || 10;
    return scoredRecipes.slice(0, limit);
}

/**
 * Learn ingredient preferences from recipe ratings
 * @param {Object} recipe - Recipe that was rated
 */
async function learnIngredientPreferences(recipe) {
    if (!recipe.userRating || recipe.userRating < 4) return;
    
    // High rating (4+) = learn preferences
    const upcPrefs = await dbGetAll('upc_preferences') || [];
    
    for (const ingredient of recipe.ingredients) {
        if (!ingredient.upc) continue;
        
        // Calculate preference value
        // Recipe rating * 2 = preference (5 stars = 10/10)
        const prefValue = recipe.userRating * 2;
        
        // Find or create UPC preference
        let upcPref = upcPrefs.find(p => p.upc === ingredient.upc);
        
        if (upcPref) {
            // Average with existing preference
            upcPref.preference = Math.round((upcPref.preference + prefValue) / 2);
            upcPref.recipeCount = (upcPref.recipeCount || 1) + 1;
        } else {
            upcPref = {
                id: ingredient.upc,
                upc: ingredient.upc,
                name: ingredient.name,
                preference: prefValue,
                recipeCount: 1,
                learned_date: new Date().toISOString()
            };
        }
        
        await dbPut('upc_preferences', upcPref);
    }
    
    console.log(`✅ Learned preferences from ${recipe.name} (rating: ${recipe.userRating})`);
}

/**
 * Add ingredients to dislike list
 * @param {Array} ingredients - Ingredients user didn't like
 */
async function addToDislikeList(ingredients) {
    const dislikes = JSON.parse(localStorage.getItem('dislikeList') || '[]');
    
    for (const ingredient of ingredients) {
        if (!dislikes.includes(ingredient.toLowerCase())) {
            dislikes.push(ingredient.toLowerCase());
        }
    }
    
    localStorage.setItem('dislikeList', JSON.stringify(dislikes));
    console.log(`✅ Added to dislike list:`, ingredients);
}

/**
 * Get ingredient suggestions for recipes (7.5+ preference)
 * @returns {Array} High-preference ingredients
 */
async function getPreferredIngredients() {
    const upcPrefs = await dbGetAll('upc_preferences') || [];
    
    // Filter to 7.5+ preference (recipe rating 4+ * 2 = 8+)
    // Using 7.5 as threshold to catch 4-star recipes
    return upcPrefs
        .filter(p => p.preference >= 7.5)
        .sort((a, b) => b.preference - a.preference);
}

/**
 * Classify ingredients as major (>75% volume) or minor (<25%)
 * @param {Array} ingredients - Recipe ingredients
 * @returns {Object} {major: [], minor: []}
 */
function classifyIngredients(ingredients) {
    // Simple heuristic: first 2-3 ingredients are major, rest are minor
    // In reality, would need volume/weight data
    
    const major = ingredients.slice(0, Math.ceil(ingredients.length * 0.75));
    const minor = ingredients.slice(Math.ceil(ingredients.length * 0.75));
    
    return {
        major: major.map(i => i.name),
        minor: minor.map(i => i.name)
    };
}

// ============ BOT RECIPE INTERACTION ============

/**
 * Bot asks follow-up questions after meal logging
 * @param {String} mealDescription - What user logged
 * @returns {String} Bot question
 */
async function askRecipeFollowUp(mealDescription) {
    // Check if meal sounds like a recipe
    const recipes = await dbGetAll('recipes') || [];
    const possibleRecipe = recipes.find(r => 
        mealDescription.toLowerCase().includes(r.name.toLowerCase())
    );
    
    if (possibleRecipe) {
        // User mentioned a known recipe
        if (!possibleRecipe.userRating) {
            return `Did you make the ${possibleRecipe.name} recipe? If so, how would you rate it out of 5 stars? ⭐⭐⭐⭐⭐`;
        } else if (!possibleRecipe.wouldMakeAgain) {
            return `Would you make ${possibleRecipe.name} again?`;
        }
    } else {
        // Unknown meal - might be a new recipe
        return `That sounds delicious! Did you follow a recipe? If so, I can save it for you.`;
    }
    
    return null;
}

/**
 * Process recipe rating
 * @param {Number} recipeId - Recipe ID
 * @param {Number} rating - 1-5 stars
 */
async function rateRecipe(recipeId, rating) {
    const recipe = await dbGet('recipes', recipeId);
    if (!recipe) return;
    
    recipe.userRating = rating;
    recipe.timesMade = (recipe.timesMade || 0) + 1;
    
    await dbPut('recipes', recipe);
    
    // Learn preferences if 4+
    if (rating >= 4) {
        await learnIngredientPreferences(recipe);
    }
    
    console.log(`✅ Recipe rated: ${recipe.name} - ${rating} stars`);
    
    return recipe;
}

/**
 * Handle "would make again" response
 * @param {Number} recipeId - Recipe ID
 * @param {Boolean} wouldMakeAgain - Yes/No
 * @param {String} reason - Why not (if no)
 */
async function recordWouldMakeAgain(recipeId, wouldMakeAgain, reason = null) {
    const recipe = await dbGet('recipes', recipeId);
    if (!recipe) return;
    
    recipe.wouldMakeAgain = wouldMakeAgain;
    
    if (!wouldMakeAgain && reason) {
        recipe.dislikes = recipe.dislikes || [];
        recipe.dislikes.push(reason);
        
        // Add to global dislike list
        await addToDislikeList([reason]);
    }
    
    await dbPut('recipes', recipe);
    
    console.log(`✅ Recipe feedback: ${recipe.name} - Would make again: ${wouldMakeAgain}`);
    
    return recipe;
}

// ============ EXPORT ============
window.RecipeIntelligence = {
    calculateRecipeScore,
    getRecipeRecommendations,
    learnIngredientPreferences,
    addToDislikeList,
    getPreferredIngredients,
    classifyIngredients,
    askRecipeFollowUp,
    rateRecipe,
    recordWouldMakeAgain
};

console.log('🍳 Recipe Intelligence System loaded');
