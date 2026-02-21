'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Stepper from '@/components/Stepper';
import MealCard from '@/components/MealCard';
import Toast from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import NutriBuddy from '@/components/NutriBuddy';
import { Button } from '@/components/ui/button';
import { MealPlan, Meal } from '@/lib/types';
import { saveMealPlanToFirestore } from '@/lib/firestore';
import {
  Flame,
  DollarSign,
  Calendar,
  ShoppingCart,
  Save,
  RefreshCw,
} from 'lucide-react';

export default function ResultPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [buddyStats, setBuddyStats] = useState({
    vitality: 78,
    level: 4,
    streak: 2,
  });

  useEffect(() => {
    const planStr = localStorage.getItem('currentPlan');
    if (!planStr) {
      router.push('/plan');
      return;
    }

    const loadedPlan: MealPlan = JSON.parse(planStr);
    setPlan(loadedPlan);

    const buddyStr = localStorage.getItem('nutriBuddyStats');
    if (buddyStr) {
      try {
        const parsed = JSON.parse(buddyStr) as Partial<{
          vitality: number;
          level: number;
          streak: number;
        }>;
        const next = {
          vitality:
            typeof parsed.vitality === 'number'
              ? Math.max(0, Math.min(100, parsed.vitality))
              : 78,
          level:
            typeof parsed.level === 'number'
              ? Math.max(1, Math.floor(parsed.level))
              : 4,
          streak:
            typeof parsed.streak === 'number'
              ? Math.max(0, Math.floor(parsed.streak))
              : 2,
        };
        setBuddyStats(next);
      } catch (error) {
        setBuddyStats({ vitality: 78, level: 4, streak: 2 });
      }
    }
  }, [router]);

  const handleSwapMeal = async (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    currentMeal: Meal
  ) => {
    if (!plan) return;

    setSwappingMeal(mealType);

    try {
      // Call the real API route for AI-powered meal swap
      const response = await fetch('/api/swap-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMeal, preferences: plan.preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to swap meal');
      }

      const newMeal: Meal = await response.json();

      const updatedPlan = {
        ...plan,
        [mealType]: newMeal,
        totalCost:
          (mealType === 'breakfast'
            ? newMeal.cost
            : plan.breakfast.cost) +
          (mealType === 'lunch' ? newMeal.cost : plan.lunch.cost) +
          (mealType === 'dinner' ? newMeal.cost : plan.dinner.cost),
        totalCaloriesMin:
          (mealType === 'breakfast'
            ? newMeal.caloriesMin
            : plan.breakfast.caloriesMin) +
          (mealType === 'lunch'
            ? newMeal.caloriesMin
            : plan.lunch.caloriesMin) +
          (mealType === 'dinner'
            ? newMeal.caloriesMin
            : plan.dinner.caloriesMin),
        totalCaloriesMax:
          (mealType === 'breakfast'
            ? newMeal.caloriesMax
            : plan.breakfast.caloriesMax) +
          (mealType === 'lunch'
            ? newMeal.caloriesMax
            : plan.lunch.caloriesMax) +
          (mealType === 'dinner'
            ? newMeal.caloriesMax
            : plan.dinner.caloriesMax),
      };

      setPlan(updatedPlan);
      localStorage.setItem('currentPlan', JSON.stringify(updatedPlan));

      setToast({
        message: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} swapped successfully!`,
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: 'Failed to swap meal. Please try again.',
        type: 'error',
      });
    } finally {
      setSwappingMeal(null);
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;

    try {
      // Save to Firestore
      await saveMealPlanToFirestore(plan);

      setToast({
        message: 'Meal plan saved successfully!',
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: 'Failed to save plan. Please try again.',
        type: 'error',
      });
    }
  };

  const handleGenerateWeekPlan = () => {
    setToast({
      message: 'Weekly plan generation coming soon!',
      type: 'info',
    });
  };

  const handleGenerateShoppingList = () => {
    if (!plan) return;

    const allIngredients = [
      ...plan.breakfast.ingredients,
      ...plan.lunch.ingredients,
      ...plan.dinner.ingredients,
    ];

    const uniqueIngredients = Array.from(new Set(allIngredients));

    const shoppingList = {
      date: new Date().toLocaleDateString(),
      ingredients: uniqueIngredients,
      totalCost: plan.totalCost,
    };

    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));

    setToast({
      message: 'Shopping list created! (Check console for details)',
      type: 'success',
    });

    console.log('Shopping List:', shoppingList);
  };

  const handleNewPlan = () => {
    localStorage.removeItem('currentPlan');
    router.push('/plan');
  };

  if (!plan) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <p className="text-gray-600">Loading your meal plan...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Stepper currentStep={3} steps={['Preferences', 'Loading', 'Results']} />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Personalized Meal Plan
            </h1>
            <p className="text-gray-600">
              A balanced daily plan tailored to your preferences
            </p>
          </div>

          <div className="mb-8">
            <NutriBuddy
              vitality={buddyStats.vitality}
              level={buddyStats.level}
              streak={buddyStats.streak}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600 mr-2" />
                <span className="text-sm text-gray-600 font-medium">
                  Total Daily Cost
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                RM {plan.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Within your budget of RM {plan.preferences.budgetPerMeal * 3}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <Flame className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-sm text-gray-600 font-medium">
                  Calorie Range
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {plan.totalCaloriesMin}-{plan.totalCaloriesMax}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Approximate daily range
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm text-gray-600 font-medium">Date</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">Today</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-yellow-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-2xl">🌅</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Breakfast</h2>
              </div>
              <MealCard
                meal={plan.breakfast}
                onSwap={() => handleSwapMeal('breakfast', plan.breakfast)}
                isSwapping={swappingMeal === 'breakfast'}
              />
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-2xl">☀️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Lunch</h2>
              </div>
              <MealCard
                meal={plan.lunch}
                onSwap={() => handleSwapMeal('lunch', plan.lunch)}
                isSwapping={swappingMeal === 'lunch'}
              />
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-2xl">🌙</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Dinner</h2>
              </div>
              <MealCard
                meal={plan.dinner}
                onSwap={() => handleSwapMeal('dinner', plan.dinner)}
                isSwapping={swappingMeal === 'dinner'}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8">
            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={handleSavePlan}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save This Plan
              </Button>

              <Button
                onClick={handleGenerateWeekPlan}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Generate Week Plan
              </Button>

              <Button
                onClick={handleGenerateShoppingList}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Shopping List
              </Button>

              <Button
                onClick={handleNewPlan}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Create New Plan
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-2">About Your Plan</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  All meals are selected based on your dietary preferences and
                  budget constraints.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Calorie ranges are approximate and based on typical Malaysian
                  portions.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Prices may vary based on location and ingredient availability.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Use the Swap button to try different meal options that match
                  your preferences.
                </span>
              </li>
            </ul>
          </div>
        </main>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
