import { GoogleGenerativeAI } from '@google/generative-ai';
import { UserPreferences, WeeklyMealPlan } from './types';
import { buildConstraints } from './gemini';

// ============================================================
// WEEKLY PROMPT BUILDER
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

function buildWeeklyPrompt(preferences: UserPreferences, constraints: ReturnType<typeof buildConstraints>): string {
  const cookingPref = preferences.cookingPreference || 'cook_dinner_only';
  const cookBuyRule = getCookBuyAssignment(cookingPref);

  const cuisineNote =
    preferences.favoriteCuisines.length > 0
      ? `Preferred cuisines: ${preferences.favoriteCuisines.join(', ')}`
      : 'Include a mix of Malay, Chinese, Indian, and Western cuisines';

  const goalDescriptions: Record<string, string> = {
    maintain: 'maintaining current wellness and healthy habits',
    energy: 'boosting energy and focus throughout the day',
    muscle: 'supporting muscle growth and fitness with higher protein',
    balanced: 'achieving well-rounded balanced nutrition',
  };
  const goalNote = goalDescriptions[preferences.goals] || 'balanced nutrition';

  return `You are a Malaysian nutrition expert and budget meal planner. Generate a COMPLETE 7-day hybrid meal plan (Monday to Sunday) for a Malaysian ${preferences.ageGroup === 'teen' ? 'teenager' : 'adult'}.

CONTEXT:
- User is a ${preferences.ageGroup === 'teen' ? 'teenager (13-17)' : 'adult (18+)'} student/young professional in Malaysia
- Activity level: ${preferences.activityLevel}
- Goal: ${goalNote}
- ${cuisineNote}

NUTRITIONAL CONSTRAINTS:
- Daily calorie target: ${constraints.dailyCaloriesMin}-${constraints.dailyCaloriesMax} kcal
- Minimum protein per meal: ${constraints.minProteinPerMeal}g
- Minimum fiber per meal: ${constraints.minFiberPerMeal}g
- Maximum budget per meal: RM ${constraints.maxBudgetPerMeal}
${constraints.dietaryRules.length > 0 ? `- Dietary rules:\n  ${constraints.dietaryRules.map((r) => `• ${r}`).join('\n  ')}` : ''}

HYBRID COOK vs. BUY RULES:
${cookBuyRule}

"BUY" MEAL RULES (City Survivor):
- Suggest specific, realistic Malaysian dishes commonly found at campus cafeterias, Mamak stalls, or Kopitiams
- Examples: Roti Canai (RM 2-3), Nasi Campur with 1 Veg 1 Chicken (RM 6-8), Mee Soup (RM 5-6), Economy Rice
- The estimated_cost_rm MUST stay under RM ${constraints.maxBudgetPerMeal}
- Leave the ingredients array EMPTY for buy meals: []
- Include realistic calorie and macro estimates

"COOK" MEAL RULES (Home Chef):
- Suggest simple, dorm-friendly Malaysian recipes that a student can cook
- Examples: Sardine Curry, Stir-fry Kangkung with Garlic, Egg Fried Rice with Vegetables, Instant Noodles upgraded with real protein and fiber
- Populate the ingredients array with EXACT items and quantities needed for that single meal
- Each ingredient must have item_name and quantity (e.g., "2 pieces", "100g", "1 can")

SMART GROCERY AGGREGATION:
After generating all 7 days, scan ALL "cook" meals and consolidate ingredients:
- If Monday needs 2 eggs and Friday needs 3 eggs, output ONE entry for "Eggs" with total_quantity "5 pieces"
- Group items into categories: Produce (vegetables, fruits), Protein (meat, fish, eggs, tofu, tempeh), Pantry (rice, oil, sauces, canned goods, spices), Dairy (milk, cheese)
- Provide realistic estimated LOCAL MARKET prices in Malaysian Ringgit (RM)
- Include which meals use each ingredient in the used_in_meals array (e.g., "Mon Dinner", "Wed Dinner")
- STRICTLY NO DUPLICATE ingredients in the grocery list

BUDGET STRICTNESS:
${constraints.maxBudgetPerMeal <= 7 ? '- Budget is very tight. Lean heavily into plant-based proteins (Tempeh RM 2-3, Tofu RM 1.50-2, Dal RM 3-4) or eggs (RM 0.50 each) rather than expensive meats.' : '- Budget allows for some flexibility with protein choices.'}

Respond ONLY with valid JSON in this EXACT format (no markdown, no code blocks, no extra text):
{
  "status": "success",
  "data": {
    "weekly_plan": [
      {
        "day": "Monday",
        "meals": [
          {
            "meal_type": "breakfast",
            "mode": "buy",
            "dish_name": "Roti Canai with Dhal",
            "estimated_cost_rm": 3.00,
            "calories": 350,
            "health_reason": "Affordable carb source to start the day with plant protein from dhal",
            "ingredients": [],
            "protein": 8,
            "carbs": 45,
            "fats": 12,
            "fiber": 3
          }
        ]
      }
    ],
    "smart_grocery_list": [
      {
        "category": "Protein",
        "item_name": "Eggs",
        "total_quantity": "10 pieces",
        "estimated_total_price_rm": 5.00,
        "used_in_meals": ["Mon Dinner", "Wed Dinner", "Fri Dinner"]
      }
    ],
    "weekly_summary": {
      "total_estimated_cost_rm": 150.00,
      "total_meals_cooked": 7,
      "total_meals_bought": 14
    }
  }
}

IMPORTANT:
- Generate ALL 7 days (Monday through Sunday) with EXACTLY 3 meals each (breakfast, lunch, dinner)
- Use REAL Malaysian dish names with authentic names
- Ensure VARIETY across the week - do not repeat the same dish more than twice
- All prices in Malaysian Ringgit (RM)
- The weekly_summary total_estimated_cost_rm must be the sum of ALL 21 meals' costs
- Ensure the smart_grocery_list has NO duplicate items`;
}

