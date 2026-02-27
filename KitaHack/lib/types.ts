export interface UserPreferences {
  ageGroup: 'teen' | 'adult';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active';
  isHalal: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  noPork: boolean;
  noBeef: boolean;
  allergies: string[];
  customAllergies: string;
  favoriteCuisines: string[];
  mealSpeed: 'quick' | 'normal' | 'elaborate';
  budgetPerMeal: number;
  goals: 'maintain' | 'energy' | 'muscle' | 'balanced';
  cookingPreference?: 'cook_all' | 'cook_dinner_only' | 'buy_all' | 'cook_breakfast_dinner';
}

export interface Meal {
  id: string;
  name: string;
  caloriesMin: number;
  caloriesMax: number;
  cost: number;
  cuisine: string;
  prepTime: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  whyThisMeal: string;
  ingredients: string[];
  mealType: 'breakfast' | 'lunch' | 'dinner';
  mode?: 'cook' | 'buy';
  health_reason?: string;
}

export interface MealPlan {
  id: string;
  date: string;
  breakfast: Meal;
  lunch: Meal;
  dinner: Meal;
  totalCost: number;
  totalCaloriesMin: number;
  totalCaloriesMax: number;
  preferences: UserPreferences;
  isSaved?: boolean;
  smart_grocery_list?: GroceryItem[];
}

export interface SavedPlan {
  id: string;
  name: string;
  createdAt: string;
  plan: MealPlan;
}

// ============================================================
// WEEKLY PLAN TYPES
// ============================================================

export interface WeeklyMealPlan {
  id: string;
  createdAt: string;
  preferences: UserPreferences;
  weekly_plan: DayPlan[];
  smart_grocery_list: GroceryItem[];
  weekly_summary: WeeklySummary;
  isSaved?: boolean;
}

export interface DayPlan {
  day: string;
  meals: WeeklyMeal[];
}

export interface WeeklyMeal {
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  mode: 'cook' | 'buy';
  dish_name: string;
  estimated_cost_rm: number;
  calories: number;
  health_reason: string;
  ingredients: { item_name: string; quantity: string }[];
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  status?: 'pending' | 'completed';
  verification_result?: PoMVerificationResult;
}

export interface GroceryItem {
  category: 'Produce' | 'Protein' | 'Pantry' | 'Dairy';
  item_name: string;
  total_quantity: string;
  estimated_total_price_rm: number;
  used_in_meals: string[];
}

export interface WeeklySummary {
  total_estimated_cost_rm: number;
  total_meals_cooked: number;
  total_meals_bought: number;
}

// ============================================================
// PROOF OF MEAL (PoM) TYPES
// ============================================================

export interface PoMVerificationResult {
  is_valid_food: boolean;
  is_context_match: boolean;
  error_message: string | null;
  detected_items: string[];
  carbs_pct: number;
  protein_pct: number;
  fiber_pct: number;
  suku_suku_score: number;
  earned_coins: number;
  feedback_message: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  bio?: string;
  state?: string;
  campus?: string;
  goals?: 'maintain' | 'energy' | 'muscle' | 'balanced';
  favoriteCuisine?: string;
  buddy?: {
    vitality: number;
    level: number;
    streak: number;
  };

  current_tier?: string;
  gamification_stats?: {
    nutricoin_balance: number;
    current_health_streak_days: number;
    avatar_state: 'optimal' | 'neutral' | 'sluggish';
    // 🔥 NEW: Global tracking for planned meals
    planned_meals_logged_today?: { breakfast: boolean; lunch: boolean; dinner: boolean };
    planned_meals_last_date?: string;
  };
}
