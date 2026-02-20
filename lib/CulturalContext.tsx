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

    const handleSetMode = (mode: SeasonalMode) => {
        setSeasonalMode(mode);
        localStorage.setItem('nutribalance_seasonal_mode', mode);
    };

    const getSeasonalPromptRules = (): string => {
        switch (seasonalMode) {
            case 'ramadan':
                return `
RAMADAN MODE ACTIVE — STRICT RULES:
- This user is fasting during Ramadan.
- Generate ONLY 2 meals: Suhoor (pre-dawn) and Iftar (breaking fast at sunset).
- Suhoor must prioritize: slow-release energy (oats, whole grains), hydration (watermelon, coconut water), and high protein.
- Iftar must prioritize: dates (kurma), hydration first, then balanced nutrients. Avoid excessive sugar and fried food.
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
