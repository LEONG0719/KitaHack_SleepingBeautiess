'use client';

import { Meal } from '@/lib/types';
import { Clock, DollarSign, Flame, Repeat, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MealCardProps {
  meal: Meal;
  onSwap?: () => void;
  onSave?: () => void;
  isSwapping?: boolean;
}

export default function MealCard({
  meal,
  onSwap,
  onSave,
  isSwapping = false,
}: MealCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-1">{meal.name}</h3>
          <span className="inline-block px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
            {meal.cuisine}
          </span>
        </div>
        <div className="text-right">
          <div className="flex items-center text-emerald-600 font-bold text-lg">
            <DollarSign className="w-4 h-4" />
            <span>RM {meal.cost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
        <div className="flex items-center">
          <Flame className="w-4 h-4 mr-1 text-orange-500" />
          <span>
            {meal.caloriesMin}-{meal.caloriesMax} cal
          </span>
        </div>
        <div className="flex items-center">
          <Clock className="w-4 h-4 mr-1 text-blue-500" />
          <span>{meal.prepTime} min</span>
        </div>
      </div>

      <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-100">
        <p className="text-sm text-gray-700">
          <span className="font-semibold text-blue-700">Why this meal: </span>
          {meal.whyThisMeal}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-600">Protein</div>
          <div className="font-bold text-sm text-gray-900">{meal.protein}g</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-600">Carbs</div>
          <div className="font-bold text-sm text-gray-900">{meal.carbs}g</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-600">Fats</div>
          <div className="font-bold text-sm text-gray-900">{meal.fats}g</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-xs text-gray-600">Fiber</div>
          <div className="font-bold text-sm text-gray-900">{meal.fiber}g</div>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">
          Ingredients:
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {meal.ingredients.map((ingredient, index) => (
            <span
              key={index}
              className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {ingredient}
            </span>
          ))}
        </div>
      </div>

      {(onSwap || onSave) && (
        <div className="flex gap-2 pt-4 border-t border-gray-200">
          {onSwap && (
            <Button
              onClick={onSwap}
              disabled={isSwapping}
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Repeat className="w-4 h-4" />
              {isSwapping ? 'Swapping...' : 'Swap Meal'}
            </Button>
          )}
          {onSave && (
            <Button
              onClick={onSave}
              variant="default"
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              <Bookmark className="w-4 h-4" />
              Save
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
