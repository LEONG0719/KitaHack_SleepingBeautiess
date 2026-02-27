import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserPreferences, Meal, MealPlan, GroceryItem } from './types';

// ============================================================
// LAYER 1: RULE ENGINE (Programmatic Guardrails)
// ============================================================

interface NutritionConstraints {
    dailyCaloriesMin: number;
    dailyCaloriesMax: number;
    minProteinPerMeal: number;
    minFiberPerMeal: number;
    maxBudgetPerMeal: number;
    dietaryRules: string[];
}

export function buildConstraints(preferences: UserPreferences): NutritionConstraints {
    // Age-appropriate calorie ranges
    let dailyCaloriesMin: number;
    let dailyCaloriesMax: number;

    if (preferences.ageGroup === 'teen') {
        dailyCaloriesMin = 1600;
        dailyCaloriesMax = 2200;
    } else {
        dailyCaloriesMin = 1800;
        dailyCaloriesMax = 2500;
    }

    // Adjust based on activity level
    const activityMultiplier: Record<string, number> = {
        sedentary: 0.9,
        light: 1.0,
        moderate: 1.1,
        active: 1.2,
    };
    const multiplier = activityMultiplier[preferences.activityLevel] || 1.0;
    dailyCaloriesMin = Math.round(dailyCaloriesMin * multiplier);
    dailyCaloriesMax = Math.round(dailyCaloriesMax * multiplier);

    // Adjust based on goals
    if (preferences.goals === 'muscle') {
        dailyCaloriesMin += 200;
        dailyCaloriesMax += 300;
    } else if (preferences.goals === 'energy') {
        dailyCaloriesMin += 100;
        dailyCaloriesMax += 150;
    }

    // Build dietary rules list
    const dietaryRules: string[] = [];
    if (preferences.isHalal) dietaryRules.push('All meals must be halal-certified');
    if (preferences.isVegetarian) dietaryRules.push('All meals must be vegetarian (no meat or fish)');
    if (preferences.isVegan) dietaryRules.push('All meals must be vegan (no animal products at all)');
    if (preferences.noPork) dietaryRules.push('No pork or pork-derived ingredients');
    if (preferences.noBeef) dietaryRules.push('No beef or beef-derived ingredients');

    if (preferences.allergies.length > 0) {
        dietaryRules.push(`Must avoid these allergens: ${preferences.allergies.join(', ')}`);
    }
    if (preferences.customAllergies && preferences.customAllergies.trim()) {
        dietaryRules.push(`Must also avoid: ${preferences.customAllergies.trim()}`);
    }

    // Minimum nutrition thresholds per meal
    const minProteinPerMeal = preferences.goals === 'muscle' ? 25 : 10;
    const minFiberPerMeal = 2;

    return {
        dailyCaloriesMin,
        dailyCaloriesMax,
        minProteinPerMeal,
        minFiberPerMeal,
        maxBudgetPerMeal: preferences.budgetPerMeal,
        dietaryRules,
    };
}

// ============================================================
// LAYER 2: GEMINI AI (Personalization)
// ============================================================

function getCookBuyAssignment(cookingPreference: string): string {
    switch (cookingPreference) {
        case 'cook_all':
            return 'All meals (Breakfast, Lunch, Dinner) should be "cook" mode.';
        case 'buy_all':
            return 'All meals (Breakfast, Lunch, Dinner) should be "buy" mode.';
        case 'cook_breakfast_dinner':
            return 'Breakfast and Dinner should be "cook" mode. Lunch should be "buy" mode.';
        case 'cook_dinner_only':
        default:
            return 'Breakfast and Lunch should be "buy" mode. Dinner should be "cook" mode.';
    }
}

