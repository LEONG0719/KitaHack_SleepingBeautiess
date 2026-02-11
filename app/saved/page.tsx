'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { MealPlan } from '@/lib/types';
import { getSavedPlansFromFirestore, deleteMealPlanFromFirestore } from '@/lib/firestore';
import { Calendar, DollarSign, Flame, Trash2, Eye, Loader2 } from 'lucide-react';

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
                  className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500">
                        {new Date(plan.date).toLocaleDateString('en-MY', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="font-bold text-lg text-gray-900 mb-4">
                      Daily Meal Plan
                    </h3>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-start">
                        <span className="text-lg mr-2">🌅</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {plan.breakfast.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {plan.breakfast.cuisine}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <span className="text-lg mr-2">☀️</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {plan.lunch.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {plan.lunch.cuisine}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <span className="text-lg mr-2">🌙</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {plan.dinner.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {plan.dinner.cuisine}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-6 pb-6 border-b">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
                          <DollarSign className="w-4 h-4 mr-1" />
                          Total Cost
                        </span>
                        <span className="font-semibold text-gray-900">
                          RM {plan.totalCost.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 flex items-center">
                          <Flame className="w-4 h-4 mr-1" />
                          Calories
                        </span>
                        <span className="font-semibold text-gray-900">
                          {plan.totalCaloriesMin}-{plan.totalCaloriesMax}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleViewPlan(plan)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Plan
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
