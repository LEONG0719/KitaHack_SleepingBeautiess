import { NextResponse } from 'next/server';
import { swapMealWithAI } from '@/lib/gemini';
import { Meal, UserPreferences } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { currentMeal, preferences, seasonalRules }: { currentMeal: Meal; preferences: UserPreferences; seasonalRules?: string } = body;

        if (!currentMeal || !preferences) {
            return NextResponse.json(
                { error: 'Missing currentMeal or preferences' },
                { status: 400 }
            );
        }

        // Call the dual-layer AI system for a swap
        const newMeal = await swapMealWithAI(currentMeal, preferences, seasonalRules);

        return NextResponse.json(newMeal);
    } catch (error: any) {
        console.error('Error swapping meal:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to swap meal' },
            { status: 500 }
        );
    }
}