function buildPrompt(preferences: UserPreferences, constraints: NutritionConstraints): string {
    const cuisineNote =
        preferences.favoriteCuisines.length > 0
            ? `Preferred cuisines: ${preferences.favoriteCuisines.join(', ')}`
            : 'Include a mix of Malay, Chinese, Indian, and Western cuisines';

    const speedMap: Record<string, string> = {
        quick: '10-15',
        normal: '15-25',
        elaborate: '25-35',
    };
    
    // 🔥 FIX: We tell the AI exactly what "prepTime" means for a student!
    const prepTimeNote = `Total time required (including traveling, ordering, waiting, or cooking, and eating) should be around ${speedMap[preferences.mealSpeed] || '15-25'} minutes. NEVER output 0 minutes.`;

    const goalDescriptions: Record<string, string> = {
        maintain: 'maintaining current wellness and healthy habits',
        energy: 'boosting energy and focus throughout the day',
        muscle: 'supporting muscle growth and fitness with higher protein',
        balanced: 'achieving well-rounded balanced nutrition',
    };
    const goalNote = goalDescriptions[preferences.goals] || 'balanced nutrition';

    const cookingPref = preferences.cookingPreference || 'cook_dinner_only';
    const cookBuyRule = getCookBuyAssignment(cookingPref);

    return `You are a Malaysian nutrition expert. Generate a personalized daily meal plan (breakfast, lunch, dinner) for a Malaysian ${preferences.ageGroup === 'teen' ? 'teenager' : 'adult'}.

CONTEXT:
- User is a ${preferences.ageGroup === 'teen' ? 'teenager (13-17)' : 'adult (18+)'} in Malaysia
- Activity level: ${preferences.activityLevel}
- Goal: ${goalNote}
- ${cuisineNote}
- ${prepTimeNote}

NUTRITIONAL CONSTRAINTS:
- Daily calorie target: ${constraints.dailyCaloriesMin}-${constraints.dailyCaloriesMax} kcal
- Minimum protein per meal: ${constraints.minProteinPerMeal}g
- Minimum fiber per meal: ${constraints.minFiberPerMeal}g
- Maximum budget per meal: RM ${constraints.maxBudgetPerMeal}
${constraints.dietaryRules.length > 0 ? `- Dietary rules:\n  ${constraints.dietaryRules.map((r) => `• ${r}`).join('\n  ')}` : ''}

HYBRID COOK vs. BUY RULES:
${cookBuyRule}

"BUY" MEAL RULES:
- Suggest specific, realistic Malaysian dishes commonly found at campus cafeterias, Mamak stalls, or Kopitiams
- The estimated_cost_rm MUST stay under RM ${constraints.maxBudgetPerMeal}
- Leave the ingredients array EMPTY for buy meals: []
- 🔥 SET prepTime to a realistic number (e.g., 15, 20, 25) representing the time taken to travel, order, and eat. DO NOT USE 0.

"COOK" MEAL RULES:
- Suggest simple, dorm-friendly Malaysian recipes that a student can cook
- Populate the ingredients array with EXACT items needed for that single meal (e.g., ["2 Eggs", "1 bowl Rice", "Garlic"])
- SET prepTime to the realistic cooking + eating time.

SMART GROCERY LIST RULES:
- Scan ALL "cook" meals generated above and consolidate their ingredients into the smart_grocery_list array.
- Group items into categories: Produce, Protein, Pantry, Dairy.
- Provide realistic estimated local market prices in RM.
- Include which meals use the ingredient in the used_in_meals array (e.g., ["Breakfast", "Dinner"]).
- STRICTLY NO DUPLICATE ingredients. If multiple meals use eggs, combine the total_quantity.

Respond ONLY with valid JSON in this EXACT format (no markdown, no code blocks):
{
  "breakfast": {
    "name": "Meal name",
    "caloriesMin": 400,
    "caloriesMax": 500,
    "cost": 8.50,
    "cuisine": "Malay",
    "prepTime": 15,
    "protein": 18,
    "carbs": 52,
    "fats": 22,
    "fiber": 3,
    "whyThisMeal": "Personal explanation",
    "ingredients": ["ingredient1", "ingredient2"],
    "mode": "buy"
  },
  "lunch": { ... },
  "dinner": { ... },
  "smart_grocery_list": [
    {
      "category": "Protein",
      "item_name": "Eggs",
      "total_quantity": "3 pieces",
      "estimated_total_price_rm": 1.50,
      "used_in_meals": ["Breakfast", "Dinner"]
    }
  ]
}`;
}

function buildSwapPrompt(
    currentMealName: string,
    mealType: string,
    preferences: UserPreferences,
    constraints: NutritionConstraints
): string {
    const cuisineNote =
        preferences.favoriteCuisines.length > 0
            ? `Preferred cuisines: ${preferences.favoriteCuisines.join(', ')}`
            : 'Any Malaysian cuisine';

    return `You are a Malaysian nutrition expert. The user wants to swap their ${mealType} meal.
Current meal they want to replace: "${currentMealName}"

Generate ONE alternative ${mealType} meal that is DIFFERENT from "${currentMealName}".

CONSTRAINTS:
- Maximum budget: RM ${constraints.maxBudgetPerMeal}
- Minimum protein: ${constraints.minProteinPerMeal}g
- ${cuisineNote}
${constraints.dietaryRules.length > 0 ? `- Dietary rules:\n  ${constraints.dietaryRules.map((r) => `• ${r}`).join('\n  ')}` : ''}

Use a REAL Malaysian dish with an authentic name and realistic pricing in RM.
🔥 SET prepTime to a realistic number representing total time (cooking or traveling/eating). DO NOT USE 0.

Respond ONLY with valid JSON (no markdown, no code blocks, no extra text):
{
  "name": "Meal name",
  "caloriesMin": 400,
  "caloriesMax": 500,
  "cost": 8.50,
  "cuisine": "Malay",
  "prepTime": 15,
  "protein": 18,
  "carbs": 52,
  "fats": 22,
  "fiber": 3,
  "whyThisMeal": "Why this is a great swap",
  "ingredients": ["ingredient1", "ingredient2"]
}`;
}

