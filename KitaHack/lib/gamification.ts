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
    vitality: number;
    // 🔥 NEW
    planned_meals_logged_today: { breakfast: boolean; lunch: boolean; dinner: boolean };
    planned_meals_last_date: string;
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
    state?: string;
    current_tier: TierName;
    avatar_state: AvatarState;
    streak: number;      
    totalScans: number;
    nutricoins: number;
    suku_avg: number;
    suku_points: number; // Computed metric
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
    vitality: 50,
    // 🔥 NEW
    planned_meals_logged_today: { breakfast: false, lunch: false, dinner: false },
    planned_meals_last_date: '',
};

export async function getUserProfile(): Promise<UserProfile> {
    const userId = getCurrentUserId();
    const auth = getAuth(app);
    const user = auth.currentUser!;
    const ref = doc(db, 'users', userId);
    const snap = await getDoc(ref);

    if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Ensure old users get the new vitality field
        if (data.gamification_stats.vitality === undefined) {
            data.gamification_stats.vitality = 50;
        }
        return data;
    }

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
// SUKU SCAN LOGIC (Healing the Buddy!)
// ============================================================

export async function canScanToday(): Promise<boolean> {
    const profile = await getUserProfile();
    const today = new Date().toISOString().split('T')[0];

    if (profile.gamification_stats.last_scan_date !== today) {
        return true; 
    }
    return profile.gamification_stats.daily_scan_count < MAX_DAILY_SCANS;
}

export async function recordScan(sukuScore: number): Promise<number> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    
    // 🔥 THIS IS THE LINE THAT FIXES THE ERROR
    const profile = await getUserProfile();
    
    const lastScanStr = profile.gamification_stats.last_scan_date;
    
    const isNewDay = lastScanStr !== todayStr;
    const newDailyCount = isNewDay ? 1 : profile.gamification_stats.daily_scan_count + 1;

    // 1. Streak Math (ALWAYS update if it's a valid new day scan)
    let newStreak = profile.gamification_stats.current_health_streak_days;
    if (isNewDay) {
        if (!lastScanStr) {
            newStreak = 1; 
        } else {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            if (lastScanStr === yesterdayStr) {
                newStreak += 1; 
            } else {
                newStreak = 1; 
            }
        }
    }

    // 2. Vitality Math (Healing - ALWAYS heal when they eat healthy!)
    const currentVitality = profile.gamification_stats.vitality ?? 50;
    let vitalityGain = 10; 
    if (sukuScore >= 8) vitalityGain = 25; 
    else if (sukuScore >= 5) vitalityGain = 15;
    const newVitality = Math.min(100, currentVitality + vitalityGain);

    // 3. Coin Math (Capped at MAX_DAILY_SCANS)
    let coinsEarned = 0;
    
    // Only award coins if this is their 1st, 2nd, or 3rd SUCCESSFUL scan today
    if (newDailyCount <= MAX_DAILY_SCANS) {
        coinsEarned = COIN_REWARDS.SUKU_SCAN_BASE;
        if (sukuScore >= 8) coinsEarned = COIN_REWARDS.SUKU_SCORE_HIGH;
        else if (sukuScore >= 5) coinsEarned = COIN_REWARDS.SUKU_SCORE_MED;

        // 🔥 Apply 2x Multiplier if Avatar is Optimal!
        if (profile.gamification_stats.avatar_state === 'optimal') {
            coinsEarned *= 2;
        }
    }

    // 4. Update the Database
    await updateDoc(ref, {
        'gamification_stats.nutricoin_balance': increment(coinsEarned),
        'gamification_stats.daily_scan_count': newDailyCount,
        'gamification_stats.last_scan_date': todayStr,
        'gamification_stats.total_scans': increment(1),
        'gamification_stats.weekly_suku_scan_count': increment(1),
        'gamification_stats.current_health_streak_days': newStreak,
        'gamification_stats.vitality': newVitality, 
        last_updated: serverTimestamp(),
    });

    // 5. Update weekly average score (for the leaderboard)
    const updatedProfile = await getUserProfile();
    const scanCount = updatedProfile.gamification_stats.weekly_suku_scan_count;
    const currentAvg = updatedProfile.gamification_stats.weekly_suku_avg_score;
    const newAvg = scanCount === 1 ? sukuScore : ((currentAvg * (scanCount - 1)) + sukuScore) / scanCount;
    
    await updateDoc(ref, { 'gamification_stats.weekly_suku_avg_score': Math.round(newAvg * 10) / 10 });

    // 6. Recalculate tier
    const finalProfile = await getUserProfile();
    const newTier = calculateTier(finalProfile.gamification_stats.nutricoin_balance);
    if (newTier !== finalProfile.current_tier) {
        await updateDoc(ref, { current_tier: newTier });
    }

    return coinsEarned;
}

