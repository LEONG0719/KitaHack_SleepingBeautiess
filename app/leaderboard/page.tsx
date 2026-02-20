'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    getUserProfile,
    getLeaderboard,
    updateCampus,
    calculateTier,
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
    Medal,
    ChevronDown,
    Loader2,
    Sparkles,
    Heart,
    Zap,
    Meh,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const CAMPUSES = [
    'All Campuses',
    'Asia Pacific University (APU)',
    'Universiti Malaya (UM)',
    "Taylor's University",
    'Universiti Kebangsaan Malaysia (UKM)',
    'Universiti Putra Malaysia (UPM)',
    'Sunway University',
    'Monash University Malaysia',
    'HELP University',
    'UCSI University',
    'Other',
];

const TIER_ORDER: TierName[] = [
    'Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Ascendant', 'Immortal', 'Radiant',
];

function AvatarIcon({ state, size = 'md' }: { state: AvatarState; size?: 'sm' | 'md' | 'lg' }) {
    const sizeClass = size === 'lg' ? 'w-20 h-20' : size === 'md' ? 'w-12 h-12' : 'w-8 h-8';
    const iconSize = size === 'lg' ? 'w-10 h-10' : size === 'md' ? 'w-6 h-6' : 'w-4 h-4';

    const config = {
        optimal: { bg: 'bg-emerald-100 border-emerald-300', icon: <Zap className={`${iconSize} text-emerald-600`} /> },
        neutral: { bg: 'bg-blue-100 border-blue-300', icon: <Heart className={`${iconSize} text-blue-600`} /> },
        sluggish: { bg: 'bg-gray-200 border-gray-400', icon: <Meh className={`${iconSize} text-gray-500`} /> },
    };

    const { bg, icon } = config[state];

    return (
        <div className={`${sizeClass} rounded-full ${bg} border-2 flex items-center justify-center`}>
            {icon}
        </div>
    );
}

function TierBadge({ tier }: { tier: TierName }) {
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: getTierColor(tier) }}
        >
            <Crown className="w-3 h-3" />
            {tier}
        </span>
    );
}

