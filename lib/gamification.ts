import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    increment,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getAuth } from 'firebase/auth';
import app from './firebase';

// ============================================================
// TYPES
// ============================================================

export type AvatarState = 'optimal' | 'neutral' | 'sluggish';

export type TierName =
    | 'Iron'
    | 'Bronze'
    | 'Silver'
    | 'Gold'
    | 'Platinum'
    | 'Diamond'
    | 'Ascendant'
    | 'Immortal'
    | 'Radiant';

export interface GamificationStats {
    nutricoin_balance: number;
    current_health_streak_days: number;
    avatar_state: AvatarState;
    weekly_money_saved_rm: number;
    weekly_suku_avg_score: number;
    weekly_suku_scan_count: number;
    total_scans: number;
    daily_scan_count: number;
    last_scan_date: string;
}

export interface UserProfile {
    display_name: string;
    email: string;
    campus: string;
    current_tier: TierName;
    gamification_stats: GamificationStats;
    last_updated: Timestamp | null;
}

export interface LeaderboardEntry {
    userId: string;
    display_name: string;
    campus: string;
    current_tier: TierName;
    value: number;
    avatar_state: AvatarState;
}

// ============================================================
// TIER SYSTEM
// ============================================================

const TIER_THRESHOLDS: { tier: TierName; minCoins: number }[] = [
    { tier: 'Radiant', minCoins: 5000 },
    { tier: 'Immortal', minCoins: 3500 },
    { tier: 'Ascendant', minCoins: 2500 },
    { tier: 'Diamond', minCoins: 1500 },
    { tier: 'Platinum', minCoins: 1000 },
    { tier: 'Gold', minCoins: 600 },
    { tier: 'Silver', minCoins: 300 },
    { tier: 'Bronze', minCoins: 100 },
    { tier: 'Iron', minCoins: 0 },
];

export function calculateTier(totalCoins: number): TierName {
    for (const { tier, minCoins } of TIER_THRESHOLDS) {
        if (totalCoins >= minCoins) return tier;
    }
    return 'Iron';
}

export function getTierColor(tier: TierName): string {
    const colors: Record<TierName, string> = {
        Iron: '#71717a',
        Bronze: '#b45309',
        Silver: '#6b7280',
        Gold: '#d97706',
        Platinum: '#0891b2',
        Diamond: '#7c3aed',
        Ascendant: '#dc2626',
        Immortal: '#be123c',
        Radiant: '#f59e0b',
    };
    return colors[tier];
}

// ============================================================
// NUTRICOIN REWARD RULES
// ============================================================

export const COIN_REWARDS = {
    MEAL_UNDER_BUDGET: 5,
    SUKU_SCORE_HIGH: 10,    // score >= 8
    SUKU_SCORE_MED: 5,     // score >= 5
    SUKU_SCAN_BASE: 1,      // any scan
    PANTRY_HERO: 15,
    SAVE_PLAN: 3,
};

export const MAX_DAILY_SCANS = 3;

// ============================================================
// USER PROFILE CRUD
// ============================================================

function getCurrentUserId(): string {
    const auth = getAuth(app);
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');
    return user.uid;
}

const DEFAULT_STATS: GamificationStats = {
    nutricoin_balance: 0,
    current_health_streak_days: 0,
    avatar_state: 'neutral',
    weekly_money_saved_rm: 0,
    weekly_suku_avg_score: 0,
    weekly_suku_scan_count: 0,
    total_scans: 0,
    daily_scan_count: 0,
    last_scan_date: '',
};

export async function getUserProfile(): Promise<UserProfile> {
    const userId = getCurrentUserId();
    const auth = getAuth(app);
    const user = auth.currentUser!;
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        return snap.data() as UserProfile;
    }

    // Create default profile
    const defaultProfile: UserProfile = {
        display_name: user.displayName || 'User',
        email: user.email || '',
        campus: '',
        current_tier: 'Iron',
        gamification_stats: { ...DEFAULT_STATS },
        last_updated: null,
    };

    await setDoc(ref, {
        ...defaultProfile,
        last_updated: serverTimestamp(),
    });

    return defaultProfile;
}

export async function updateCampus(campus: string): Promise<void> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
        campus,
        last_updated: serverTimestamp(),
    });
}

// ============================================================
// NUTRICOIN TRANSACTIONS
// ============================================================

