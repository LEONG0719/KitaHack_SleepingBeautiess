'use client';

import { useRef, useState } from 'react';
import { Meal, PoMVerificationResult } from '@/lib/types';
import { completeMealWithPoM } from '@/lib/gamification';
import {
    Clock, Flame, Repeat, CheckCircle2, Camera, Loader2, XCircle, RotateCcw,
    Coins, Wheat, Drumstick, Leaf, Lock, UtensilsCrossed, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MealCardProps {
    meal: Meal;
    onSwap?: () => void;
    onSave?: () => void;
    onLogMeal?: () => void;
    isSwapping?: boolean;
    isLogged?: boolean;
    targetCost?: number;
    scanType?: 'free' | 'planned';
    isGloballyLocked?: boolean; 
}

export default function MealCard({
    meal, onSwap, onSave, onLogMeal,
    isSwapping = false, isLogged = false, targetCost,
    scanType = 'planned', isGloballyLocked = false
}: MealCardProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [verifying, setVerifying] = useState(false);
    const [verifyError, setVerifyError] = useState<string | null>(null);
    const [pomResult, setPomResult] = useState<PoMVerificationResult | null>(null);
    const [coinsEarned, setCoinsEarned] = useState<number | null>(null);

    const isVerified = pomResult !== null;
    
    // 🔥 NEW: Check if this meal is meant to be cooked or bought
    const isCook = meal.mode === 'cook';

    const handlePhotoVerify = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

            const res = await fetch('/api/verify-meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64, mimeType: file.type || 'image/jpeg', planned_dish_name: meal.name }),
            });

            const data = await res.json();
            if (data.status === 'rejected' || data.status === 'error') {
                setVerifyError(data.message || 'Verification failed. Please try again.');
                return;
            }

            const result: PoMVerificationResult = data.data;
            if (!result.is_context_match) {
                setVerifyError(`This doesn't look like "${meal.name}". ${result.feedback_message}`);
                return;
            }

            setPomResult(result);

            try {
                const { coinsAwarded } = await completeMealWithPoM(result.suku_suku_score, scanType, meal.mealType);
                setCoinsEarned(coinsAwarded);
            } catch (coinErr: any) {
                setVerifyError(coinErr.message || 'Could not award coins.');
            }

            onLogMeal?.();
        } catch (err: any) {
            setVerifyError(err.message || 'Verification failed. Please try again.');
        } finally {
            setVerifying(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const getScoreColor = (score: number) => score >= 8 ? 'text-emerald-600' : score >= 5 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className={`bg-white rounded-xl border p-6 transition-all ${isLogged || isVerified ? 'border-emerald-500 bg-emerald-50/20' : 'border-gray-200 shadow-sm'}`}>
            <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 pr-4">
                    {meal.name}
                    {(isLogged || isVerified) && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                </h3>
                
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {/* 🔥 NEW: Cook / Buy Badge matches the Weekly Plan UI exactly! */}
                    <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isCook ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                        }`}
                    >
                        {isCook ? (
                            <><UtensilsCrossed className="w-3 h-3" /> Cook</>
                        ) : (
                            <><ShoppingBag className="w-3 h-3" /> Buy</>
                        )}
                    </span>
                    
                    <div className="text-emerald-600 font-bold text-lg flex items-center gap-1">RM {meal.cost.toFixed(2)}</div>
                    {targetCost && <div className="text-[11px] text-gray-400 font-medium mt-0.5 whitespace-nowrap">Target: RM {targetCost.toFixed(2)}</div>}
                </div>
            </div>

            <div className="mb-4"><span className="inline-block px-3 py-1 text-xs font-medium bg-emerald-100/70 text-emerald-800 rounded-md">{meal.cuisine}</span></div>

            <div className="flex items-center gap-6 text-sm text-gray-600 mb-5">
                <div className="flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /><span>{meal.caloriesMin}-{meal.caloriesMax} cal</span></div>
                <div className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-blue-500" /><span>{meal.prepTime} min</span></div>
            </div>

            <div className="mb-6 p-4 bg-[#f4f8fa] rounded-lg border border-blue-50/50">
                <p className="text-sm text-gray-700 leading-relaxed"><span className="font-semibold text-blue-900">Why this meal: </span>{meal.whyThisMeal}</p>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-6">
                {['Protein', 'Carbs', 'Fats', 'Fiber'].map(macro => (
                    <div key={macro} className="bg-gray-50/80 rounded-lg py-3 text-center">
                        <div className="text-[11px] text-gray-500 mb-1">{macro}</div>
                        <div className="font-bold text-sm text-gray-900">{(meal as any)[macro.toLowerCase()]}g</div>
                    </div>
                ))}
            </div>

            {/* 🔥 UPDATED: Only show ingredients if it's a "Cook" meal, otherwise show a helpful hint */}
            {isCook && meal.ingredients && meal.ingredients.length > 0 ? (
                <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Ingredients needed:</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {meal.ingredients.map((ingredient, index) => (
                            <span key={index} className="inline-block px-2.5 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-100 rounded-md">{ingredient}</span>
                        ))}
                    </div>
                </div>
            ) : !isCook && !isLogged && !isVerified ? (
                <div className="text-xs text-gray-400 italic mb-6">
                    💡 Available at campus cafeterias, Mamak stalls, or Kopitiams
                </div>
            ) : null}

            {pomResult && (
                <div className="mb-4 space-y-3 p-4 bg-emerald-50/50 rounded-lg border border-emerald-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-12 h-12 rounded-full border-2 flex flex-col items-center justify-center bg-white shadow-sm ${getScoreColor(pomResult.suku_suku_score).replace('text', 'border')}`}>
                                <p className={`text-lg font-black leading-none ${getScoreColor(pomResult.suku_suku_score)}`}>{pomResult.suku_suku_score}</p>
                                <p className="text-[7px] text-gray-400 font-bold uppercase">Score</p>
                            </div>
                            <div>
                                <p className="text-sm font-bold text-gray-900">Suku-Suku Verified</p>
                                <p className="text-xs text-gray-500">{pomResult.detected_items.join(', ')}</p>
                            </div>
                        </div>
                        {coinsEarned !== null && coinsEarned > 0 && (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                                <Coins className="w-4 h-4 text-amber-600" />
                                <span className="text-sm font-bold text-amber-700">+{coinsEarned}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm text-emerald-800 leading-relaxed">💡 {pomResult.feedback_message}</p>
                </div>
            )}

            {verifyError && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm text-red-700">{verifyError}</p>
                        <button onClick={() => { setVerifyError(null); fileInputRef.current?.click(); }} className="text-xs text-red-600 font-semibold mt-1 hover:underline flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Retake Photo
                        </button>
                    </div>
                </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoVerify} className="hidden" />

            <div className="pt-5 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                {onSwap && !isLogged && !isVerified && !isGloballyLocked && (
                    <Button onClick={onSwap} disabled={isSwapping} variant="outline" className="flex-1 flex items-center justify-center gap-2 h-10">
                        <Repeat className="w-4 h-4" /> {isSwapping ? 'Swapping...' : 'Swap Meal'}
                    </Button>
                )}

                {isGloballyLocked ? (
                    <Button disabled className="flex-1 flex items-center justify-center gap-2 font-bold h-10 bg-gray-100 text-gray-500 cursor-not-allowed border-none shadow-none">
                        <Lock className="w-4 h-4" /> Already Logged Today
                    </Button>
                ) : (!isLogged && !isVerified) ? (
                    <Button onClick={() => fileInputRef.current?.click()} disabled={verifying} className="flex-1 flex items-center justify-center gap-2 font-bold transition-colors h-10 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                        {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><Camera className="w-4 h-4" /> Complete Meal — Snap 📸</>}
                    </Button>
                ) : null}

                {(isLogged || isVerified) && (
                    <Button disabled className="flex-1 flex items-center justify-center gap-2 font-bold h-10 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 cursor-default border-none shadow-none">
                        <CheckCircle2 className="w-4 h-4" /> Meal Verified & Counted!
                    </Button>
                )}
            </div>
        </div>
    );
}