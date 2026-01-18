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
// Constants: Recipe scoring weights
const RECIPE_SCORE_WEIGHTS = {
    MAJOR_INGREDIENTS: 65,
    USER_RATING: 5,
    DAILY_ACTIVITY: 5,
    COOKING_TIME: 5,
    LAST_COOKED: 5,
    DAY_OF_WEEK: 10,
    AVAILABLE_POINTS: 5
};

// Helper: Score value against descending thresholds (higher value = higher score)
function scoreByThresholds(value, thresholds, maxScore) {
    for (let i = 0; i < thresholds.length; i++) {
        if (value >= thresholds[i]) {
            return maxScore - i;
        }
    }
    return 0;
}

// Helper: Score major ingredients in stock
function scoreMajorIngredients(recipe, pantry) {
    const majorInStock = recipe.majorIngredients.filter(ing => {
        const inPantry = pantry.some(p => p.name.toLowerCase().includes(ing.toLowerCase()));
        const isZeroPoint = isZeroPointFood(ing);
        return inPantry && isZeroPoint;
    });

    const percentage = majorInStock.length / recipe.majorIngredients.length;
    return Math.round(percentage * RECIPE_SCORE_WEIGHTS.MAJOR_INGREDIENTS);
}

// Helper: Score user rating
function scoreUserRating(recipe) {
    if (!recipe.userRating) return 0;
    return (recipe.userRating / 5) * RECIPE_SCORE_WEIGHTS.USER_RATING;
}

// Helper: Score daily activity
function scoreDailyActivity(activityMinutes) {
    return scoreByThresholds(activityMinutes, [120, 90, 60, 30], RECIPE_SCORE_WEIGHTS.DAILY_ACTIVITY);
}

// Helper: Score cooking time
function scoreCookingTime(recipe) {
    const totalTime = recipe.totalTime || (recipe.prepTime + recipe.cookTime);
    return scoreByThresholds(totalTime, [10, 15, 20, 25, 30].reverse(), RECIPE_SCORE_WEIGHTS.COOKING_TIME);
}

// Helper: Score recipe recency
function scoreLastCooked(recipe) {
    if (!recipe.lastMade) {
        return RECIPE_SCORE_WEIGHTS.LAST_COOKED; // Never made = full points
    }

    const daysAgo = Math.floor((new Date() - new Date(recipe.lastMade)) / (1000 * 60 * 60 * 24));
    return scoreByThresholds(daysAgo, [14, 10, 7, 3, 1], RECIPE_SCORE_WEIGHTS.LAST_COOKED);
}

// Helper: Score day of week
function scoreDayOfWeek(recipe) {
    const dayOfWeek = new Date().getDay(); // 0=Sun, 6=Sat
    const servings = recipe.servings;

    // Day base scores with serving bonuses
    const dayConfig = [
        { base: 7, servingCap: 3 }, // Sunday
        { base: 1, servingCap: 1 }, // Monday
        { base: 2, servingCap: 1 }, // Tuesday
        { base: 3, servingCap: 2 }, // Wednesday
        { base: 4, servingCap: 2 }, // Thursday
        { base: 5, servingCap: 2 }, // Friday
        { base: 6, servingCap: 3 }  // Saturday
    ];

    const config = dayConfig[dayOfWeek];
    const dayScore = config.base + Math.min(servings, config.servingCap);

    return Math.min(dayScore, RECIPE_SCORE_WEIGHTS.DAY_OF_WEEK);
}

// Helper: Score points per serving
function scorePointsPerServing(recipe) {
    const pps = recipe.pointsPerServing || (recipe.totalPoints / recipe.servings);
    return scoreByThresholds(pps, [0, 1, 2, 3, 4].reverse(), RECIPE_SCORE_WEIGHTS.AVAILABLE_POINTS);
}

// Helper: Ensure context data is loaded
async function ensureRecipeContext(context) {
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
}

async function calculateRecipeScore(recipe, context = {}) {
    // Ensure context data is available
    await ensureRecipeContext(context);

    // Calculate each scoring component
    const breakdown = {
        majorIngredientsInStock: scoreMajorIngredients(recipe, context.pantry),
        userRating: scoreUserRating(recipe),
        dailyActivity: scoreDailyActivity(context.dailyActivity),
        cookingTime: scoreCookingTime(recipe),
        lastCooked: scoreLastCooked(recipe),
        dayOfWeek: scoreDayOfWeek(recipe),
        availablePoints: scorePointsPerServing(recipe)
    };

    // Sum all scores
    const totalScore = Object.values(breakdown).reduce((sum, score) => sum + score, 0);

    return {
        score: Math.round(totalScore * 10) / 10, // Round to 1 decimal
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
