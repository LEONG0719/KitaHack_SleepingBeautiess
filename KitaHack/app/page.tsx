'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, MapPin, MessageCircle, Trophy, ChevronRight, Zap, Star, ShoppingCart, SlidersHorizontal } from 'lucide-react';
import Navbar from '@/components/Navbar';
import NutriBuddy from '@/components/NutriBuddy';
import { useAuth } from '@/lib/AuthContext';
import { getLeaderboard } from '@/lib/gamification';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ── Floating food emoji that drifts around the hero ──────────────────────────
function FloatingFood({ emoji, style }: { emoji: string; style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none text-3xl" style={style}>
      {emoji}
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon, value, label, color }: { icon: string; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-md border border-gray-100">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-sm font-black text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

// 🔥 Mock Suku Points so the Homepage Rank matches the Leaderboard Rank perfectly
const MOCK_SUKU_POINTS = [
    Math.round(9.8 * 150), Math.round(9.5 * 134), Math.round(9.4 * 120), Math.round(9.3 * 110),
    Math.round(9.1 * 92), Math.round(8.9 * 85), Math.round(8.8 * 80), Math.round(8.5 * 75),
    Math.round(8.2 * 58), Math.round(7.5 * 55), Math.round(6.9 * 50), Math.round(6.8 * 42),
    Math.round(6.1 * 32), Math.round(4.5 * 20), Math.round(3.8 * 15), Math.round(3.2 * 5),
    Math.round(2.5 * 2)
].map((pts, i) => ({ userId: `mock${i}`, suku_points: pts }));

export default function LandingPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  // 🔥 REAL-TIME DATA FETCHING
  useEffect(() => {
    if (!user) return;

    // 1. Real-time Firebase Listener
    const unsubscribe = onSnapshot(doc(db, 'userProfiles', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    });

    // 2. Fetch Leaderboard Rank Once 
    const fetchRank = async () => {
      try {
        const realEntries = await getLeaderboard('all', 'suku_points');
        const combined = [...realEntries, ...MOCK_SUKU_POINTS]
            .sort((a, b) => (b.suku_points || 0) - (a.suku_points || 0));

        const rankIndex = combined.findIndex((entry: any) => entry.userId === user.uid);
        if (rankIndex !== -1) setUserRank(rankIndex + 1);
      } catch (e) {
        console.error("Hero data sync error:", e);
      }
    };
    
    fetchRank();

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [user]);

  // 🧠 Dynamic Display Variables (Synced with Profile & Leaderboard)
  const isLogged = !!profile; 
  
  const displayCoins = isLogged ? (profile.gamification_stats?.nutricoin_balance || 0) : 171; 
  
  // 🔥 Read the saved streak & level from Dev Mode first!
  const displayStreak = isLogged ? (profile.buddy?.streak ?? profile.gamification_stats?.current_health_streak_days ?? 0) : 1;
  const displayLevel = isLogged ? (profile.buddy?.level ?? (Math.floor(displayCoins / 100) + 1)) : 2; 
  
  // 🔥 HERE is displayVitality so the <NutriBuddy /> component can see it!
  const displayVitality = isLogged ? (profile.buddy?.vitality ?? 100) : 100; 
  
  const displayRank = isLogged ? (userRank ?? '...') : 15;
  
  // 📍 FIXED LOCATION: Use State, if missing or "Other", fallback to "Malaysia"
  let displayLocation = 'Malaysia';
  if (isLogged && profile.state && profile.state !== 'Other' && profile.state !== 'All States' && profile.state !== '') {
    displayLocation = profile.state;
  }

  // Generate Message based on HP
  const getBuddyMessage = () => {
    if (!isLogged) return "Jom makan lah! Let's get healthy 🐾";
    if (displayVitality >= 70) return "Wok Hei! You're doing great today 🐾";
    if (displayVitality >= 40) return "Steady lah, let's keep it up! 🍵";
    return "Makan lah… I'm getting weak 🥱";
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ fontFamily: "'DM Sans', sans-serif", background: '#fafaf8' }}>
      <Navbar />

      {/* ═══════════════════════════════════════════════════════
          HERO
      ═══════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden" style={{ minHeight: '92vh' }}>
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #ecfdf5 0%, #f0fdf4 30%, #fefce8 65%, #fff7ed 100%)' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-30 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #34d399, transparent 70%)', transform: 'translate(30%, -30%)' }} />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, #fbbf24, transparent 70%)', transform: 'translate(-30%, 30%)' }} />

        {/* Floating food elements */}
        {[
          { emoji: '🍛', style: { top: '12%', left: '6%',  animation: 'foodFloat 4s 0s ease-in-out infinite' } },
          { emoji: '🥤', style: { top: '20%', right: '8%', animation: 'foodFloat 4.5s 0.5s ease-in-out infinite' } },
          { emoji: '🍜', style: { top: '60%', left: '4%',  animation: 'foodFloat 3.8s 1s ease-in-out infinite' } },
          { emoji: '🥗', style: { top: '75%', right: '6%', animation: 'foodFloat 4.2s 0.8s ease-in-out infinite' } },
          { emoji: '🍱', style: { top: '40%', left: '2%',  animation: 'foodFloat 5s 0.3s ease-in-out infinite' } },
          { emoji: '🧋', style: { top: '35%', right: '4%', animation: 'foodFloat 3.5s 1.2s ease-in-out infinite' } },
        ].map((f, i) => <FloatingFood key={i} emoji={f.emoji} style={f.style} />)}

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Left — copy */}
            <div style={{ animation: 'fadeUp 0.7s ease-out both' }}>
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-6 border border-emerald-200">
                <Sparkles className="w-3.5 h-3.5" /> Made for Everyday Malaysians
              </div>

              <h1 className="font-black text-gray-900 leading-[1.05] mb-6" style={{ fontSize: 'clamp(2.4rem, 5vw, 4rem)', letterSpacing: '-0.02em' }}>
                Eat Smart,{' '}
                <span className="relative inline-block">
                  <span className="relative z-10" style={{ color: '#059669' }}>Level Up</span>
                  <span className="absolute bottom-1 left-0 right-0 h-3 rounded-full opacity-25 -z-0" style={{ background: '#34d399' }} />
                </span>
                {' '}Your{' '}
                <span style={{ color: '#d97706' }}>Daily Life</span>
              </h1>

              <p className="text-lg text-gray-600 leading-relaxed mb-8 max-w-lg">
                AI-powered meal planning built for busy Malaysians. Whether you cook at home or tapao at the Mamak, hit your goals with budget-friendly plans guided by Buddy 🐱.
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link href="/plan">
                  <button className="flex items-center gap-2 text-white font-black px-7 py-4 rounded-2xl shadow-xl transition-all hover:shadow-2xl hover:-translate-y-0.5 active:scale-95" style={{ background: 'linear-gradient(135deg, #059669, #0d9488)', fontSize: '1rem' }}>
                    <Sparkles className="w-4 h-4" /> Start My Meal Plan
                  </button>
                </Link>
                <Link href="/profile">
                  <button className="flex items-center gap-2 text-emerald-700 font-black px-7 py-4 rounded-2xl border-2 border-emerald-200 bg-white hover:bg-emerald-50 transition-all" style={{ fontSize: '1rem' }}>
                    Meet Buddy 🐾 <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                <StatPill icon="🔥" value="2,400+"  label="Active Streaks"  color="#f59e0b" />
                <StatPill icon="🍛" value="12+" label="Local Cuisines" color="#10b981" />
                <StatPill icon="⭐" value="RM 10–30" label="Per Meal Budget" color="#8b5cf6" />
              </div>
            </div>

            {/* Right — 🔥 INJECTED ACTUAL NUTRIBUDDY COMPONENT */}
            <div className="relative flex justify-center" style={{ animation: 'fadeUp 0.7s 0.15s ease-out both' }}>
              <div className="absolute inset-0 rounded-[3rem] blur-3xl opacity-40 pointer-events-none" style={{ background: 'radial-gradient(ellipse, #34d399, transparent 65%)' }} />

              <div className="relative w-full max-w-sm mt-8">
                
          

                {/* 🔥 YOUR REAL NUTRIBUDDY RENDERED HERE! */}
                <NutriBuddy 
                  vitality={displayVitality}
                  level={displayLevel}
                  streak={displayStreak}
                  nutricoins={displayCoins}
                  name={isLogged && profile.displayName ? profile.displayName.split(' ')[0] : 'Companion'}
                />

                {/* Floating badge chips */}
                <div className="absolute -top-10 -right-4 bg-white rounded-2xl px-3 py-2 shadow-xl border border-amber-100 flex items-center gap-1.5 text-sm font-black text-amber-700 z-40"
                  style={{ animation: 'chipFloat 3s 0.2s ease-in-out infinite' }}>
                  🏆 Leaderboard #{displayRank}
                </div>
                <div className="absolute -bottom-4 -left-4 max-w-[200px] bg-white rounded-2xl px-3 py-2 shadow-xl border border-emerald-100 flex items-center gap-1.5 text-sm font-black text-emerald-700 truncate z-40"
                  style={{ animation: 'chipFloat 3.5s 0.5s ease-in-out infinite' }}>
                  📍 <span className="truncate">{displayLocation}</span> Detected
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes foodFloat  { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-16px) rotate(6deg)} }
          @keyframes chipFloat  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
          @keyframes bubbleIn   { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
          @keyframes fadeUp     { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
      </section>

      {/* ═══════════════════════════════════════════════════════
          THE TOOLKIT BENTO GRID
      ═══════════════════════════════════════════════════════ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-14">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600 mb-3">What We Do</p>
          <h2 className="font-black text-gray-900 leading-tight mb-4"
            style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}>
            The Smart Eating Toolkit
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto text-lg">Everything a Malaysian needs to eat well, save money, and actually enjoy their food.</p>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 — AI Meal Planning */}
          <div className="lg:col-span-2 rounded-[2rem] p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #ecfdf5, #d1fae5)', border: '1.5px solid #a7f3d0', minHeight: '280px' }}>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#34d399' }} />
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 flex items-center justify-center mb-5 shadow-lg shadow-emerald-200">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Hybrid AI Meal Plans</h3>
            <p className="text-gray-600 leading-relaxed text-sm mb-5">
              Generate Daily or 7-Day Weekly plans tailored to your exact budget (RM 10–30). Mix and match <strong>Cook</strong> and <strong>Buy</strong> modes to fit your busy schedule!
            </p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-bold bg-white/80 text-emerald-800 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5 border border-emerald-200">
                <ShoppingCart className="w-3.5 h-3.5" /> Smart Grocery Lists
              </span>
              <span className="text-xs font-bold bg-white/80 text-emerald-800 px-3 py-1.5 rounded-full shadow-sm border border-emerald-200">
                🍳 Cook & Buy Modes
              </span>
              <span className="text-xs font-bold bg-white/80 text-emerald-800 px-3 py-1.5 rounded-full shadow-sm border border-emerald-200">
                🍚 Halal & Dietary Filters
              </span>
            </div>
          </div>

          {/* Card 2 — Vitality Tracking */}
          <div className="rounded-[2rem] p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #fff7ed, #fef3c7)', border: '1.5px solid #fde68a', minHeight: '280px' }}>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#f59e0b' }} />
            <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center mb-5 shadow-lg shadow-amber-200">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Vitality & XP</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              A gamified health bar tracks your energy. Log planned meals or scan spontaneous food to heal Buddy and earn coins.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-amber-700 mb-1">
                <span>Buddy's Vitality</span><span>72/100</span>
              </div>
              <div className="h-3 bg-white/50 rounded-full overflow-hidden">
                <div className="h-full rounded-full w-[72%]" style={{ background: 'linear-gradient(90deg,#fbbf24,#f59e0b)' }} />
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-xs font-black bg-white/70 text-amber-700 px-2.5 py-1 rounded-full">🔥 Daily Streak</span>
              </div>
            </div>
          </div>

          {/* Card 3 — Buddy Chat */}
          <div className="rounded-[2rem] p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #f0f9ff, #e0f2fe)', border: '1.5px solid #bae6fd', minHeight: '280px' }}>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#38bdf8' }} />
            <div className="w-12 h-12 rounded-2xl bg-sky-500 flex items-center justify-center mb-5 shadow-lg shadow-sky-200">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Buddy Chat 🐱</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Chat with Buddy in Manglish! Get instant food advice, nutrition tips, and a dose of Malaysian cat energy.
            </p>
            <div className="space-y-2">
              <div className="bg-white/80 rounded-2xl rounded-bl-sm px-3 py-2 text-xs font-semibold text-gray-700 shadow-sm border border-sky-100">
                Aiyo, your vitality low lah! Try teh tarik ☕
              </div>
              <div className="bg-sky-500 rounded-2xl rounded-br-sm px-3 py-2 text-xs font-semibold text-white ml-4 shadow-sm">
                What's a healthy swap for Roti Canai? 🍛
              </div>
            </div>
          </div>

          {/* Card 4 — Local Mapping */}
          <div className="lg:col-span-2 rounded-[2rem] p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #fdf4ff, #f3e8ff)', border: '1.5px solid #e9d5ff', minHeight: '240px' }}>
            <div className="absolute -bottom-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ background: '#a855f7' }} />
            <div className="w-12 h-12 rounded-2xl bg-violet-500 flex items-center justify-center mb-5 shadow-lg shadow-violet-200">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Local Food Finder</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              Discover healthy, budget-friendly food spots around your specific location. See ratings, price tags, and walking distance all in one beautiful map view.
            </p>
            <div className="flex gap-2 flex-wrap">
              {['📍 KL Sentral', '🏢 Mid Valley', "🏫 Subang Jaya", '🗺️ Penang', '+ Anywhere'].map((c) => (
                <span key={c} className="text-xs font-bold bg-white/70 text-violet-700 px-3 py-1.5 rounded-full border border-violet-200">{c}</span>
              ))}
            </div>
          </div>

          {/* Card 5 — Leaderboard */}
          <div className="rounded-[2rem] p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #fff1f2, #ffe4e6)', border: '1.5px solid #fecdd3', minHeight: '240px' }}>
            <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center mb-5 shadow-lg shadow-rose-200">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Leaderboard</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Compete with your local community. Earn NutriCoins and climb the health tiers!
            </p>
            <div className="space-y-1.5">
              {[
                { rank: '🥇', name: 'Sarah_KL',   pts: '1,240' },
                { rank: '🥈', name: 'AhmadFit',   pts: '980'  },
                { rank: '🥉', name: 'NutriQueen', pts: '870'  },
              ].map(({ rank, name, pts }) => (
                <div key={name} className="flex items-center justify-between bg-white/70 rounded-xl px-3 py-1.5 text-xs border border-rose-100">
                  <span>{rank} <span className="font-bold text-gray-700">{name}</span></span>
                  <span className="font-black text-rose-600">{pts} 🪙</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 6 — Scan & Analyse */}
          <div className="rounded-[2rem] p-7 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)', border: '1.5px solid #bbf7d0', minHeight: '240px' }}>
            <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center mb-5 shadow-lg shadow-teal-200">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Meal Scanner</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              Snap a photo of any spontaneous meal to get instant <em>Suku-Suku Separuh</em> scores.
            </p>
            <div className="bg-white/70 rounded-xl px-3 py-2 border border-teal-100 text-xs font-bold text-teal-700">
              📸 Chicken Rice detected — 8/10 Suku Score
            </div>
          </div>

          {/* Card 7 — Seasonal Context Modes */}
          <div className="lg:col-span-4 rounded-[2rem] p-7 sm:p-10 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #f0f9ff, #e0f2fe)', border: '1.5px solid #bae6fd' }}>
            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: '#38bdf8' }} />
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 relative z-10">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-5 shadow-lg shadow-blue-200">
                  <SlidersHorizontal className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-3">Adaptive Context Toggle</h3>
                <p className="text-gray-600 leading-relaxed mb-6 max-w-3xl text-base">
                  Life changes, and your diet should too! Use the navbar toggle to tell the AI what season it is. The AI will dynamically adjust your meal plans, timings, and calorie distribution to perfectly fit your current routine.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white/80 rounded-xl px-4 py-2 border border-blue-200 shadow-sm flex items-center gap-2">
                    <span className="text-lg">🟢</span>
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase">Normal Mode</p>
                      <p className="text-[10px] text-gray-500 font-semibold">Standard 3-meal balanced routine</p>
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl px-4 py-2 border border-blue-200 shadow-sm flex items-center gap-2">
                    <span className="text-lg">🌙</span>
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase">Ramadan Mode</p>
                      <p className="text-[10px] text-gray-500 font-semibold">Sahur & Iftar focused energy</p>
                    </div>
                  </div>
                  <div className="bg-white/80 rounded-xl px-4 py-2 border border-blue-200 shadow-sm flex items-center gap-2">
                    <span className="text-lg">🏮</span>
                    <div>
                      <p className="text-xs font-black text-gray-900 uppercase">Festival Mode</p>
                      <p className="text-[10px] text-gray-500 font-semibold">Guilt-free Raya/CNY cheat days!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          HOW IT WORKS  —  3 steps
      ═══════════════════════════════════════════════════════ */}
      <section className="py-24 relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <div className="absolute top-0 left-1/4 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#34d399' }} />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none" style={{ background: '#f59e0b' }} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-3">Simple Process</p>
            <h2 className="font-black text-white leading-tight" style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', letterSpacing: '-0.02em' }}>
              From Zero to Healthy in 3 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 border-t-2 border-dashed border-white/10 pointer-events-none" />
            {[
              {
                step: '01', emoji: '🎯', title: 'Set Your Preferences',
                desc: 'Tell us your budget, dietary needs, whether you want to cook or buy, and health goals.',
                color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)',
              },
              {
                step: '02', emoji: '✨', title: 'Get Your AI Plan',
                desc: 'Gemini generates a Daily or 7-Day hybrid plan with precise nutrition breakdowns, cost estimates, and smart grocery lists.',
                color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)',
              },
              {
                step: '03', emoji: '🚀', title: 'Track, Swap & Level Up',
                desc: 'Swap meals you dislike, scan your food to earn NutriCoins, heal Buddy, and watch your Vitality grow.',
                color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.2)',
              },
            ].map(({ step, emoji, title, desc, color, bg, border }) => (
              <div key={step} className="rounded-[1.5rem] p-7 relative text-center group hover:-translate-y-1 transition-all duration-300" style={{ background: bg, border: `1.5px solid ${border}` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 text-2xl shadow-lg" style={{ background: bg, border: `1.5px solid ${border}` }}>{emoji}</div>
                <div className="text-xs font-black uppercase tracking-widest mb-2" style={{ color }}>Step {step}</div>
                <h3 className="text-lg font-black text-white mb-3">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          BUDDY QUOTE STRIP
      ═══════════════════════════════════════════════════════ */}
      <section className="py-16 overflow-hidden" style={{ background: '#fefce8', borderTop: '1.5px solid #fde68a', borderBottom: '1.5px solid #fde68a' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-shrink-0 w-28 h-28 relative" style={{ animation: 'catBob 3s ease-in-out infinite' }}>
            <Image src="/nutribuddy-cat-happy.png" alt="Buddy" width={112} height={112} className="object-contain" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-600 mb-2">Buddy Says 🐾</p>
            <blockquote className="text-2xl font-black text-gray-900 leading-snug" style={{ letterSpacing: '-0.01em' }}>
              "Wah bestie, don't just tapao anything lah! Let me help you eat sedap <em>and</em> healthy!"
            </blockquote>
            <p className="text-sm text-gray-400 font-medium mt-3">— NutriBuddy, your AI cat companion</p>
          </div>
        </div>
      </section>

     {/* ═══════════════════════════════════════════════════════
          FINAL CTA
      ═══════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="rounded-[2.5rem] p-10 sm:p-16 text-center relative overflow-hidden shadow-2xl"
          style={{ background: 'linear-gradient(145deg, #059669, #0d9488)' }}>
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-15 blur-2xl pointer-events-none" style={{ background: '#fff' }} />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full opacity-15 blur-2xl pointer-events-none" style={{ background: '#fbbf24' }} />

          <div className="relative">
            <p className="text-emerald-200 text-xs font-black uppercase tracking-widest mb-4">Ready to Start?</p>
            <h2 className="text-white font-black leading-tight mb-4"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}>
              Your Healthiest Routine Starts Today
            </h2>
            <p className="text-emerald-100 text-lg mb-10 max-w-xl mx-auto">
              Join thousands of Malaysians levelling up their nutrition — budget-friendly meals, a gamified health journey, and Buddy by your side.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/plan">
                <button className="flex items-center gap-2 bg-white text-emerald-700 font-black px-8 py-4 rounded-2xl shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all active:scale-95 text-base">
                  <Sparkles className="w-4 h-4" />
                  Create My Meal Plan
                </button>
              </Link>
              <Link href="/scanner">
                <button className="flex items-center gap-2 border-2 border-white/40 text-white font-black px-8 py-4 rounded-2xl hover:bg-white/10 transition-all text-base">
                  📸 Scan a Meal First
                </button>
              </Link>
            </div>
            <p className="text-emerald-200/70 text-xs mt-6">Free to use · No credit card · Takes 2 minutes</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          DISCLAIMER
      ═══════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex gap-3 items-start">
          <span className="text-blue-500 text-lg flex-shrink-0 mt-0.5">ℹ️</span>
          <p className="text-sm text-gray-600">
            <span className="font-bold text-gray-800">Nutrition Note: </span>
            All calorie counts and prices are estimates based on typical Malaysian portions and local markets. 
            This tool helps you explore balanced meal options — for personalised dietary advice, please consult a registered dietitian or nutritionist.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center items-center">
          <p className="text-sm text-gray-400 text-center">
            Made with 🐾 for all Malaysians
          </p>
        </div>
      </footer>
    </div>
  );
}


   