'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// ============================================================
// TYPES
// ============================================================

export type SeasonalMode = 'normal' | 'ramadan' | 'festive';

interface CulturalContextType {
    seasonalMode: SeasonalMode;
    setSeasonalMode: (mode: SeasonalMode) => void;
    getSeasonalPromptRules: () => string;
}

// ============================================================
// CONTEXT
// ============================================================

const CulturalContext = createContext<CulturalContextType>({
    seasonalMode: 'normal',
    setSeasonalMode: () => { },
    getSeasonalPromptRules: () => '',
});

export function CulturalProvider({ children }: { children: ReactNode }) {
    const [seasonalMode, setSeasonalMode] = useState<SeasonalMode>('normal');

    // Persist to localStorage
    useEffect(() => {
        const saved = localStorage.getItem('nutribalance_seasonal_mode') as SeasonalMode | null;
        if (saved && ['normal', 'ramadan', 'festive'].includes(saved)) {
            setSeasonalMode(saved);
        }
    }, []);

    const getRulesForMode = (mode: SeasonalMode): string => {
        switch (mode) {
            case 'ramadan':
                return `
RAMADAN MODE ACTIVE — STRICT RULES:
- This user is fasting during Ramadan.
- You MUST still return the standard 3-key JSON structure (breakfast, lunch, dinner), but adapt the content:
  * "breakfast" = Suhoor (pre-dawn meal). Prioritize slow-release energy (oats, whole grains), hydration (watermelon, coconut water), and high protein.
  * "lunch" = Fasting period. Set name to "Fasting Period 🤲", set all numeric values (caloriesMin, caloriesMax, cost, prepTime, protein, carbs, fats, fiber) to 0, set cuisine to "Ramadan", whyThisMeal to "During Ramadan, Muslims fast from dawn to sunset. Stay hydrated during non-fasting hours.", and ingredients to an empty array [].
  * "dinner" = Iftar (breaking fast at sunset). Prioritize dates (kurma), hydration first, then balanced nutrients. Avoid excessive sugar and fried food.
- Suggest affordable Bazaar Ramadan options where applicable (kuih, bubur lambuk, etc.).
- Calorie distribution: ~40% Suhoor, ~60% Iftar.
- Include hydration reminders in "whyThisMeal" fields.
`;
            case 'festive':
                return `
FESTIVE SEASON MODE ACTIVE:
- The user is navigating a festive period (Hari Raya, Chinese New Year, Deepavali, or Christmas).
- Acknowledge festive foods but suggest balanced portions.
- Include ONE indulgence meal (e.g., rendang, lemang, kuih) and balance the other meals with lighter options.
- Add tips in "whyThisMeal" about portion control during festivities.
- Budget can be slightly relaxed (+RM 2) for festive dishes.
`;
            default:
                return '';
        }
    };

    const handleSetMode = (mode: SeasonalMode) => {
        setSeasonalMode(mode);
        localStorage.setItem('nutribalance_seasonal_mode', mode);
        // Also persist the computed rules so non-React code (loading page) can read them
        const rules = getRulesForMode(mode);
        if (rules) {
            localStorage.setItem('nutribalance_seasonal_rules', rules);
        } else {
            localStorage.removeItem('nutribalance_seasonal_rules');
        }
    };

    // Also sync rules on initial load
    useEffect(() => {
        const rules = getRulesForMode(seasonalMode);
        if (rules) {
            localStorage.setItem('nutribalance_seasonal_rules', rules);
        } else {
            localStorage.removeItem('nutribalance_seasonal_rules');
        }
    }, [seasonalMode]);

    const getSeasonalPromptRules = (): string => {
        return getRulesForMode(seasonalMode);
    };

    return (
        <CulturalContext.Provider
            value={{
                seasonalMode,
                setSeasonalMode: handleSetMode,
                getSeasonalPromptRules,
            }}
        >
            {children}
        </CulturalContext.Provider>
    );
}

export function useCultural() {
    return useContext(CulturalContext);
}
