'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { MealPlan, WeeklyMealPlan } from '@/lib/types';
import {
  getSavedPlansFromFirestore,
  deleteMealPlanFromFirestore,
  getWeeklyPlansFromFirestore,
  deleteWeeklyPlanFromFirestore,
} from '@/lib/firestore';
import {
  Calendar,
  CalendarRange,
  DollarSign,
  Flame,
  Trash2,
  Eye,
  Loader2,
  UtensilsCrossed,
  ShoppingBag,
  Info, // 🔥 ADDED Info icon
} from 'lucide-react';

type SavedItem =
  | { type: 'daily'; plan: MealPlan; sortDate: number }
  | { type: 'weekly'; plan: WeeklyMealPlan; sortDate: number };

export default function SavedPlansPage() {
  const router = useRouter();
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const [dailyPlans, weeklyPlans] = await Promise.all([
          getSavedPlansFromFirestore(),
          getWeeklyPlansFromFirestore(),
        ]);

        const all: SavedItem[] = [
          ...dailyPlans.map((p) => ({
            type: 'daily' as const,
            plan: p,
            sortDate: new Date(p.date).getTime(),
          })),
          ...weeklyPlans.map((p) => ({
            type: 'weekly' as const,
            plan: p,
            sortDate: new Date(p.createdAt).getTime(),
          })),
        ];

        all.sort((a, b) => b.sortDate - a.sortDate);
        setItems(all);
      } catch (error) {
        console.error('Error loading saved plans:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const handleViewDailyPlan = (plan: MealPlan) => {
    const planToView = { ...plan, isSaved: true };
    localStorage.setItem('currentPlan', JSON.stringify(planToView));
    router.push('/result');
  };

  const handleViewWeeklyPlan = (plan: WeeklyMealPlan) => {
    const planToView = { ...plan, isSaved: true };
    localStorage.setItem('currentWeeklyPlan', JSON.stringify(planToView));
    router.push('/weekly-result');
  };

  const handleDeleteDaily = async (planId: string) => {
    try {
      await deleteMealPlanFromFirestore(planId);
      setItems((prev) => prev.filter((i) => !(i.type === 'daily' && i.plan.id === planId)));
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleDeleteWeekly = async (planId: string) => {
    try {
      await deleteWeeklyPlanFromFirestore(planId);
      setItems((prev) => prev.filter((i) => !(i.type === 'weekly' && i.plan.id === planId)));
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 pb-24">
        <Navbar />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-black text-gray-900 mb-2">
              Saved Meal Plans
            </h1>
            <p className="text-gray-600">
              Access your previously saved meal plans
            </p>
          </div>

          {/* 🔥 NEW: Planned Meal Guidelines */}
          <div className="mb-8 bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 flex gap-4 items-start shadow-sm">
            <div className="p-2.5 bg-indigo-100 rounded-xl text-indigo-600 shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-indigo-900 mb-1.5 flex items-center gap-2">
                📅 Planned Meals Guide
              </h3>
              <ul className="text-xs text-indigo-700/90 space-y-1.5 list-disc list-inside ml-1">
                <li>Sticking to your plan gives you <strong>bonus planning NutriCoins!</strong></li>
                <li>You can only verify <strong>one Breakfast, one Lunch, and one Dinner</strong> per day.</li>
                <li>Once verified, that meal type is locked permanently for the rest of the day.</li>
                <li>Failed scans do not count. Feel free to retake blurry photos!</li>
              </ul>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading saved plans...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Saved Plans Yet
              </h2>
              <p className="text-gray-600 mb-6 text-sm">
                Create and save your first meal plan to see it here
              </p>
              <Button
                onClick={() => router.push('/plan')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11 px-6 font-bold"
              >
                Create New Plan
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                if (item.type === 'daily') {
                  const plan = item.plan as MealPlan;
                  return (
                    <div
                      key={`daily-${plan.id}`}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2.5 py-1 rounded-md">
                            {new Date(plan.date).toLocaleDateString('en-MY', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteDaily(plan.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-emerald-500" /> Daily Plan
                        </h3>

                        <div className="space-y-4 mb-6">
                          <div className="flex items-start">
                            <span className="text-lg mr-3">🌅</span>
                            <div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                {plan.breakfast.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {plan.breakfast.cuisine}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <span className="text-lg mr-3">☀️</span>
                            <div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                {plan.lunch.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {plan.lunch.cuisine}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <span className="text-lg mr-3">🌙</span>
                            <div>
                              <p className="text-sm font-bold text-gray-900 line-clamp-1">
                                {plan.dinner.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {plan.dinner.cuisine}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 mb-6 pb-6 border-b border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center font-medium">
                              <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                              Total Cost
                            </span>
                            <span className="font-black text-gray-900">
                              RM {plan.totalCost.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center font-medium">
                              <Flame className="w-4 h-4 mr-1 text-orange-400" />
                              Calories
                            </span>
                            <span className="font-bold text-gray-900">
                              {plan.totalCaloriesMin}-{plan.totalCaloriesMax}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleViewDailyPlan(plan)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 h-11 rounded-xl font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          Open Plan & Scan
                        </Button>
                      </div>
                    </div>
                  );
                } else {
                  // Weekly plan card
                  const plan = item.plan as WeeklyMealPlan;
                  return (
                    <div
                      key={`weekly-${plan.id}`}
                      className="bg-white rounded-2xl border-2 border-emerald-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-10 opacity-50"></div>
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md uppercase tracking-wider">
                            {new Date(plan.createdAt).toLocaleDateString('en-MY', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <button
                            onClick={() => handleDeleteWeekly(plan.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 z-10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mb-5">
                          <CalendarRange className="w-5 h-5 text-emerald-600" />
                          <h3 className="font-black text-lg text-gray-900">
                            7-Day Meal Plan
                          </h3>
                        </div>

                        {/* Quick day preview — first 3 days */}
                        <div className="space-y-2 mb-6">
                          {plan.weekly_plan.slice(0, 3).map((day) => (
                            <div key={day.day} className="flex items-center gap-2 text-sm">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest w-10 shrink-0">
                                {day.day.slice(0, 3)}
                              </span>
                              <span className="text-gray-700 font-medium truncate">
                                {day.meals.map((m) => m.dish_name).join(' · ')}
                              </span>
                            </div>
                          ))}
                          {plan.weekly_plan.length > 3 && (
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-2 ml-[48px]">
                              +{plan.weekly_plan.length - 3} more days...
                            </p>
                          )}
                        </div>

                        {/* Summary stats */}
                        <div className="space-y-2 mb-6 pb-6 border-b border-gray-100">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center font-medium">
                              <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                              Estimated Cost
                            </span>
                            <span className="font-black text-gray-900">
                              RM {plan.weekly_summary.total_estimated_cost_rm.toFixed(0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center font-medium">
                              <UtensilsCrossed className="w-4 h-4 mr-1 text-orange-400" />
                              Meals to Cook
                            </span>
                            <span className="font-bold text-orange-600">
                              {plan.weekly_summary.total_meals_cooked}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600 flex items-center font-medium">
                              <ShoppingBag className="w-4 h-4 mr-1 text-blue-400" />
                              Meals to Buy
                            </span>
                            <span className="font-bold text-blue-600">
                              {plan.weekly_summary.total_meals_bought}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleViewWeeklyPlan(plan)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 h-11 rounded-xl font-bold"
                        >
                          <Eye className="w-4 h-4" />
                          Open Plan & Scan
                        </Button>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}