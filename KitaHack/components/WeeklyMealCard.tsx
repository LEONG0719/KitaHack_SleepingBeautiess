'use client';

import { useRef, useState } from 'react';
import { WeeklyMeal, PoMVerificationResult } from '@/lib/types';
import { completeMealWithPoM } from '@/lib/gamification';
import {
    Flame, UtensilsCrossed, ShoppingBag, Camera, Loader2,
    CheckCircle2, XCircle, RotateCcw, Coins, Wheat, Drumstick, Leaf, Lock // 🔥 Added Lock icon
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeeklyMealCardProps {
    meal: WeeklyMeal;
    dayIndex: number;
    mealIndex: number;
    onMealCompleted?: (dayIndex: number, mealIndex: number, result: PoMVerificationResult) => void;
    isGloballyLocked?: boolean; // 🔥 Added Lock prop
}

export default function WeeklyMealCard({ meal, dayIndex, mealIndex, onMealCompleted, isGloballyLocked = false }: WeeklyMealCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [localResult, setLocalResult] = useState<PoMVerificationResult | null>(
        meal.verification_result || null
    );
    const [coinsEarned, setCoinsEarned] = useState<number | null>(null);

    const isCook = meal.mode === 'cook';
    const isCompleted = meal.status === 'completed' || localResult !== null;

    const mealTypeLabels: Record<string, string> = {
        breakfast: '🌅 Breakfast',
        lunch: '☀️ Lunch',
        dinner: '🌙 Dinner',
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setVerifyError('Please select an image file');
            return;
        }

        setVerifying(true);
        setVerifyError(null);

        try {
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve((reader.result as string).split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const mimeType = file.type || 'image/jpeg';

            const res = await fetch('/api/verify-meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mimeType, planned_dish_name: meal.dish_name }),
            });

            const data = await res.json();
            if (data.status === 'rejected') {
                setVerifyError(data.message || 'Photo rejected. Please try again with a real meal photo.');
                return;
            }
            if (data.status === 'error') {
                setVerifyError(data.message || 'Verification failed. Please try again.');
                return;
            }

            const pomResult: PoMVerificationResult = data.data;
            
            if (pomResult.is_valid_food && pomResult.is_context_match) {
                setLocalResult(pomResult);
                
                try {
                    // 🔥 ROUTE TO PLANNED ECONOMY with specific meal type
                    const { coinsAwarded } = await completeMealWithPoM(pomResult.suku_suku_score, 'planned', meal.meal_type);
                    setCoinsEarned(coinsAwarded);
                } catch (coinErr: any) {
                    console.warn('Could not award coins:', coinErr);
                    setVerifyError(coinErr.message || "Failed to award coins.");
                }
                onMealCompleted?.(dayIndex, mealIndex, pomResult);
                
            } else if (!pomResult.is_context_match) {
                setVerifyError(`This doesn't look like "${meal.dish_name}". ${pomResult.feedback_message || 'Please retake the photo with the correct meal.'}`);
                setLocalResult(null);
            }
        } catch (err: any) {
            setVerifyError(err.message || 'Verification failed. Please try again.');
        } finally {
            setVerifying(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getScoreColor = (score: number) => score >= 8 ? 'text-emerald-600' : score >= 5 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className={`bg-white rounded-xl border shadow-sm p-6 transition-all hover:shadow-md ${isCompleted ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
                <div>
                    <div className="text-xs text-gray-500 font-medium mb-1">
                        {mealTypeLabels[meal.meal_type] || meal.meal_type}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{meal.dish_name}</h3>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        {isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                <CheckCircle2 className="w-3 h-3" /> Verified
                            </span>
                        )}
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isCook ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isCook ? <><UtensilsCrossed className="w-3 h-3" /> Cook</> : <><ShoppingBag className="w-3 h-3" /> Buy</>}
                        </span>
                    </div>
                    <div className="text-emerald-600 font-bold text-lg">RM {meal.estimated_cost_rm.toFixed(2)}</div>
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /><span>{meal.calories} cal</span></div>
                {meal.protein !== undefined && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">P: {meal.protein}g</span>}
                {meal.carbs !== undefined && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">C: {meal.carbs}g</span>}
                {meal.fiber !== undefined && <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">F: {meal.fiber}g</span>}
            </div>

            <div className="mb-4 p-3 bg-[#f4f8fa] rounded-lg border border-blue-50/50">
                <p className="text-sm text-gray-700 leading-relaxed"><span className="font-semibold text-blue-900">SDG 3 Impact: </span>{meal.health_reason}</p>
            </div>

            {isCook && meal.ingredients.length > 0 && (
                <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Ingredients:</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {meal.ingredients.map((ing, idx) => (
                            <span key={idx} className="inline-block px-2.5 py-1 text-xs bg-orange-50 text-orange-700 rounded-md border border-orange-100">
                                {ing.item_name} ({ing.quantity})
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {!isCook && !isCompleted && (
                <div className="text-xs text-gray-400 italic mb-4">💡 Available at campus cafeterias, Mamak stalls, or Kopitiams</div>
            )}

            {localResult && isCompleted && (
                <div className="mt-4 space-y-3 pt-4 border-t border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-14 h-14 rounded-full border-3 flex flex-col items-center justify-center bg-white shadow-sm ${getScoreColor(localResult.suku_suku_score).replace('text', 'border')}`}>
                                <p className={`text-xl font-black leading-none ${getScoreColor(localResult.suku_suku_score)}`}>{localResult.suku_suku_score}</p>
                                <p className="text-[8px] text-gray-400 font-bold uppercase">Score</p>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Suku-Suku Score</p>
                                <p className="text-xs text-gray-500">{localResult.detected_items.join(', ')}</p>
                            </div>
                        </div>
                        {coinsEarned !== null && coinsEarned > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                                <Coins className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-bold text-amber-700">+{coinsEarned}</span>
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                        {['carbs', 'protein', 'fiber'].map(macro => {
                            const value = (localResult as any)[`${macro}_pct`];
                            return (
                                <div key={macro} className="text-center">
                                    <div className="flex items-center justify-center gap-1 mb-1">
                                        {macro === 'carbs' && <Wheat className="w-3 h-3 text-amber-600" />}
                                        {macro === 'protein' && <Drumstick className="w-3 h-3 text-red-600" />}
                                        {macro === 'fiber' && <Leaf className="w-3 h-3 text-emerald-600" />}
                                        <span className={`text-xs font-bold text-${macro === 'carbs' ? 'amber' : macro === 'protein' ? 'red' : 'emerald'}-700`}>{value}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className={`h-1.5 rounded-full bg-${macro === 'carbs' ? 'amber' : macro === 'protein' ? 'red' : 'emerald'}-500`} style={{ width: `${Math.min(value, 100)}%` }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        <p className="text-sm text-emerald-800 leading-relaxed">💡 {localResult.feedback_message}</p>
                    </div>
                </div>
            )}

            {verifyError && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-red-700">{verifyError}</p>
                        <button onClick={() => { setVerifyError(null); fileInputRef.current?.click(); }} className="text-xs text-red-600 font-semibold mt-1 hover:underline flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Retake Photo
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                
                {/* 🔥 THE NEW LOCK LOGIC */}
                {isCompleted ? (
                    <Button disabled className="w-full bg-emerald-100 text-emerald-700 flex items-center justify-center gap-2 hover:bg-emerald-100 cursor-default shadow-none">
                        <CheckCircle2 className="w-4 h-4" /> Meal Verified & Counted
                    </Button>
                ) : isGloballyLocked ? (
                    <Button disabled className="w-full bg-gray-100 text-gray-500 flex items-center justify-center gap-2 cursor-not-allowed shadow-none border-none">
                        <Lock className="w-4 h-4" /> Already Logged Today
                    </Button>
                ) : (
                    <>
                        <Button onClick={() => fileInputRef.current?.click()} disabled={verifying} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2">
                            {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying your meal...</> : <><Camera className="w-4 h-4" /> Complete Meal — Snap Photo</>}
                        </Button>
                        <p className="text-[11px] text-gray-400 text-center mt-1.5">📸 Show us your plate to claim NutriCoins!</p>
                    </>
                )}
            </div>
        </div>
    );
}