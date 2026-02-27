import { NextResponse } from 'next/server';
import { generateWeeklyPlanWithAI } from '@/lib/weeklyPlanGenerator';
import { UserPreferences } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { seasonalRules, ...preferences } = body as UserPreferences & { seasonalRules?: string };

        // Validate required fields
        if (!preferences.ageGroup || !preferences.activityLevel) {
            return NextResponse.json(
                { status: 'error', message: 'Missing required preferences' },
                { status: 400 }
            );
        }

        // Call the weekly plan generator (Layer 1 + Layer 2)
        const weeklyPlan = await generateWeeklyPlanWithAI(preferences, seasonalRules);

        return NextResponse.json(weeklyPlan);
    } catch (error: any) {
        console.error('Error generating weekly meal plan:', error);
        return NextResponse.json(
            { status: 'error', message: error.message || 'Failed to generate weekly meal plan' },
            { status: 500 }
        );
    }
}
