'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import WeeklyMealCard from '@/components/WeeklyMealCard';
import GroceryList from '@/components/GroceryList';
import WeeklySummary from '@/components/WeeklySummary';
import Toast from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { WeeklyMealPlan, PoMVerificationResult } from '@/lib/types';
import { saveWeeklyPlanToFirestore } from '@/lib/firestore';
import { getUserProfile } from '@/lib/gamification'; // 🔥 Added for global lock fetch

import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';

import { Save, RefreshCw, ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WeeklyResultPage() {
    const router = useRouter();
    const { user } = useAuth();
    
    const [plan, setPlan] = useState<WeeklyMealPlan | null>(null);
    const [selectedDay, setSelectedDay] = useState(0);
    const [showGrocery, setShowGrocery] = useState(false);
    const [saving, setSaving] = useState(false);

    // 🔥 Global Lock state (Tracks real-world today)
    const [globalLocks, setGlobalLocks] = useState<Record<string, boolean>>({
        breakfast: false,
        lunch: false,
        dinner: false
    });

    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; } | null>(null);

    useEffect(() => {
        const planStr = localStorage.getItem('currentWeeklyPlan');
        if (!planStr) {
            router.push('/plan');
            return;
        }
        try {
            const parsed = JSON.parse(planStr);
            setPlan(parsed);
        } catch {
            router.push('/plan');
        }

        // 🔥 Fetch Global Locks from DB on load
        const fetchLocks = async () => {
            try {
                const profile = await getUserProfile();
                const today = new Date();
                const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
                
                if (profile.gamification_stats?.planned_meals_last_date === todayStr) {
                    setGlobalLocks(profile.gamification_stats.planned_meals_logged_today || { breakfast: false, lunch: false, dinner: false });
                }
            } catch (err) {
                console.error("Failed to load global locks", err);
            }
        };
        fetchLocks();

    }, [router]);

    const handleSavePlan = async () => {
        if (!plan) return;
        setSaving(true);
        try {
            await saveWeeklyPlanToFirestore(plan);
            setPlan((prev) => prev ? { ...prev, isSaved: true } : prev);
            setToast({ message: 'Weekly plan saved!', type: 'success' });
        } catch (err: any) {
            setToast({ message: err.message || 'Failed to save plan', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleMealCompleted = async (dayIndex: number, mealIndex: number, result: PoMVerificationResult) => {
        if (!plan || !user) return;

        try {
            const meal = plan.weekly_plan[dayIndex].meals[mealIndex];
            const mealCost = meal.estimated_cost_rm;
            const targetCost = plan.preferences?.budgetPerMeal || 15; 
            
            let rmSaved = targetCost - mealCost;
            if (rmSaved < 0) rmSaved = 0;

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                'gamification_stats.weekly_money_saved_rm': increment(rmSaved)
            });

            // 🔥 Lock it globally locally so UI updates instantly across all days
            setGlobalLocks(prev => ({ ...prev, [meal.meal_type]: true }));

            setPlan((prev) => {
                if (!prev) return prev;
                const updated = { ...prev };
                const updatedPlan = [...updated.weekly_plan];
                const updatedDay = { ...updatedPlan[dayIndex] };
                const updatedMeals = [...updatedDay.meals];
                
                updatedMeals[mealIndex] = {
                    ...updatedMeals[mealIndex],
                    status: 'completed',
                    verification_result: result,
                };
                
                updatedDay.meals = updatedMeals;
                updatedPlan[dayIndex] = updatedDay;
                updated.weekly_plan = updatedPlan;

                localStorage.setItem('currentWeeklyPlan', JSON.stringify(updated));
                return updated;
            });

            setToast({
                message: `Meal Verified! You saved RM ${rmSaved.toFixed(2)} vs your budget! 💰`,
                type: 'success',
            });

        } catch (error) {
            console.error("Failed to update RM saved:", error);
            setToast({ message: 'Verified, but failed to save budget stats.', type: 'error' });
        }
    };
    
    const handleNewPlan = () => {
        localStorage.removeItem('currentWeeklyPlan');
        router.push('/plan');
    };

    if (!plan) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-pulse text-gray-500">Loading plan...</div>
            </div>
        );
    }

    const currentDayPlan = plan.weekly_plan[selectedDay];

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 pb-24">
                <Navbar />

                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">
                            Your 7-Day Meal Plan
                        </h1>
                        <p className="text-gray-600">
                            A hybrid Cook &amp; Buy plan tailored to your budget and preferences
                        </p>
                    </div>

                    <div className="mb-6">
                        <WeeklySummary summary={plan.weekly_summary} />
                    </div>

                    <div className="mb-6 overflow-x-auto">
                        <div className="flex gap-2 min-w-max">
                            {DAYS.map((day, index) => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(index)}
                                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${selectedDay === index
                                        ? 'bg-emerald-600 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className="hidden sm:inline">{day}</span>
                                    <span className="sm:hidden">{DAY_SHORT[index]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {currentDayPlan ? (
                        <div className="space-y-4 mb-8">
                            <h2 className="text-lg font-bold text-gray-800">
                                {currentDayPlan.day}
                            </h2>
                            {currentDayPlan.meals.map((meal, idx) => (
                                <WeeklyMealCard
                                    key={`${currentDayPlan.day}-${meal.meal_type}-${idx}`}
                                    meal={meal}
                                    dayIndex={selectedDay}
                                    mealIndex={idx}
                                    onMealCompleted={handleMealCompleted}
                                    // 🔥 PASS THE GLOBAL LOCK TO THE CARD
                                    isGloballyLocked={globalLocks[meal.meal_type]}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-gray-500 py-12">
                            No meals found for this day.
                        </div>
                    )}

                    <div className="mb-6">
                        <button
                            onClick={() => setShowGrocery(!showGrocery)}
                            className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
                        >
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                                <span className="font-bold text-gray-900">Smart Grocery List</span>
                                <span className="text-xs text-gray-500">
                                    ({plan.smart_grocery_list.length} items)
                                </span>
                            </div>
                            {showGrocery ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </button>

                        {showGrocery && (
                            <div className="mt-4">
                                <GroceryList items={plan.smart_grocery_list} />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                        <Button
                            onClick={handleNewPlan}
                            variant="outline"
                            className="flex-1 flex items-center justify-center gap-2 h-11"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Generate New Plan
                        </Button>
                        <Button
                            onClick={handleSavePlan}
                            disabled={saving || plan.isSaved}
                            className={`flex-1 flex items-center justify-center gap-2 font-bold h-11 ${plan.isSaved
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-default'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                        >
                            <Save className="w-4 h-4" />
                            {plan.isSaved ? 'Plan Saved!' : saving ? 'Saving...' : 'Save Plan'}
                        </Button>
                    </div>
                </main>

                {toast && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                )}
            </div>
        </ProtectedRoute>
    );
}