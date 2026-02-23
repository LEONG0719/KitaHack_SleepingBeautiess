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
}

export interface SavedPlan {
  id: string;
  name: string;
  createdAt: string;
  plan: MealPlan;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  campus?: string;
  goals?: UserPreferences['goals'];
  favoriteCuisine?: string;
  buddy?: {
    vitality: number;
    level: number;
    streak: number;
  };
  updatedAt?: string;
}