// ============================================================
// GENERATE WEEKLY PLAN
// ============================================================

export async function generateWeeklyPlanWithAI(
  preferences: UserPreferences,
  seasonalRules?: string
): Promise<WeeklyMealPlan> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  // Layer 1: Build rule-based constraints
  const constraints = buildConstraints(preferences);

  // Layer 2: Call Gemini with the weekly prompt
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  let prompt = buildWeeklyPrompt(preferences, constraints);
  if (seasonalRules) {
    prompt += `\n\n${seasonalRules}`;
  }
  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();

  // Parse the JSON response — strip any markdown code fences if present
  const cleanedText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleanedText);
  } catch (e) {
    console.error('Failed to parse Gemini weekly response:', text);
    throw new Error('Failed to parse AI response for weekly plan. Please try again.');
  }

  // Validate the response structure
  if (parsed.status === 'error') {
    throw new Error(parsed.message || 'AI could not generate a valid plan. Try adjusting your budget or constraints.');
  }

  const data = parsed.data || parsed;

  if (!data.weekly_plan || !Array.isArray(data.weekly_plan)) {
    throw new Error('Invalid weekly plan format received from AI. Please try again.');
  }

  // Build the typed WeeklyMealPlan with programmatic summary calculation
  // (AI often gets calculations wrong in large JSON structures)
  let totalCost = 0;
  let mealsCooked = 0;
  let mealsBought = 0;

  const processedPlan = data.weekly_plan.map((day: any) => {
    const processedMeals = (day.meals || []).map((meal: any) => {
      // Data scrubbing & defaults
      const cost = typeof meal.estimated_cost_rm === 'number' ? meal.estimated_cost_rm : 0;
      const isCook = meal.mode === 'cook';

      totalCost += cost;
      if (isCook) mealsCooked++;
      else mealsBought++;

      return {
        ...meal,
        estimated_cost_rm: cost,
        dish_name: meal.dish_name || "Balanced Meal",
        ingredients: meal.ingredients || [],
      };
    });

    return {
      ...day,
      meals: processedMeals
    };
  });

  return {
    id: `weekly-plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    preferences,
    weekly_plan: processedPlan,
    smart_grocery_list: data.smart_grocery_list || [],
    weekly_summary: {
      total_estimated_cost_rm: totalCost,
      total_meals_cooked: mealsCooked,
      total_meals_bought: mealsBought,
    },
  };
}