export async function awardNutriCoins(
    amount: number,
    reason: string
): Promise<number> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);

    // Ensure profile exists
    await getUserProfile();

    await updateDoc(ref, {
        'gamification_stats.nutricoin_balance': increment(amount),
        last_updated: serverTimestamp(),
    });

    // Recalculate tier
    const profile = await getUserProfile();
    const newTier = calculateTier(profile.gamification_stats.nutricoin_balance);
    if (newTier !== profile.current_tier) {
        await updateDoc(ref, { current_tier: newTier });
    }

    return profile.gamification_stats.nutricoin_balance;
}

// ============================================================
// SUKU SCAN RATE LIMITING
// ============================================================

export async function canScanToday(): Promise<boolean> {
    const profile = await getUserProfile();
    const today = new Date().toISOString().split('T')[0];

    if (profile.gamification_stats.last_scan_date !== today) {
        return true; // New day, reset
    }

    return profile.gamification_stats.daily_scan_count < MAX_DAILY_SCANS;
}

export async function recordScan(sukuScore: number): Promise<number> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    const today = new Date().toISOString().split('T')[0];
    const profile = await getUserProfile();

    const isNewDay = profile.gamification_stats.last_scan_date !== today;
    const newDailyCount = isNewDay ? 1 : profile.gamification_stats.daily_scan_count + 1;

    // Calculate coins to award
    let coinsEarned = COIN_REWARDS.SUKU_SCAN_BASE;
    if (sukuScore >= 8) coinsEarned = COIN_REWARDS.SUKU_SCORE_HIGH;
    else if (sukuScore >= 5) coinsEarned = COIN_REWARDS.SUKU_SCORE_MED;

    // Only award coins if under daily limit
    if (newDailyCount <= MAX_DAILY_SCANS) {
        await updateDoc(ref, {
            'gamification_stats.nutricoin_balance': increment(coinsEarned),
            'gamification_stats.daily_scan_count': newDailyCount,
            'gamification_stats.last_scan_date': today,
            'gamification_stats.total_scans': increment(1),
            'gamification_stats.weekly_suku_scan_count': increment(1),
            last_updated: serverTimestamp(),
        });

        // Recalculate weekly average
        const updatedProfile = await getUserProfile();
        const scanCount = updatedProfile.gamification_stats.weekly_suku_scan_count;
        const currentAvg = updatedProfile.gamification_stats.weekly_suku_avg_score;
        const newAvg = scanCount === 1
            ? sukuScore
            : ((currentAvg * (scanCount - 1)) + sukuScore) / scanCount;

        await updateDoc(ref, {
            'gamification_stats.weekly_suku_avg_score': Math.round(newAvg * 10) / 10,
        });

        // Recalculate tier
        const finalProfile = await getUserProfile();
        const newTier = calculateTier(finalProfile.gamification_stats.nutricoin_balance);
        if (newTier !== finalProfile.current_tier) {
            await updateDoc(ref, { current_tier: newTier });
        }

        return coinsEarned;
    }

    return 0; // No coins (rate limited)
}

// ============================================================
// AVATAR STATE ENGINE
// ============================================================

export async function updateAvatarState(): Promise<AvatarState> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    const profile = await getUserProfile();
    const stats = profile.gamification_stats;

    let state: AvatarState = 'neutral';

    if (stats.current_health_streak_days >= 3 && stats.weekly_suku_avg_score >= 7) {
        state = 'optimal';
    } else if (stats.weekly_suku_avg_score < 4 || stats.current_health_streak_days === 0) {
        state = 'sluggish';
    }

    await updateDoc(ref, {
        'gamification_stats.avatar_state': state,
        last_updated: serverTimestamp(),
    });

    return state;
}

// ============================================================
// LEADERBOARD
// ============================================================

export async function getLeaderboard(
    campus: string,
    metric: 'weekly_money_saved_rm' | 'weekly_suku_avg_score'
): Promise<LeaderboardEntry[]> {
    let q;

    if (campus && campus !== 'all') {
        q = query(
            collection(db, 'users'),
            where('campus', '==', campus),
            limit(50)
        );
    } else {
        q = query(
            collection(db, 'users'),
            limit(50)
        );
    }

    const snapshot = await getDocs(q);

    const entries: LeaderboardEntry[] = snapshot.docs
        .map((docSnap) => {
            const data = docSnap.data() as UserProfile;
            return {
                userId: docSnap.id,
                display_name: data.display_name,
                campus: data.campus,
                current_tier: data.current_tier,
                value: data.gamification_stats?.[metric] || 0,
                avatar_state: data.gamification_stats?.avatar_state || 'neutral',
            };
        })
        .filter((e) => e.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 50);

    return entries;
}