// ============================================================
// AVATAR STATE ENGINE (Tied directly to Vitality now!)
// ============================================================

export async function updateAvatarState(): Promise<AvatarState> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    const profile = await getUserProfile();
    const vitality = profile.gamification_stats.vitality ?? 50;

    let state: AvatarState = 'neutral';
    if (vitality >= 70) state = 'optimal';
    else if (vitality < 40) state = 'sluggish';

    await updateDoc(ref, {
        'gamification_stats.avatar_state': state,
        last_updated: serverTimestamp(),
    });

    return state;
}

// ============================================================
// PROOF OF MEAL (PoM) ORCHESTRATOR
// ============================================================

export async function completeMealWithPoM(
    sukuScore: number,
    scanType: 'free' | 'planned',
    mealType?: 'breakfast' | 'lunch' | 'dinner'
): Promise<{ coinsAwarded: number; newAvatarState: AvatarState }> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    const profile = await getUserProfile();
    
    const today = new Date();
    const todayStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

    // --- 1. SHARED STREAK & VITALITY MATH ---
    const lastScanStr = profile.gamification_stats.last_scan_date;
    const isNewDay = lastScanStr !== todayStr;
    
    let newStreak = profile.gamification_stats.current_health_streak_days;
    if (isNewDay) {
        if (!lastScanStr) newStreak = 1;
        else {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = new Date(yesterday.getTime() - (yesterday.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            newStreak = (lastScanStr === yesterdayStr) ? newStreak + 1 : 1;
        }
    }

    const currentVitality = profile.gamification_stats.vitality ?? 50;
    let vitalityGain = 10; 
    if (sukuScore >= 8) vitalityGain = 25; 
    else if (sukuScore >= 5) vitalityGain = 15;
    const newVitality = Math.min(100, currentVitality + vitalityGain);

    // Prepare universal DB updates
    let updates: any = {
        'gamification_stats.vitality': newVitality,
        'gamification_stats.current_health_streak_days': newStreak,
        'gamification_stats.last_scan_date': todayStr,
        last_updated: serverTimestamp()
    };
    let coinsEarned = 0;

    // --- 2. ROUTE A: FREE SCANNER ECONOMY ---
    if (scanType === 'free') {
        const newDailyCount = isNewDay ? 1 : (profile.gamification_stats.daily_scan_count || 0) + 1;
        
        if (newDailyCount <= MAX_DAILY_SCANS) {
            coinsEarned = COIN_REWARDS.SUKU_SCAN_BASE;
            if (sukuScore >= 8) coinsEarned = COIN_REWARDS.SUKU_SCORE_HIGH;
            else if (sukuScore >= 5) coinsEarned = COIN_REWARDS.SUKU_SCORE_MED;
            if (profile.gamification_stats.avatar_state === 'optimal') coinsEarned *= 2;
        }

        updates['gamification_stats.daily_scan_count'] = newDailyCount;
        if (newDailyCount <= MAX_DAILY_SCANS) {
            updates['gamification_stats.total_scans'] = increment(1);
            updates['gamification_stats.weekly_suku_scan_count'] = increment(1);
        }
    } 
    
    // --- 3. ROUTE B: PLANNED MEAL ECONOMY (Global Lock) ---
    else if (scanType === 'planned' && mealType) {
        const isNewPlannedDay = profile.gamification_stats.planned_meals_last_date !== todayStr;
        let plannedLog = isNewPlannedDay 
            ? { breakfast: false, lunch: false, dinner: false } 
            : (profile.gamification_stats.planned_meals_logged_today || { breakfast: false, lunch: false, dinner: false });

        if (plannedLog[mealType]) {
            throw new Error(`You have already logged your ${mealType} globally today!`);
        }

        plannedLog[mealType] = true;

        // Planned meals ALWAYS give coins, plus a planning bonus!
        coinsEarned = COIN_REWARDS.SUKU_SCAN_BASE + COIN_REWARDS.SAVE_PLAN;
        if (sukuScore >= 8) coinsEarned += COIN_REWARDS.SUKU_SCORE_HIGH;
        else if (sukuScore >= 5) coinsEarned += COIN_REWARDS.SUKU_SCORE_MED;
        if (profile.gamification_stats.avatar_state === 'optimal') coinsEarned *= 2;

        updates['gamification_stats.planned_meals_logged_today'] = plannedLog;
        updates['gamification_stats.planned_meals_last_date'] = todayStr;
        updates['gamification_stats.total_scans'] = increment(1);
        updates['gamification_stats.weekly_suku_scan_count'] = increment(1);
    }

    // --- 4. APPLY UPDATES ---
    updates['gamification_stats.nutricoin_balance'] = increment(coinsEarned);
    await updateDoc(ref, updates);

    // --- 5. AVERAGE MATH & TIER ---
    if (coinsEarned > 0) {
        const updatedProfile = await getUserProfile();
        const scanCount = updatedProfile.gamification_stats.weekly_suku_scan_count || 1;
        const currentAvg = updatedProfile.gamification_stats.weekly_suku_avg_score || 0;
        const newAvg = scanCount === 1 ? sukuScore : ((currentAvg * (scanCount - 1)) + sukuScore) / scanCount;
        await updateDoc(ref, { 'gamification_stats.weekly_suku_avg_score': Math.round(newAvg * 10) / 10 });
        
        const finalProfile = await getUserProfile();
        const newTier = calculateTier(finalProfile.gamification_stats.nutricoin_balance);
        if (newTier !== finalProfile.current_tier) await updateDoc(ref, { current_tier: newTier });
    }

    const newAvatarState = await updateAvatarState();
    return { coinsAwarded: coinsEarned, newAvatarState };
}

// ============================================================
// DECAY LOGIC (Buddy gets hungry over time)
// ============================================================

export async function checkStreakDecay(): Promise<void> {
    try {
        const userId = getCurrentUserId();
        const ref = doc(db, 'users', userId);
        const profile = await getUserProfile();
        
        const lastScanStr = profile.gamification_stats.last_scan_date;
        if (!lastScanStr) return; 

        const lastScanDate = new Date(lastScanStr);
        const today = new Date();
        
        lastScanDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(today.getTime() - lastScanDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

        const currentVitality = profile.gamification_stats.vitality ?? 50;

        if (diffDays >= 1) {
            // Natural hunger: Lose 5 vitality per day, plus 15 extra if streak is broken
            let vitalityLoss = 5; 
            if (diffDays > 1) {
                vitalityLoss += (diffDays * 15);
            }
            
            const newVitality = Math.max(0, currentVitality - vitalityLoss);

            await updateDoc(ref, {
                'gamification_stats.vitality': newVitality,
                // Break streak only if they missed a full day
                ...(diffDays > 1 ? { 'gamification_stats.current_health_streak_days': 0 } : {}),
                last_updated: serverTimestamp()
            });
            await updateAvatarState(); 
        }
    } catch (error) {
        console.error("Failed to check streak decay:", error);
    }
}

// ============================================================
// ADMIN / DEV MODE OVERRIDE
// ============================================================
export async function overrideGamificationStats(vitality: number, level: number, streak: number): Promise<void> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);

    const newCoins = Math.max(0, (level - 1) * 100); 

    await updateDoc(ref, {
        'gamification_stats.vitality': vitality, // Override vitality directly
        'gamification_stats.nutricoin_balance': newCoins,
        'gamification_stats.current_health_streak_days': streak,
        last_updated: serverTimestamp(),
    });

    const profile = await getUserProfile();
    const newTier = calculateTier(newCoins);
    if (newTier !== profile.current_tier) {
        await updateDoc(ref, { current_tier: newTier });
    }
    
    await updateAvatarState();
}

