'use client';

import { WeeklySummary as WeeklySummaryType } from '@/lib/types';
import { DollarSign, UtensilsCrossed, ShoppingBag } from 'lucide-react';

interface WeeklySummaryProps {
    summary: WeeklySummaryType;
}

export default function WeeklySummary({ summary }: WeeklySummaryProps) {
    const totalMeals = summary.total_meals_cooked + summary.total_meals_bought;
    const cookPercent = totalMeals > 0 ? (summary.total_meals_cooked / totalMeals) * 100 : 0;

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Weekly Summary</h2>

            <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-emerald-700">
                        RM {summary.total_estimated_cost_rm.toFixed(0)}
                    </div>
                    <div className="text-xs text-gray-500">Total Cost</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <UtensilsCrossed className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-orange-700">
                        {summary.total_meals_cooked}
                    </div>
                    <div className="text-xs text-gray-500">Meals Cooked</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <ShoppingBag className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <div className="text-2xl font-bold text-blue-700">
                        {summary.total_meals_bought}
                    </div>
                    <div className="text-xs text-gray-500">Meals Bought</div>
                </div>
            </div>

            {/* Cook vs Buy bar */}
            <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Cook ({summary.total_meals_cooked})</span>
                    <span>Buy ({summary.total_meals_bought})</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-3 overflow-hidden">
                    <div
                        className="bg-orange-400 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${cookPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
