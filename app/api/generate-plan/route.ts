import { NextResponse } from 'next/server';
import { generateMealPlanWithAI } from '@/lib/gemini';
import { UserPreferences } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const preferences: UserPreferences = await request.json();

        // Validate required fields
        if (!preferences.ageGroup || !preferences.activityLevel) {
            return NextResponse.json(
                { error: 'Missing required preferences' },
                { status: 400 }
            );
        }

        // Call the dual-layer AI system
        const mealPlan = await generateMealPlanWithAI(preferences);

        return NextResponse.json(mealPlan);
    } catch (error: any) {
        console.error('Error generating meal plan:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to generate meal plan' },
            { status: 500 }
        );
    }
}