// ============================================================
// LEADERBOARD
// ============================================================

export async function getLeaderboard(
    campus: string,
    metric: 'suku_points' | 'streak' | 'nutricoins'
): Promise<LeaderboardEntry[]> {
    // We fetch users and sort them locally since we are computing Suku Points
    let q = campus && campus !== 'all' 
        ? query(collection(db, 'users'), where('campus', '==', campus), limit(100))
        : query(collection(db, 'users'), limit(100));

    const snapshot = await getDocs(q);

    const entries: LeaderboardEntry[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as any;
        const stats = data.gamification_stats || {};
        
        const avg = stats.weekly_suku_avg_score || 0;
        const scans = stats.total_scans || 0;
        
        return {
            userId: docSnap.id,
            display_name: data.display_name || 'Unknown',
            campus: data.campus || '',
            state: data.state || '',
            current_tier: data.current_tier || 'Iron',
            avatar_state: stats.avatar_state || 'neutral',
            streak: stats.current_health_streak_days || 0,
            totalScans: scans,
            nutricoins: stats.nutricoin_balance || 0,
            suku_avg: avg,
            suku_points: Math.round(avg * scans), // 🔥 Fair algorithm: Quality x Quantity
        };
    });

    // Sort based on the selected tab
    return entries
        .filter((e) => e[metric] > 0 || e.totalScans > 0) // Only show active users
        .sort((a, b) => b[metric] - a[metric]) 
        .slice(0, 50); 
}

// 🔥 NEW: Update the user's state in Firestore
export async function updateUserState(state: string): Promise<void> {
    const userId = getCurrentUserId();
    const ref = doc(db, 'users', userId);
    await updateDoc(ref, {
        state, // Save it at the top level next to campus
        last_updated: serverTimestamp(),
    });
}