import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserPreferences, Meal, MealPlan } from './types';

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

function buildConstraints(preferences: UserPreferences): NutritionConstraints {
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

function buildPrompt(preferences: UserPreferences, constraints: NutritionConstraints): string {
    const cuisineNote =
        preferences.favoriteCuisines.length > 0
            ? `Preferred cuisines: ${preferences.favoriteCuisines.join(', ')}`
            : 'Include a mix of Malay, Chinese, Indian, and Western cuisines';

    const speedMap: Record<string, string> = {
        quick: '10-15 minutes',
        normal: '15-25 minutes',
        elaborate: '25-35 minutes',
    };
    const prepTimeNote = `Meal prep time should be around ${speedMap[preferences.mealSpeed] || '15-25 minutes'}`;

    const goalDescriptions: Record<string, string> = {
        maintain: 'maintaining current wellness and healthy habits',
        energy: 'boosting energy and focus throughout the day',
        muscle: 'supporting muscle growth and fitness with higher protein',
        balanced: 'achieving well-rounded balanced nutrition',
    };
    const goalNote = goalDescriptions[preferences.goals] || 'balanced nutrition';

    return `You are a Malaysian nutrition expert. Generate a personalized daily meal plan (breakfast, lunch, dinner) for a Malaysian ${preferences.ageGroup === 'teen' ? 'teenager' : 'adult'}.

CONTEXT:
- User is a ${preferences.ageGroup === 'teen' ? 'teenager (13-17)' : 'adult (18+)'} in Malaysia
- Activity level: ${preferences.activityLevel}
- Goal: ${goalNote}
- ${cuisineNote}
- ${prepTimeNote}

NUTRITIONAL CONSTRAINTS (enforced by our safety system):
- Daily calorie target: ${constraints.dailyCaloriesMin}-${constraints.dailyCaloriesMax} kcal
- Minimum protein per meal: ${constraints.minProteinPerMeal}g
- Minimum fiber per meal: ${constraints.minFiberPerMeal}g
- Maximum budget per meal: RM ${constraints.maxBudgetPerMeal}
${constraints.dietaryRules.length > 0 ? `- Dietary rules:\n  ${constraints.dietaryRules.map((r) => `• ${r}`).join('\n  ')}` : ''}

IMPORTANT INSTRUCTIONS:
- Use REAL Malaysian dishes with authentic names (e.g., nasi lemak, roti canai, char kuey teow)
- Prices must be realistic for Malaysian students (in RM)
- Each "whyThisMeal" explanation should be personal and contextual (e.g., reference their goals, time of day, energy needs)
- Ensure variety across breakfast, lunch, and dinner

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks, no extra text):
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
    "whyThisMeal": "Personal explanation of why this meal suits the user",
    "ingredients": ["ingredient1", "ingredient2"]
  },
  "lunch": { ... same format ... },
  "dinner": { ... same format ... }
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

Use a REAL Malaysian dish with authentic name and realistic pricing in RM.

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
    preferences: UserPreferences
): Promise<MealPlan> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    // Layer 1: Build rule-based constraints
    const constraints = buildConstraints(preferences);

    // Layer 2: Call Gemini with constraints baked into the prompt
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = buildPrompt(preferences, constraints);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response — strip any markdown code fences if present
    const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    let parsed: any;
    try {
        parsed = JSON.parse(cleanedText);
    } catch (e) {
        console.error('Failed to parse Gemini response:', text);
        throw new Error('Failed to parse AI response. Please try again.');
    }

    // Build typed meals
    const makeMeal = (data: any, mealType: 'breakfast' | 'lunch' | 'dinner'): Meal => ({
        id: `${mealType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: data.name,
        caloriesMin: data.caloriesMin,
        caloriesMax: data.caloriesMax,
        cost: data.cost,
        cuisine: data.cuisine,
        prepTime: data.prepTime,
        protein: data.protein,
        carbs: data.carbs,
        fats: data.fats,
        fiber: data.fiber,
        whyThisMeal: data.whyThisMeal,
        ingredients: data.ingredients,
        mealType,
    });

    const breakfast = makeMeal(parsed.breakfast, 'breakfast');
    const lunch = makeMeal(parsed.lunch, 'lunch');
    const dinner = makeMeal(parsed.dinner, 'dinner');

    return {
        id: `plan-${Date.now()}`,
        date: new Date().toISOString(),
        breakfast,
        lunch,
        dinner,
        totalCost: breakfast.cost + lunch.cost + dinner.cost,
        totalCaloriesMin: breakfast.caloriesMin + lunch.caloriesMin + dinner.caloriesMin,
        totalCaloriesMax: breakfast.caloriesMax + lunch.caloriesMax + dinner.caloriesMax,
        preferences,
    };
}

export async function swapMealWithAI(
    currentMeal: Meal,
    preferences: UserPreferences
): Promise<Meal> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured');
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

    const constraints = buildConstraints(preferences);

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = buildSwapPrompt(currentMeal.name, currentMeal.mealType, preferences, constraints);
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

    return {
        id: `${currentMeal.mealType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: parsed.name,
        caloriesMin: parsed.caloriesMin,
        caloriesMax: parsed.caloriesMax,
        cost: parsed.cost,
        cuisine: parsed.cuisine,
        prepTime: parsed.prepTime,
        protein: parsed.protein,
        carbs: parsed.carbs,
        fats: parsed.fats,
        fiber: parsed.fiber,
        whyThisMeal: parsed.whyThisMeal,
        ingredients: parsed.ingredients,
        mealType: currentMeal.mealType,
    };
}