// ============================================================
// EXPORTED FUNCTIONS
// ============================================================

export async function generateMealPlanWithAI(
    preferences: UserPreferences,
    seasonalRules?: string
): Promise<MealPlan> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const constraints = buildConstraints(preferences);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = buildPrompt(preferences, constraints);
    if (seasonalRules) {
        prompt += `\n\n${seasonalRules}`;
    }
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    let parsed: any;
    try {
        parsed = JSON.parse(cleanedText);
    } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Failed to parse AI response. Please try again.');
    }

    const fallback = {
        name: "Rest & Hydrate",
        caloriesMin: 0, caloriesMax: 0, cost: 0, cuisine: "Universal",
        prepTime: 15, protein: 0, carbs: 0, fats: 0, fiber: 0,
        whyThisMeal: "Maintaining balance and hydration.",
        ingredients: [] as string[],
        mode: 'buy' as 'cook' | 'buy'
    };

    const makeMeal = (data: any, mealType: 'breakfast' | 'lunch' | 'dinner'): Meal => {
        const d = data || fallback;
        return {
            id: `${mealType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: d.name || fallback.name,
            caloriesMin: d.caloriesMin ?? 0,
            caloriesMax: d.caloriesMax ?? 0,
            cost: d.cost ?? 0,
            cuisine: d.cuisine || "Unknown",
            prepTime: d.prepTime || 15, // Provide a 15-minute fallback if AI still tries to use 0
            protein: d.protein ?? 0,
            carbs: d.carbs ?? 0,
            fats: d.fats ?? 0,
            fiber: d.fiber ?? 0,
            whyThisMeal: d.whyThisMeal || "",
            ingredients: d.ingredients || [],
            mode: d.mode || 'buy',
            mealType,
        };
    };

    const breakfast = makeMeal(parsed.breakfast, 'breakfast');
    const lunch = makeMeal(parsed.lunch, 'lunch');
    const dinner = makeMeal(parsed.dinner, 'dinner');

    return {
        id: `plan-${Date.now()}`,
        date: new Date().toISOString(),
        breakfast,
        lunch,
        dinner,
        totalCost: (breakfast.cost || 0) + (lunch.cost || 0) + (dinner.cost || 0),
        totalCaloriesMin: (breakfast.caloriesMin || 0) + (lunch.caloriesMin || 0) + (dinner.caloriesMin || 0),
        totalCaloriesMax: (breakfast.caloriesMax || 0) + (lunch.caloriesMax || 0) + (dinner.caloriesMax || 0),
        preferences,
        smart_grocery_list: parsed.smart_grocery_list || [],
    };
}

export async function swapMealWithAI(
    currentMeal: Meal,
    preferences: UserPreferences,
    seasonalRules?: string
): Promise<Meal> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const constraints = buildConstraints(preferences);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = buildSwapPrompt(currentMeal.name, currentMeal.mealType, preferences, constraints);
    if (seasonalRules) {
        prompt += `\n\n${seasonalRules}`;
    }
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    let parsed: any;
    try {
        parsed = JSON.parse(cleanedText);
    } catch (e) {
        console.error('Failed to parse Gemini swap response:', text);
        throw new Error('Failed to parse AI response. Please try again.');
    }

    const d = parsed || {};
    return {
        id: `${currentMeal.mealType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: d.name || "Alternative Option",
        caloriesMin: d.caloriesMin ?? 0,
        caloriesMax: d.caloriesMax ?? 0,
        cost: d.cost ?? 0,
        cuisine: d.cuisine || "Malaysian",
        prepTime: d.prepTime || 15,
        protein: d.protein ?? 0,
        carbs: d.carbs ?? 0,
        fats: d.fats ?? 0,
        fiber: d.fiber ?? 0,
        whyThisMeal: d.whyThisMeal || "A healthy swap for your plan.",
        ingredients: d.ingredients || [],
        mode: d.mode || 'buy',
        mealType: currentMeal.mealType,
    };
}