export default function LeaderboardPage() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaderboardLoading, setLeaderboardLoading] = useState(false);
    const [selectedCampus, setSelectedCampus] = useState('All Campuses');
    const [metric, setMetric] = useState<'weekly_money_saved_rm' | 'weekly_suku_avg_score'>('weekly_suku_avg_score');
    const [showCampusSelect, setShowCampusSelect] = useState(false);
    const [editingCampus, setEditingCampus] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        loadLeaderboard();
    }, [selectedCampus, metric]);

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
            const entries = await getLeaderboard(campusFilter, metric);
            setLeaderboard(entries);
        } catch (err) {
            console.error('Failed to load leaderboard:', err);
        } finally {
            setLeaderboardLoading(false);
        }
    };

    const handleCampusUpdate = async (campus: string) => {
        try {
            await updateCampus(campus);
            setProfile((prev) => (prev ? { ...prev, campus } : prev));
            setEditingCampus(false);
        } catch (err) {
            console.error('Failed to update campus:', err);
        }
    };

    if (loading) {
        return (
            <ProtectedRoute>
                <div className="min-h-screen bg-gray-50">
                    <Navbar />
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <Navbar />

                <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Profile Card */}
                    {profile && (
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-8">
                            <div className="flex items-center gap-6">
                                <AvatarIcon state={profile.gamification_stats.avatar_state} size="lg" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl font-bold text-gray-900">
                                            {profile.display_name}
                                        </h2>
                                        <TierBadge tier={profile.current_tier} />
                                    </div>

                                    {/* Campus */}
                                    {editingCampus || !profile.campus ? (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {CAMPUSES.filter((c) => c !== 'All Campuses').map((c) => (
                                                <button
                                                    key={c}
                                                    onClick={() => handleCampusUpdate(c)}
                                                    className={`text-xs px-3 py-1.5 rounded-full border transition ${profile.campus === c
                                                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {c}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">
                                            🏫 {profile.campus}{' '}
                                            <button
                                                onClick={() => setEditingCampus(true)}
                                                className="text-emerald-600 hover:underline text-xs ml-1"
                                            >
                                                Change
                                            </button>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                                <div className="bg-amber-50 rounded-lg p-3 text-center">
                                    <Coins className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                                    <p className="text-xl font-bold text-amber-700">
                                        {profile.gamification_stats.nutricoin_balance}
                                    </p>
                                    <p className="text-xs text-amber-600">NutriCoins</p>
                                </div>
                                <div className="bg-orange-50 rounded-lg p-3 text-center">
                                    <Flame className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                                    <p className="text-xl font-bold text-orange-700">
                                        {profile.gamification_stats.current_health_streak_days}
                                    </p>
                                    <p className="text-xs text-orange-600">Day Streak</p>
                                </div>
                                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                                    <Sparkles className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                                    <p className="text-xl font-bold text-emerald-700">
                                        {profile.gamification_stats.weekly_suku_avg_score || '—'}
                                    </p>
                                    <p className="text-xs text-emerald-600">Avg Suku Score</p>
                                </div>
                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                    <Medal className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                                    <p className="text-xl font-bold text-blue-700">
                                        RM {profile.gamification_stats.weekly_money_saved_rm.toFixed(0)}
                                    </p>
                                    <p className="text-xs text-blue-600">Saved This Week</p>
                                </div>
                            </div>

                            {/* Tier Progress */}
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Tier Progress</span>
                                    <span>{profile.gamification_stats.nutricoin_balance} coins</span>
                                </div>
                                <div className="flex gap-0.5">
                                    {TIER_ORDER.map((t) => (
                                        <div
                                            key={t}
                                            className="flex-1 h-2 rounded-full transition-colors"
                                            style={{
                                                backgroundColor:
                                                    TIER_ORDER.indexOf(t) <= TIER_ORDER.indexOf(profile.current_tier)
                                                        ? getTierColor(t)
                                                        : '#e5e7eb',
                                            }}
                                            title={t}
                                        />
                                    ))}
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                                    <span>Iron</span>
                                    <span>Radiant</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Leaderboard */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    Campus Leaderboard
                                </h2>

                                <div className="flex gap-2">
                                    {/* Metric Toggle */}
                                    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                                        <button
                                            onClick={() => setMetric('weekly_suku_avg_score')}
                                            className={`px-3 py-1.5 font-medium transition ${metric === 'weekly_suku_avg_score'
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            Health
                                        </button>
                                        <button
                                            onClick={() => setMetric('weekly_money_saved_rm')}
                                            className={`px-3 py-1.5 font-medium transition ${metric === 'weekly_money_saved_rm'
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            Savings
                                        </button>
                                    </div>

                                    {/* Campus Filter */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowCampusSelect(!showCampusSelect)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50"
                                        >
                                            {selectedCampus === 'All Campuses' ? 'All' : selectedCampus.split('(')[0].trim()}
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                        {showCampusSelect && (
                                            <div className="absolute right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                                                {CAMPUSES.map((c) => (
                                                    <button
                                                        key={c}
                                                        onClick={() => {
                                                            setSelectedCampus(c);
                                                            setShowCampusSelect(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${selectedCampus === c ? 'text-emerald-600 font-semibold' : 'text-gray-600'
                                                            }`}
                                                    >
                                                        {c}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard Table */}
                        <div className="divide-y divide-gray-50">
                            {leaderboardLoading ? (
                                <div className="p-12 text-center">
                                    <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Loading rankings...</p>
                                </div>
                            ) : leaderboard.length === 0 ? (
                                <div className="p-12 text-center">
                                    <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">
                                        No data yet. Start scanning meals and saving money to appear here!
                                    </p>
                                </div>
                            ) : (
                                leaderboard.map((entry, index) => (
                                    <div
                                        key={entry.userId}
                                        className={`flex items-center gap-4 p-4 ${index < 3 ? 'bg-amber-50/30' : ''}`}
                                    >
                                        <div className="w-8 text-center">
                                            {index === 0 ? (
                                                <span className="text-2xl">🥇</span>
                                            ) : index === 1 ? (
                                                <span className="text-2xl">🥈</span>
                                            ) : index === 2 ? (
                                                <span className="text-2xl">🥉</span>
                                            ) : (
                                                <span className="text-sm font-bold text-gray-400">
                                                    #{index + 1}
                                                </span>
                                            )}
                                        </div>

                                        <AvatarIcon state={entry.avatar_state} size="sm" />

                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">
                                                {entry.display_name}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <TierBadge tier={entry.current_tier} />
                                                {entry.campus && (
                                                    <span className="text-xs text-gray-400 truncate">
                                                        {entry.campus}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-600">
                                                {metric === 'weekly_money_saved_rm'
                                                    ? `RM ${entry.value.toFixed(0)}`
                                                    : entry.value.toFixed(1)}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {metric === 'weekly_money_saved_rm' ? 'saved' : 'avg score'}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
