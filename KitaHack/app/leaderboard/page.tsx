'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import {
    getUserProfile,
    getLeaderboard,
    getTierColor,
    type UserProfile,
    type LeaderboardEntry,
    type TierName,
    type AvatarState,
} from '@/lib/gamification';
import {
    Trophy,
    Coins,
    Flame,
    Crown,
    Loader2,
    Heart,
    Zap,
    Meh,
    Camera,
    Sparkles,
    MapPin,
    Map,
    Star, // Added for level icon
    Info
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const CAMPUSES = [
    'All Campuses', 'Asia Pacific University (APU)', 'Universiti Malaya (UM)', 
    "Taylor's University", 'Universiti Kebangsaan Malaysia (UKM)', 'Universiti Putra Malaysia (UPM)',
    'Sunway University', 'Monash University Malaysia', 'HELP University', 'UCSI University', 'Other',
];

const MALAYSIAN_STATES = [
    'All States', 'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 
    'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 
    'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'
];

const TIER_THRESHOLDS: { tier: TierName; minCoins: number }[] = [
    { tier: 'Iron', minCoins: 0 }, { tier: 'Bronze', minCoins: 100 },
    { tier: 'Silver', minCoins: 300 }, { tier: 'Gold', minCoins: 600 },
    { tier: 'Platinum', minCoins: 1000 }, { tier: 'Diamond', minCoins: 1500 },
    { tier: 'Ascendant', minCoins: 2500 }, { tier: 'Immortal', minCoins: 3500 },
    { tier: 'Radiant', minCoins: 5000 },
];

// Calculate Level from Coins helper
const getLevel = (coins: number) => Math.floor(coins / 100) + 1;

// 🔥 MASSIVELY EXPANDED MOCK DATA (Now with NutriCoins and Suku Points logic)
const MOCK_COMPETITORS = [
    // Top Tier (Radiant / Immortal)
    { userId: 'mock1', display_name: 'Darren Wong', campus: 'Monash University Malaysia', state: 'Selangor', current_tier: 'Radiant', avatar_state: 'optimal', streak: 45, totalScans: 150, nutricoins: 5250, suku_avg: 9.8 },
    { userId: 'mock2', display_name: 'Sarah Wong', campus: 'Universiti Malaya (UM)', state: 'W.P. Kuala Lumpur', current_tier: 'Immortal', avatar_state: 'optimal', streak: 41, totalScans: 134, nutricoins: 4100, suku_avg: 9.5 },
    { userId: 'mock21', display_name: 'Ahmad Faiz', campus: 'Other', state: 'Johor', current_tier: 'Radiant', avatar_state: 'optimal', streak: 38, totalScans: 120, nutricoins: 5050, suku_avg: 9.4 },
    { userId: 'mock22', display_name: 'Michelle Lee', campus: 'Other', state: 'Pulau Pinang', current_tier: 'Immortal', avatar_state: 'optimal', streak: 35, totalScans: 110, nutricoins: 3800, suku_avg: 9.3 },

    // High Tier (Ascendant / Diamond)
    { userId: 'mock3', display_name: 'Ali Razak', campus: 'Asia Pacific University (APU)', state: 'W.P. Kuala Lumpur', current_tier: 'Ascendant', avatar_state: 'optimal', streak: 28, totalScans: 92, nutricoins: 2900, suku_avg: 9.1 },
    { userId: 'mock4', display_name: 'Nur Aina', campus: 'Universiti Malaya (UM)', state: 'W.P. Kuala Lumpur', current_tier: 'Ascendant', avatar_state: 'optimal', streak: 26, totalScans: 85, nutricoins: 2650, suku_avg: 8.9 },
    { userId: 'mock5', display_name: 'Kavitha Murugan', campus: "Taylor's University", state: 'Selangor', current_tier: 'Diamond', avatar_state: 'optimal', streak: 25, totalScans: 80, nutricoins: 2100, suku_avg: 8.8 },
    { userId: 'mock6', display_name: 'Wei Jian', campus: 'Sunway University', state: 'Selangor', current_tier: 'Diamond', avatar_state: 'optimal', streak: 24, totalScans: 75, nutricoins: 1850, suku_avg: 8.5 },

    // Mid-High Tier (Platinum / Gold)
    { userId: 'mock7', display_name: 'Aiman Hakim', campus: 'Universiti Putra Malaysia (UPM)', state: 'Selangor', current_tier: 'Platinum', avatar_state: 'optimal', streak: 18, totalScans: 58, nutricoins: 1400, suku_avg: 8.2 },
    { userId: 'mock8', display_name: 'Jason Lee', campus: 'Monash University Malaysia', state: 'Selangor', current_tier: 'Platinum', avatar_state: 'optimal', streak: 16, totalScans: 55, nutricoins: 1250, suku_avg: 7.5 },
    { userId: 'mock10', display_name: 'Nurul Huda', campus: 'Universiti Kebangsaan Malaysia (UKM)', state: 'Selangor', current_tier: 'Gold', avatar_state: 'neutral', streak: 14, totalScans: 50, nutricoins: 850, suku_avg: 6.9 },
    { userId: 'mock11', display_name: 'Faris Danial', campus: 'UCSI University', state: 'W.P. Kuala Lumpur', current_tier: 'Gold', avatar_state: 'neutral', streak: 12, totalScans: 42, nutricoins: 720, suku_avg: 6.8 },

    // Low-Mid Tier (Silver / Bronze)
    { userId: 'mock14', display_name: 'Muthu Kumar', campus: 'Asia Pacific University (APU)', state: 'W.P. Kuala Lumpur', current_tier: 'Silver', avatar_state: 'neutral', streak: 8, totalScans: 32, nutricoins: 450, suku_avg: 6.1 },
    { userId: 'mock17', display_name: 'Daniel Goh', campus: "Taylor's University", state: 'Selangor', current_tier: 'Bronze', avatar_state: 'neutral', streak: 5, totalScans: 20, nutricoins: 220, suku_avg: 4.5 },
    { userId: 'mock18', display_name: 'Siti Aminah', campus: 'Universiti Putra Malaysia (UPM)', state: 'Selangor', current_tier: 'Bronze', avatar_state: 'sluggish', streak: 3, totalScans: 15, nutricoins: 180, suku_avg: 3.8 },

    // Entry Tier (Iron)
    { userId: 'mock19', display_name: 'Aisha Osman', campus: 'Sunway University', state: 'Selangor', current_tier: 'Iron', avatar_state: 'sluggish', streak: 1, totalScans: 5, nutricoins: 50, suku_avg: 3.2 },
    { userId: 'mock20', display_name: 'Kevin Raj', campus: 'Universiti Kebangsaan Malaysia (UKM)', state: 'Selangor', current_tier: 'Iron', avatar_state: 'sluggish', streak: 0, totalScans: 2, nutricoins: 20, suku_avg: 2.5 },
];

function StatusInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Sparkles className="w-6 h-6 text-amber-500" />
                            Avatar Status Guide
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <span className="text-2xl">&times;</span>
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex gap-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0">
                                <Zap className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-900">Optimal (Active)</p>
                                <p className="text-xs text-emerald-700">Maintain your Buddy's Vitality above 70. You earn <b>2x NutriCoins</b> in this state!</p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                            <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                                <Heart className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-blue-900">Neutral (Steady)</p>
                                <p className="text-xs text-blue-700">Vitality is between 40 and 69. Keep logging healthy Suku-Suku meals to level up!</p>
                            </div>
                        </div>

                        <div className="flex gap-4 p-3 rounded-xl bg-gray-100 border border-gray-200">
                            <div className="w-10 h-10 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
                                <Meh className="w-6 h-6 text-gray-500" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900">Sluggish (Resting)</p>
                                <p className="text-xs text-gray-500">Vitality dropped below 40 due to missed meals. Feed your Buddy healthy food to wake it up!</p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-4">How to Level Up</p>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="flex flex-col items-center">
                                <Flame className="w-5 h-5 text-orange-500 mb-1" />
                                <span className="text-[9px] font-bold text-gray-600">Daily Streaks</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Camera className="w-5 h-5 text-emerald-500 mb-1" />
                                <span className="text-[9px] font-bold text-gray-600">Scan Meals</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <Trophy className="w-5 h-5 text-amber-500 mb-1" />
                                <span className="text-[9px] font-bold text-gray-600">Earn Tiers</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-gray-900 text-white font-bold text-sm hover:bg-black transition-colors"
                >
                    Got it, let's eat!
                </button>
            </div>
        </div>
    );
}

