'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { MealPlan } from '@/lib/types';
import { getSavedPlansFromFirestore, deleteMealPlanFromFirestore } from '@/lib/firestore';
import { Calendar, DollarSign, Flame, Trash2, Eye, Loader2, Sunrise, Cloud, Moon } from 'lucide-react';

export default function SavedPlansPage() {
  const router = useRouter();
  const [savedPlans, setSavedPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const plans = await getSavedPlansFromFirestore();
        setSavedPlans(plans);
      } catch (error) {
        console.error('Error loading saved plans:', error);
      } finally {
        setLoading(false);
      }
    };
    loadPlans();
  }, []);

  const handleViewPlan = (plan: MealPlan) => {
    localStorage.setItem('currentPlan', JSON.stringify(plan));
    router.push('/result');
  };

  const handleDeletePlan = async (planId: string) => {
    try {
      await deleteMealPlanFromFirestore(planId);
      setSavedPlans((prev) => prev.filter((p) => p.id !== planId));
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Saved Meal Plans
            </h1>
            <p className="text-gray-600">
              Access your previously saved meal plans
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading saved plans...</p>
            </div>
          ) : savedPlans.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No Saved Plans Yet
              </h2>
              <p className="text-gray-600 mb-6">
                Create and save your first meal plan to see it here
              </p>
              <Button
                onClick={() => router.push('/plan')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Create New Plan
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="group bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  {/* Header with badge and date */}
                  <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-emerald-200 px-6 py-4">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-emerald-700 bg-white px-3 py-1 rounded-full shadow-sm">
                        Saved Plan
                      </span>
                      <span className="text-xs text-emerald-600 font-medium">
                        {new Date(plan.date).toLocaleDateString('en-MY', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-gray-900">
                      Daily Meal Plan
                    </h3>
                  </div>

                  {/* Meals section */}
                  <div className="p-6 space-y-4">
                    {/* Breakfast */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100">
                        <Sunrise className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Breakfast</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {plan.breakfast.name}
                        </p>
                      </div>
                    </div>

                    {/* Lunch */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-orange-100">
                        <Cloud className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Lunch</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {plan.lunch.name}
                        </p>
                      </div>
                    </div>

                    {/* Dinner */}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100">
                        <Moon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Dinner</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {plan.dinner.name}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Stats section */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                        <div>
                          <p className="text-xs text-gray-500">Cost</p>
                          <p className="text-sm font-bold text-gray-900">
                            RM {plan.totalCost.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-600" />
                        <div>
                          <p className="text-xs text-gray-500">Calories</p>
                          <p className="text-sm font-bold text-gray-900">
                            {plan.totalCaloriesMin}-{plan.totalCaloriesMax}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
                    <Button
                      onClick={() => handleViewPlan(plan)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      onClick={() => handleDeletePlan(plan.id)}
                      variant="outline"
                      className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-medium rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
