'use client';

import { GroceryItem } from '@/lib/types';
import { ShoppingCart, Apple, Drumstick, Package, Milk } from 'lucide-react';

interface GroceryListProps {
    items: GroceryItem[];
}

const categoryIcons: Record<string, React.ReactNode> = {
    Produce: <Apple className="w-4 h-4 text-green-600" />,
    Protein: <Drumstick className="w-4 h-4 text-red-600" />,
    Pantry: <Package className="w-4 h-4 text-amber-600" />,
    Dairy: <Milk className="w-4 h-4 text-blue-600" />,
};

const categoryColors: Record<string, string> = {
    Produce: 'bg-green-50 border-green-200',
    Protein: 'bg-red-50 border-red-200',
    Pantry: 'bg-amber-50 border-amber-200',
    Dairy: 'bg-blue-50 border-blue-200',
};

export default function GroceryList({ items }: GroceryListProps) {
    // Group by category
    const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
        const cat = item.category || 'Pantry';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const totalCost = items.reduce((sum, item) => sum + item.estimated_total_price_rm, 0);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl font-bold text-gray-900">Smart Grocery List</h2>
            </div>

            <div className="space-y-6">
                {Object.entries(grouped).map(([category, categoryItems]) => (
                    <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                            {categoryIcons[category] || <Package className="w-4 h-4 text-gray-500" />}
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                                {category}
                            </h3>
                            <span className="text-xs text-gray-400">({categoryItems.length} items)</span>
                        </div>

                        <div className="space-y-2">
                            {categoryItems.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${categoryColors[category] || 'bg-gray-50 border-gray-200'}`}
                                >
                                    <div className="flex-1">
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.item_name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {item.total_quantity} · Used in: {item.used_in_meals.join(', ')}
                                        </div>
                                    </div>
                                    <div className="text-sm font-bold text-emerald-700 ml-4">
                                        RM {item.estimated_total_price_rm.toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Total */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
                <span className="text-base font-bold text-gray-900">Total Grocery Cost</span>
                <span className="text-xl font-bold text-emerald-600">RM {totalCost.toFixed(2)}</span>
            </div>
        </div>
    );
}