function AvatarIcon({ name, state, tier, size = 'md', showBadge = true }: { name: string; state: AvatarState; tier: TierName; size?: 'sm' | 'md' | 'lg' | 'xl'; showBadge?: boolean }) {
    const sizeClasses = {
        sm: 'w-10 h-10', md: 'w-14 h-14', lg: 'w-20 h-20', xl: 'w-24 h-24'
    };
    const badgeContainerSizes = {
        sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6', xl: 'w-7 h-7'
    };
    const badgeIconSizes = {
        sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4'
    };

    const badgeConfig = {
        optimal: { bg: 'bg-emerald-100 border-emerald-400', icon: <Zap className={`${badgeIconSizes[size]} text-emerald-600`} /> },
        neutral: { bg: 'bg-blue-100 border-blue-400', icon: <Heart className={`${badgeIconSizes[size]} text-blue-600`} /> },
        sluggish: { bg: 'bg-gray-200 border-gray-400', icon: <Meh className={`${badgeIconSizes[size]} text-gray-500`} /> },
    };

    const badge = badgeConfig[state];
    const encodedName = encodeURIComponent(name || 'Player');
    const avatarUrl = `https://api.dicebear.com/7.x/micah/svg?seed=${encodedName}&backgroundColor=f1f5f9`;

    return (
        <div className="relative inline-flex items-center justify-center shrink-0">
            <div 
                className={`${sizeClasses[size]} rounded-full bg-slate-100 flex items-center justify-center shadow-sm overflow-hidden`}
                style={{ border: `3px solid ${getTierColor(tier)}`, boxShadow: `0 0 12px ${getTierColor(tier)}50` }}
            >
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
            </div>
            {showBadge && (
                <div className={`absolute -bottom-0.5 -right-0.5 rounded-full ${badge.bg} border-2 flex items-center justify-center shadow-sm ${badgeContainerSizes[size]}`}>
                    {badge.icon}
                </div>
            )}
        </div>
    );
}

