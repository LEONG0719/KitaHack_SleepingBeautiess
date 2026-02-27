'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Stepper from '@/components/Stepper';
import MealCard from '@/components/MealCard';
import GroceryList from '@/components/GroceryList'; // 🔥 ADDED
import Toast from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { MealPlan, Meal } from '@/lib/types';
import { saveMealPlanToFirestore } from '@/lib/firestore';
import { getUserProfile } from '@/lib/gamification'; 
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/AuthContext';
import { Flame, DollarSign, Calendar, ShoppingCart, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'; // 🔥 ADDED Chevrons

export default function ResultPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [plan, setPlan] = useState<MealPlan | null>(null);
    const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
    
    const [isSavingPlan, setIsSavingPlan] = useState(false);
    const [isPlanSaved, setIsPlanSaved] = useState(false);
    
    // 🔥 NEW: Toggle state for grocery list
    const [showGrocery, setShowGrocery] = useState(false);

    // Global Lock state
    const [globalLocks, setGlobalLocks] = useState({ breakfast: false, lunch: false, dinner: false });
    
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; } | null>(null);

    useEffect(() => {
        const planStr = localStorage.getItem('currentPlan');
        if (!planStr) {
            router.push('/plan');
            return;
        }

        const loadedPlan: MealPlan = JSON.parse(planStr);
        setPlan(loadedPlan);
        if (loadedPlan.isSaved || loadedPlan.id?.length > 20) setIsPlanSaved(true);

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

    const handleLogMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner', mealCost: number) => {
        if (!plan || !user) return;
        try {
            const maxBudget = plan.preferences.budgetPerMeal;
            let rmSaved = Math.max(0, maxBudget - mealCost);

            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 'gamification_stats.weekly_money_saved_rm': increment(rmSaved) });

            setGlobalLocks(prev => ({ ...prev, [mealType]: true }));
            
            setToast({ message: `Awesome! RM ${rmSaved.toFixed(2)} saved, and your Buddy is healed! 🐾`, type: 'success' });
        } catch (error) {
            console.error(error);
            setToast({ message: 'Failed to save stats.', type: 'error' });
        }
    };

    const handleSwapMeal = async (mealType: 'breakfast' | 'lunch' | 'dinner', currentMeal: Meal) => {
        if (!plan) return;
        setSwappingMeal(mealType);
        try {
            const response = await fetch('/api/swap-meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentMeal, preferences: plan.preferences }),
            });
            if (!response.ok) throw new Error('Failed to swap meal');

            const newMeal: Meal = await response.json();
            const updatedPlan = { ...plan, [mealType]: newMeal, totalCost: (mealType === 'breakfast' ? newMeal.cost : plan.breakfast.cost) + (mealType === 'lunch' ? newMeal.cost : plan.lunch.cost) + (mealType === 'dinner' ? newMeal.cost : plan.dinner.cost) };

            setPlan(updatedPlan as any);
            localStorage.setItem('currentPlan', JSON.stringify(updatedPlan));
            setToast({ message: 'Meal swapped successfully!', type: 'success' });
        } catch (error) {
            setToast({ message: 'Failed to swap meal.', type: 'error' });
        } finally {
            setSwappingMeal(null);
        }
    };

    const handleSavePlan = async () => {
        if (!plan || isPlanSaved || isSavingPlan) return;
        setIsSavingPlan(true);
        try {
            const planToSave = { ...plan, isSaved: true };
            await saveMealPlanToFirestore(planToSave);
            setIsPlanSaved(true);
            setPlan(planToSave);
            localStorage.setItem('currentPlan', JSON.stringify(planToSave));
            setToast({ message: 'Meal plan saved! Redirecting...', type: 'success' });
            setTimeout(() => router.push('/saved'), 1500);
        } catch (error) {
            setToast({ message: 'Failed to save plan. Please try again.', type: 'error' });
            setIsSavingPlan(false);
        }
    };

    const handleNewPlan = () => { localStorage.removeItem('currentPlan'); router.push('/plan'); };

    if (!plan) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>;

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-[#fafafa] pb-20">
                <Navbar />
                <Stepper currentStep={3} steps={['Preferences', 'Loading', 'Results']} />

                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="mb-8 mt-4">
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                            Your Personalized Meal Plan
                        </h1>
                        <p className="text-gray-600 text-lg">
                            A balanced daily plan tailored to your preferences
                        </p>
                    </div>

                    {/* Top 3 Stats Cards */}
                    <div className="grid md:grid-cols-3 gap-5 mb-10">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-3">
                                <DollarSign className="w-5 h-5 text-emerald-600" />
                                <span className="text-sm text-gray-600 font-medium">Total Daily Cost</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 mb-1">RM {plan.totalCost.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">Within your budget of RM {plan.preferences.budgetPerMeal * 3}</p>
                        </div>
                        
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-3">
                                <Flame className="w-5 h-5 text-orange-500" />
                                <span className="text-sm text-gray-600 font-medium">Calorie Range</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 mb-1">{plan.totalCaloriesMin}-{plan.totalCaloriesMax}</p>
                            <p className="text-xs text-gray-500">Approximate daily range</p>
                        </div>
                        
                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col justify-center">
                            <div className="flex items-center gap-2 mb-3">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <span className="text-sm text-gray-600 font-medium">Date</span>
                            </div>
                            <p className="text-3xl font-bold text-gray-900 mb-1">Today</p>
                            <p className="text-xs text-gray-500">
                                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                        </div>
                    </div>

                    {/* Meals List */}
                    <div className="space-y-8 mb-8">
                        <div>
                            <div className="flex items-center gap-3 mb-4 pl-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-yellow-100 to-orange-100 shadow-sm border border-orange-100/50"><span className="text-lg leading-none">🌅</span></div>
                                <h2 className="text-2xl font-bold text-gray-900">Breakfast</h2>
                            </div>
                            <MealCard 
                                meal={{...plan.breakfast, mealType: 'breakfast'}} 
                                targetCost={plan.preferences.budgetPerMeal} 
                                onSwap={() => handleSwapMeal('breakfast', plan.breakfast)} 
                                onLogMeal={() => handleLogMeal('breakfast', plan.breakfast.cost)} 
                                isSwapping={swappingMeal === 'breakfast'} 
                                scanType="planned"
                                isGloballyLocked={globalLocks.breakfast} 
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-4 pl-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-orange-100 to-amber-100 shadow-sm border border-amber-100/50"><span className="text-lg leading-none">☀️</span></div>
                                <h2 className="text-2xl font-bold text-gray-900">Lunch</h2>
                            </div>
                            <MealCard 
                                meal={{...plan.lunch, mealType: 'lunch'}} 
                                targetCost={plan.preferences.budgetPerMeal} 
                                onSwap={() => handleSwapMeal('lunch', plan.lunch)} 
                                onLogMeal={() => handleLogMeal('lunch', plan.lunch.cost)} 
                                isSwapping={swappingMeal === 'lunch'} 
                                scanType="planned"
                                isGloballyLocked={globalLocks.lunch}
                            />
                        </div>

                        <div>
                            <div className="flex items-center gap-3 mb-4 pl-1">
                                <div className="w-8 h-8 flex items-center justify-center rounded-md bg-gradient-to-br from-indigo-100 to-purple-100 shadow-sm border border-indigo-100/50"><span className="text-lg leading-none">🌙</span></div>
                                <h2 className="text-2xl font-bold text-gray-900">Dinner</h2>
                            </div>
                            <MealCard 
                                meal={{...plan.dinner, mealType: 'dinner'}} 
                                targetCost={plan.preferences.budgetPerMeal} 
                                onSwap={() => handleSwapMeal('dinner', plan.dinner)} 
                                onLogMeal={() => handleLogMeal('dinner', plan.dinner.cost)} 
                                isSwapping={swappingMeal === 'dinner'} 
                                scanType="planned"
                                isGloballyLocked={globalLocks.dinner} 
                            />
                        </div>
                    </div>

                    {/* 🔥 NEW: Smart Grocery List Accordion */}
                    {plan.smart_grocery_list && plan.smart_grocery_list.length > 0 && (
                        <div className="mb-8">
                            <button
                                onClick={() => setShowGrocery(!showGrocery)}
                                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:bg-gray-50 transition-all"
                            >
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-5 h-5 text-emerald-600" />
                                    <span className="font-bold text-gray-900">Smart Grocery List</span>
                                    <span className="text-xs text-gray-500">
                                        ({plan.smart_grocery_list.length} items for today)
                                    </span>
                                </div>
                                {showGrocery ? (
                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                )}
                            </button>

                            {showGrocery && (
                                <div className="mt-4">
                                    <GroceryList items={plan.smart_grocery_list} />
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                        <Button onClick={handleNewPlan} variant="outline" className="flex-1 flex items-center justify-center gap-2 h-11">
                            <RefreshCw className="w-4 h-4 text-gray-500" /> Generate New Plan
                        </Button>
                        <Button 
                            onClick={handleSavePlan} 
                            disabled={isSavingPlan || isPlanSaved} 
                            className={`flex-1 flex items-center justify-center gap-2 font-bold h-11 ${
                                isPlanSaved ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-default' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            }`}
                        >
                            <Save className="w-4 h-4" /> 
                            {isPlanSaved ? 'Plan Saved!' : isSavingPlan ? 'Saving...' : 'Save Plan'}
                        </Button>
                    </div>

                </main>
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </div>
        </ProtectedRoute>
    );
}