function TierBadge({ tier }: { tier: TierName }) {
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm uppercase tracking-wider"
            style={{ backgroundColor: getTierColor(tier) }}
        >
            <Crown className="w-3 h-3" />
            {tier}
        </span>
    );
}

function PodiumItem({ entry, rank, metric }: { entry: LeaderboardEntry; rank: 1 | 2 | 3; metric: string }) {
    // 🔥 RESTORED: Gold, Silver, and Bronze banner colors!
    const heightMap = {
        1: 'h-48 sm:h-56 bg-gradient-to-t from-amber-200 to-amber-50 border-amber-300',
        2: 'h-40 sm:h-48 bg-gradient-to-t from-gray-200 to-gray-50 border-gray-300',
        3: 'h-32 sm:h-40 bg-gradient-to-t from-orange-200 to-orange-50 border-orange-300',
    };

    const rankDisplay = {
        1: { text: '1st', color: 'text-amber-500' },
        2: { text: '2nd', color: 'text-gray-400' },
        3: { text: '3rd', color: 'text-orange-500' },
    };

    const getMetricValue = () => {
        if (metric === 'suku_points') return entry.suku_points.toLocaleString();
        if (metric === 'nutricoins') return entry.nutricoins.toLocaleString();
        return `${entry.streak} Days`;
    };

    return (
        <div className="flex flex-col items-center justify-end flex-1 max-w-[130px]">
            <div className="relative mb-3 flex flex-col items-center mt-6">
                {rank === 1 && (
                    <div className="absolute -top-6 flex flex-col items-center justify-end h-6 z-10">
                        {/* 🔥 RESTORED: Golden bouncy crown! Added fill-amber-500 to make it solid gold */}
                        <Crown className="w-6 h-6 text-amber-500 fill-amber-500 animate-bounce" />
                    </div>
                )}
                <AvatarIcon name={entry.display_name} state={entry.avatar_state} tier={entry.current_tier} size={rank === 1 ? 'lg' : 'md'} showBadge={false} />
                <div className="absolute -bottom-2 z-10">
                    <TierBadge tier={entry.current_tier} />
                </div>
            </div>
            
            <p className="text-sm font-bold text-gray-900 truncate w-full text-center mt-2 px-1">
                {entry.display_name.split(' ')[0]}
            </p>
            <p className="text-sm font-black text-emerald-600 mb-1">
                {getMetricValue()}
            </p>
            
            <div className={`w-full rounded-t-xl border-t-2 border-l-2 border-r-2 shadow-inner flex justify-center pt-4 sm:pt-6 ${heightMap[rank]}`}>
                <div className={`relative flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 ${rankDisplay[rank].color}`}>
                    <span className="text-sm sm:text-lg font-black tracking-tighter z-10 mt-0.5 opacity-90">
                        {rankDisplay[rank].text}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function LeaderboardPage() {
    const { user } = useAuth();
    const router = useRouter(); 
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    
    const [selectedCampus, setSelectedCampus] = useState('All Campuses');
    const [selectedState, setSelectedState] = useState('All States'); 
    
    // 🔥 NEW: Updated Metric States
    const [metric, setMetric] = useState<'suku_points' | 'streak' | 'nutricoins'>('suku_points');
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        loadLeaderboard();
    }, [metric, selectedCampus, selectedState]);

    const loadProfile = async () => {
        try {
            const p = await getUserProfile();
            setProfile(p);
        } catch (err) {
            console.error('Failed to load profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadLeaderboard = async () => {
        setLeaderboardLoading(true);
        try {
            const campusFilter = selectedCampus === 'All Campuses' ? 'all' : selectedCampus;
            
            // Get REAL entries from Firebase
            const realEntriesData = await getLeaderboard(campusFilter, metric); 
            
            const realEntries = realEntriesData.map((entry: any) => {
                if (entry.userId === user?.uid && profile) {
                    return { ...entry, state: (profile as any).state || 'Unknown' };
                }
                return entry;
            });

            // Process Mock Data dynamically
            const mockEntries: LeaderboardEntry[] = MOCK_COMPETITORS
                .filter(u => campusFilter === 'all' || u.campus === campusFilter)
                .filter(u => selectedState === 'All States' || u.state === selectedState)
                .map(user => ({
                    userId: user.userId,
                    display_name: user.display_name,
                    campus: user.campus,
                    state: user.state, 
                    current_tier: user.current_tier as TierName,
                    avatar_state: user.avatar_state as AvatarState,
                    streak: user.streak,
                    totalScans: user.totalScans,
                    nutricoins: user.nutricoins,
                    suku_avg: user.suku_avg,
                    suku_points: Math.round(user.suku_avg * user.totalScans) // 🔥 Fair calculation!
                }));

            const filteredRealEntries = realEntries.filter((entry: any) => 
                selectedState === 'All States' || (entry.state && entry.state === selectedState)
            );

            // Combine and dynamically sort based on active tab
            const combinedLeaderboard = [...filteredRealEntries, ...mockEntries]
                .sort((a, b) => b[metric] - a[metric]);

            setLeaderboard(combinedLeaderboard);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
            </ProtectedRoute>
        );
    }

    const top3 = leaderboard.slice(0, 3);
    const remainingLeaderboard = leaderboard.slice(3);
    const currentUserIndex = leaderboard.findIndex(entry => entry.userId === user?.uid);
    const currentUserEntry = currentUserIndex !== -1 ? leaderboard[currentUserIndex] : null;
    const currentUserRank = currentUserIndex !== -1 ? currentUserIndex + 1 : null;

    const getMetricDisplayString = (entry: LeaderboardEntry) => {
        if (metric === 'suku_points') return { label: 'Suku Points', val: entry.suku_points.toLocaleString(), color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (metric === 'nutricoins') return { label: 'NutriCoins', val: entry.nutricoins.toLocaleString(), color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Day Streak', val: `${entry.streak} 🔥`, color: 'text-orange-600', bg: 'bg-orange-50' };
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50 pb-24">
                <Navbar />

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Profile & Settings Card */}
                    {profile && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 opacity-50"></div>
                            
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div 
                                        className="transition-transform hover:scale-105 active:scale-95"
                                    >
                                        <AvatarIcon 
                                            name={profile.display_name} 
                                            state={profile.gamification_stats.avatar_state} 
                                            tier={profile.current_tier} 
                                            size="xl" 
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <h2 className="text-2xl font-black text-gray-900">
                                                {profile.display_name}
                                            </h2>
                                            <TierBadge tier={profile.current_tier} />
                                        </div>
                                        
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-medium text-gray-600">
                                                <MapPin className="w-3 h-3 text-emerald-600" />
                                                {profile.campus || 'Campus not set'}
                                            </div>
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-[11px] font-medium text-blue-700">
                                                <Map className="w-3 h-3 text-blue-600" />
                                                {(profile as any).state || 'Locating...'} 
                                            </div>
                                            
                                            {/* 🔥 NEW: Explicit button so users can easily find the Guide! */}
                                            <button 
                                                onClick={() => setIsInfoModalOpen(true)}
                                                className="inline-flex items-center gap-1 px-3 py-1 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-lg text-[11px] font-bold text-violet-700 transition-colors shadow-sm"
                                            >
                                                <Info className="w-3 h-3" />
                                                Status Guide
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 w-full sm:w-auto">
                                    <div className="bg-emerald-50 rounded-xl p-3 flex-1 sm:w-28 text-center border border-emerald-100">
                                        <Coins className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-emerald-700">{profile.gamification_stats.nutricoin_balance}</p>
                                        <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider mt-1">NutriCoins</p>
                                    </div>
                                    <div className="bg-orange-50 rounded-xl p-3 flex-1 sm:w-28 text-center border border-orange-100">
                                        <Flame className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                                        <p className="text-xl font-bold text-orange-700">{profile.gamification_stats.current_health_streak_days}</p>
                                        <p className="text-[10px] text-orange-600 uppercase font-bold tracking-wider mt-1">Day Streak</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                {(() => {
                                    const currentCoins = profile.gamification_stats.nutricoin_balance;
                                    const currentTierIndex = TIER_THRESHOLDS.findIndex(t => t.tier === profile.current_tier);
                                    const isMaxTier = currentTierIndex === TIER_THRESHOLDS.length - 1;
                                    
                                    const currentTierData = TIER_THRESHOLDS[currentTierIndex];
                                    const nextTierData = isMaxTier ? currentTierData : TIER_THRESHOLDS[currentTierIndex + 1];
                                    
                                    const coinsNeededForNext = nextTierData.minCoins - currentTierData.minCoins;
                                    const coinsEarnedInCurrent = currentCoins - currentTierData.minCoins;
                                    const progressPercent = isMaxTier ? 100 : Math.min(100, Math.max(0, (coinsEarnedInCurrent / coinsNeededForNext) * 100));

                                    return (
                                        <>
                                            <div className="flex justify-between items-end mb-2">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Rank Progress</p>
                                                    <p className="text-sm font-medium text-gray-900">
                                                        Current Tier: <span className="font-bold" style={{ color: getTierColor(profile.current_tier) }}>{profile.current_tier}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-bold text-emerald-600">
                                                        {currentCoins} <span className="text-xs text-gray-500 font-medium">/ {isMaxTier ? 'MAX' : nextTierData.minCoins} Nutricoins</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="relative w-full h-2.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                                <div 
                                                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out"
                                                    style={{ width: `${progressPercent}%`, backgroundColor: getTierColor(profile.current_tier) }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] mt-1.5 font-bold px-1 uppercase tracking-wider">
                                                <span style={{ color: getTierColor(profile.current_tier) }}>{profile.current_tier}</span>
                                                <span style={{ color: isMaxTier ? getTierColor(profile.current_tier) : getTierColor(nextTierData.tier as TierName) }}>
                                                    {isMaxTier ? 'Max Rank Achieved' : `Next: ${nextTierData.tier}`}
                                                </span>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Leaderboard Header & Filters */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                            <Trophy className="w-7 h-7 text-amber-500" />
                            Leaderboard
                        </h2>
                        
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            {/* 🔥 NEW: 3 Fair Metrics */}
                            <Tabs value={metric} onValueChange={(v) => setMetric(v as any)} className="w-full sm:w-auto">
                                <TabsList className="grid w-full grid-cols-3 h-11 px-1 bg-gray-100/80">
                                    <TabsTrigger value="suku_points" className="text-xs font-bold gap-1.5 flex items-center justify-center">
                                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>Suku Pts</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="streak" className="text-xs font-bold gap-1.5 flex items-center justify-center">
                                        <Flame className="w-3.5 h-3.5 text-orange-500" />
                                        <span>Streak</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="nutricoins" className="text-xs font-bold gap-1.5 flex items-center justify-center">
                                        {/* 🔥 Using the standard Lucide Coins icon here! */}
                                        <Coins className="w-3.5 h-3.5 text-emerald-500" />
                                        <span>NutriCoins</span>
                                    </TabsTrigger>
                                </TabsList>
                            </Tabs>

                            <div className="flex gap-2">
                                <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                                    <SelectTrigger className="w-[140px] sm:w-[150px] h-11 bg-white font-medium text-xs">
                                        <SelectValue placeholder="Filter by Campus" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CAMPUSES.map((c) => (
                                            <SelectItem key={c} value={c} className="text-xs">{c === 'All Campuses' ? '🎓 All Campuses' : c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Select value={selectedState} onValueChange={setSelectedState}>
                                    <SelectTrigger className="w-[140px] sm:w-[140px] h-11 bg-white font-medium text-xs border-blue-200 focus:ring-blue-500">
                                        <SelectValue placeholder="Filter by State" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MALAYSIAN_STATES.map((s) => (
                                            <SelectItem key={s} value={s} className="text-xs">{s === 'All States' ? '🌍 All States' : s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Leaderboard Content */}
                    {leaderboardLoading ? (
                        <div className="py-20 text-center bg-white rounded-xl border border-gray-200">
                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">Calculating rankings...</p>
                        </div>
                    ) : leaderboard.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-xl border border-gray-200">
                            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">No data found</h3>
                            <p className="text-gray-500 mt-1">Start scanning meals to claim the #1 spot!</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-center items-end gap-2 sm:gap-6 mt-12 mb-10 px-2">
                                {top3[1] && <PodiumItem entry={top3[1]} rank={2} metric={metric} />}
                                {top3[0] && <PodiumItem entry={top3[0]} rank={1} metric={metric} />}
                                {top3[2] && <PodiumItem entry={top3[2]} rank={3} metric={metric} />}
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="divide-y divide-gray-100">
                                    {remainingLeaderboard.map((entry, index) => {
                                        const actualRank = index + 4;
                                        const isCurrentUser = entry.userId === user?.uid;
                                        const metricData = getMetricDisplayString(entry);

                                        return (
                                            <div
                                                key={entry.userId}
                                                className={`flex items-center gap-3 sm:gap-4 p-4 transition-colors ${isCurrentUser ? 'bg-emerald-50/60' : 'hover:bg-gray-50'}`}
                                            >
                                                <div className="w-8 sm:w-10 text-center flex-shrink-0">
                                                    <span className={`text-sm sm:text-base font-black ${isCurrentUser ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        #{actualRank}
                                                    </span>
                                                </div>

                                                <AvatarIcon name={entry.display_name} state={entry.avatar_state} tier={entry.current_tier} size="sm" />

                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <div className="flex items-center gap-2">
                                                        <p className={`text-sm font-bold truncate ${isCurrentUser ? 'text-emerald-800' : 'text-gray-900'}`}>
                                                            {entry.display_name}
                                                            {isCurrentUser && <span className="ml-2 text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">You</span>}
                                                        </p>
                                                    </div>
                                                    
                                                    {/* 🔥 NEW: Added Buddy Level to the tags! */}
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <TierBadge tier={entry.current_tier} />
                                                        
                                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                            <Star className="w-2.5 h-2.5" /> Lvl {getLevel(entry.nutricoins)}
                                                        </span>

                                                        {(entry as any).state && (
                                                            <span className="hidden sm:inline-block text-[10px] text-blue-500 font-medium truncate">
                                                                📍 {(entry as any).state}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 🔥 Detailed Secondary Stats */}
                                                <div className="hidden md:flex items-center gap-4 mr-4">
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Scans</span>
                                                        <span className="text-xs font-black text-gray-700">{entry.totalScans}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Streak</span>
                                                        <span className="text-xs font-black text-orange-500">{entry.streak}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase">Avg Suku</span>
                                                        <span className="text-xs font-black text-blue-500">{entry.suku_avg.toFixed(1)}</span>
                                                    </div>
                                                </div>

                                                <div className={`text-right flex flex-col justify-center items-end flex-shrink-0 w-24 sm:w-28 p-2 rounded-lg ${metricData.bg}`}>
                                                    <p className={`text-base font-black ${metricData.color}`}>
                                                        {metricData.val}
                                                    </p>
                                                    <p className={`text-[9px] font-bold uppercase tracking-wider opacity-60 ${metricData.color}`}>
                                                        {metricData.label}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </main>

                {currentUserEntry && currentUserRank && currentUserRank > 3 && (
                    <div className="fixed bottom-0 left-0 right-0 bg-emerald-900 border-t-4 border-emerald-500 p-4 shadow-2xl z-50 transform animate-in slide-in-from-bottom-full duration-500">
                        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-emerald-800 rounded-lg flex items-center justify-center border border-emerald-500 shrink-0">
                                    <span className="text-emerald-100 font-black">#{currentUserRank}</span>
                                </div>
                                <div className="hidden sm:block">
                                    <AvatarIcon name={currentUserEntry.display_name} state={currentUserEntry.avatar_state} tier={currentUserEntry.current_tier} size="md" />
                                </div>
                                <div>
                                    <p className="text-white font-bold flex items-center gap-2">
                                        Your Current Rank
                                        <span className="text-emerald-300 text-xs font-normal">Keep it up!</span>
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <TierBadge tier={currentUserEntry.current_tier} />
                                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-purple-300 bg-purple-900/50 px-1.5 py-0.5 rounded">
                                            <Star className="w-2.5 h-2.5" /> Lvl {getLevel(currentUserEntry.nutricoins)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <p className="text-2xl font-black text-emerald-400 drop-shadow-md">
                                    {getMetricDisplayString(currentUserEntry).val}
                                </p>
                                <p className="text-xs text-emerald-200/80 font-medium">
                                    {getMetricDisplayString(currentUserEntry).label}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                <StatusInfoModal 
                    isOpen={isInfoModalOpen} 
                    onClose={() => setIsInfoModalOpen(false)} 
                />
            </div>
        </ProtectedRoute>
    );
}