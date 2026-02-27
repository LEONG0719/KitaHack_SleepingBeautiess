'use client';

import Image from 'next/image';
import { useState, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NutriBuddyProps {
  vitality: number;
  level: number;
  streak: number;
  nutricoins: number; // 🔥 NEW: Added nutricoins property
  name?: string;
}

type Mood = 'happy' | 'neutral' | 'tired';

const clamp = (v: number, mn: number, mx: number) => Math.min(Math.max(v, mn), mx);
const getMood = (v: number): Mood => (v >= 70 ? 'happy' : v >= 40 ? 'neutral' : 'tired');

const moodConfig: Record<Mood, {
  label: string; emoji: string;
  accentColor: string; barColor: string; badgeBg: string;
  bgFrom: string; bgTo: string;
  image: string;
  crownOffset: number;
}> = {
  happy: {
    label: 'Wok Hei!',   emoji: '🔥',
    accentColor: '#10b981', barColor: 'from-emerald-400 to-teal-400', badgeBg: 'bg-emerald-500',
    bgFrom: '#cffafe',      bgTo: '#d1fae5',
    image: '/nutribuddy-cat-happy.png',
    crownOffset: -28, 
  },
  neutral: {
    label: 'Steady Lah', emoji: '🍵',
    accentColor: '#f59e0b', barColor: 'from-amber-400 to-yellow-400', badgeBg: 'bg-amber-500',
    bgFrom: '#fef9c3',      bgTo: '#fde68a',
    image: '/nutribuddy-cat-neutral.png',
    crownOffset: -24,
  },
  tired: {
    label: 'Makan Lah…', emoji: '🥱',
    accentColor: '#94a3b8', barColor: 'from-slate-400 to-gray-400', badgeBg: 'bg-slate-500',
    bgFrom: '#e2e8f0',      bgTo: '#cbd5e1',
    image: '/nutribuddy-cat-tired.png',
    crownOffset: -18,
  },
};

const moodReactions: Record<Mood, Array<{ emoji: string; text: string }>> = {
  happy: [
    { emoji: '🎉', text: 'Yay!' },
    { emoji: '💕', text: 'Love it!' },
    { emoji: '✨', text: 'Sparkle!' },
    { emoji: '🎊', text: 'So fun!' },
    { emoji: '🌟', text: 'Woohoo!' },
  ],
  neutral: [
    { emoji: '😺', text: 'Nyaa~' },
    { emoji: '🍵', text: 'Mmm tea' },
    { emoji: '👋', text: 'Hello!' },
    { emoji: '😊', text: 'Heehee' },
    { emoji: '🐾', text: 'Pat pat' },
  ],
  tired: [
    { emoji: '😴', text: '5 more mins…' },
    { emoji: '💤', text: 'Zzz…' },
    { emoji: '☕', text: 'Need kopi!' },
    { emoji: '🥺', text: 'So tired…' },
    { emoji: '😪', text: 'Haiyaa…' },
  ],
};

function Sparkles() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 320 260" fill="none">
      <defs>
        <radialGradient id="sg" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fef08a" />
          <stop offset="100%" stopColor="#facc15" />
        </radialGradient>
      </defs>
      {[
        { x: 36,  y: 48,  s: 12 },
        { x: 280, y: 30,  s: 17 },
        { x: 295, y: 100, s: 9  },
        { x: 20,  y: 106, s: 9  },
        { x: 55,  y: 158, s: 7  },
        { x: 270, y: 152, s: 7  },
      ].map(({ x, y, s }, i) => (
        <g key={i} transform={`translate(${x},${y})`}
          style={{ animation: `spkTwinkle 1.8s ${i * 0.28}s ease-in-out infinite` }}>
          <path
            d={`M0-${s} ${s * 0.22}-${s * 0.22} ${s} 0 ${s * 0.22} ${s * 0.22} 0 ${s}-${s * 0.22} ${s * 0.22}-${s} 0-${s * 0.22}-${s * 0.22}Z`}
            fill="url(#sg)" stroke="#eab308" strokeWidth="0.7"
          />
        </g>
      ))}
      <style>{`
        @keyframes spkTwinkle {
          0%,100% { opacity:1;   transform:scale(1)   rotate(0deg);  }
          50%      { opacity:0.4; transform:scale(0.65) rotate(15deg); }
        }
      `}</style>
    </svg>
  );
}

function StreakParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {[
        { x: '14%', d: '0s',    s: 9 },
        { x: '74%', d: '0.5s',  s: 7 },
        { x: '44%', d: '1s',    s: 5 },
        { x: '28%', d: '1.4s',  s: 8 },
        { x: '60%', d: '0.28s', s: 6 },
      ].map((p, i) => (
        <div key={i} className="absolute bottom-1/3 rounded-full bg-orange-400 opacity-80"
          style={{ left: p.x, width: p.s, height: p.s, animation: `pUp 2.5s ${p.d} ease-in infinite` }} />
      ))}
      <style>{`
        @keyframes pUp {
          0%   { transform:translateY(0) scale(1); opacity:.8; }
          80%  { opacity:.2; }
          100% { transform:translateY(-100px) scale(.2); opacity:0; }
        }
      `}</style>
    </div>
  );
}

function ZzzFloat() {
  return (
    <div className="absolute right-14 top-10 flex flex-col items-start leading-none pointer-events-none z-20">
      {(['z', 'z', 'Z'] as const).map((letter, i) => (
        <span key={i} className="font-black text-slate-400"
          style={{
            fontSize: [13, 17, 22][i],
            opacity: [0.85, 0.62, 0.38][i],
            marginLeft: `${i * 8}px`,
            animation: `zFloat 2s ${i * 0.3}s ease-in-out infinite`,
          }}>
          {letter}
        </span>
      ))}
      <style>{`
        @keyframes zFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>
    </div>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 110 58" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-28 h-14 drop-shadow-lg">
      <defs>
        <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffe566" />
          <stop offset="50%"  stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="crownBand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <radialGradient id="gemRed" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#ff8fab" />
          <stop offset="50%"  stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </radialGradient>
        <radialGradient id="gemBlue" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#93c5fd" />
          <stop offset="50%"  stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </radialGradient>
        <radialGradient id="gemGreen" cx="35%" cy="30%" r="65%">
          <stop offset="0%"   stopColor="#6ee7b7" />
          <stop offset="50%"  stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </radialGradient>
      </defs>
      <polygon points="8,42 18,16 32,32 42,8 55,42 68,8 78,32 92,16 102,42" fill="url(#crownGold)" stroke="#b45309" strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="8" y="40" width="94" height="14" rx="5" fill="url(#crownBand)" stroke="#b45309" strokeWidth="1.8"/>
      <rect x="8" y="40" width="94" height="5" rx="5" fill="white" opacity="0.18"/>
      {[22, 38, 55, 72, 88].map((x) => (
        <circle key={x} cx={x} cy="47" r="2.2" fill="#fef3c7" opacity="0.7"/>
      ))}
      <polygon points="18,12 14,20 18,17 22,20" fill="url(#gemBlue)" stroke="#1e40af" strokeWidth="1"/>
      <polygon points="18,12 18,17 22,20 18,20" fill="#93c5fd" opacity="0.4"/>
      <polygon points="55,4 49,14 55,11 61,14" fill="url(#gemRed)" stroke="#9f1239" strokeWidth="1.2"/>
      <polygon points="55,4 55,11 61,14 55,14" fill="#ff8fab" opacity="0.4"/>
      <line x1="53" y1="6" x2="51" y2="11" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
      <polygon points="92,12 88,20 92,17 96,20" fill="url(#gemBlue)" stroke="#1e40af" strokeWidth="1"/>
      <polygon points="92,12 92,17 96,20 92,20" fill="#93c5fd" opacity="0.4"/>
      <circle cx="32" cy="30" r="4.5" fill="url(#gemGreen)" stroke="#065f46" strokeWidth="1.2"/>
      <circle cx="32" cy="28" r="1.5" fill="white" opacity="0.55"/>
      <circle cx="78" cy="30" r="4.5" fill="url(#gemGreen)" stroke="#065f46" strokeWidth="1.2"/>
      <circle cx="78" cy="28" r="1.5" fill="white" opacity="0.55"/>
      <polygon points="55,35 50,42 55,39 60,42" fill="url(#gemRed)" stroke="#9f1239" strokeWidth="1.2"/>
      <polygon points="55,35 55,39 60,42 55,42" fill="#ff8fab" opacity="0.35"/>
      <path d="M20 38 Q40 28 55 38 Q70 28 90 38" fill="none" stroke="white" strokeWidth="1.5" opacity="0.22" strokeLinecap="round"/>
    </svg>
  );
}

function ReactionBubble({ emoji, text, id }: { emoji: string; text: string; id: number }) {
  return (
    <div
      key={id}
      className="absolute left-1/2 z-30 flex items-center gap-1.5 bg-white rounded-2xl px-4 py-2 shadow-xl border border-gray-100 pointer-events-none select-none"
      style={{
        bottom: '60%',
        transform: 'translateX(-50%)',
        animation: 'reactionFloat 3s ease-out forwards',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span className="text-sm font-black text-gray-700">{text}</span>
      <style>{`
        @keyframes reactionFloat {
          0%   { opacity:0;   transform:translateX(-50%) translateY(0)    scale(0.7); }
          10%  { opacity:1;   transform:translateX(-50%) translateY(-4px)  scale(1.08); }
          60%  { opacity:1;   transform:translateX(-50%) translateY(-20px) scale(1); }
          85%  { opacity:1;   transform:translateX(-50%) translateY(-28px) scale(1); }
          100% { opacity:0;   transform:translateX(-50%) translateY(-44px) scale(0.9); }
        }
      `}</style>
    </div>
  );
}

// 🔥 ADDED nutricoins to the parameters
export default function NutriBuddy({ vitality, level, streak, nutricoins, name = 'NutriBuddy' }: NutriBuddyProps) {
  const clamped    = clamp(vitality, 0, 100);
  const mood       = getMood(clamped);
  const cfg        = moodConfig[mood];
  const hasStreak  = streak >= 3;
  
  // 🔥 THE REAL XP MATH: Remainder of NutriCoins divided by 100
  const xp = nutricoins % 100;

  const [clickCount,  setClickCount]  = useState(0);
  const [isSquishing, setIsSquishing] = useState(false);
  const [reaction,    setReaction]    = useState<{ emoji: string; text: string; id: number } | null>(null);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const squishTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCatClick = useCallback(() => {
    const reactions = moodReactions[mood];
    const pick      = reactions[clickCount % reactions.length];

    if (squishTimer.current) clearTimeout(squishTimer.current);
    setIsSquishing(true);
    squishTimer.current = setTimeout(() => setIsSquishing(false), 400);

    if (reactionTimer.current) clearTimeout(reactionTimer.current);
    setReaction({ ...pick, id: Date.now() });
    reactionTimer.current = setTimeout(() => setReaction(null), 3000);

    setClickCount((c) => c + 1);
  }, [mood, clickCount]);

  return (
    <div
      className="rounded-[2rem] overflow-hidden shadow-2xl border border-white/60"
      style={{ fontFamily: "'DM Sans', sans-serif", background: 'white' }}
    >
      <div
        className="relative flex items-end justify-center overflow-hidden"
        style={{ height: '300px', background: `linear-gradient(160deg, ${cfg.bgFrom} 0%, ${cfg.bgTo} 100%)` }}
      >
        {(mood === 'happy' || hasStreak) && <Sparkles />}
        {hasStreak && <StreakParticles />}
        {mood === 'tired' && <ZzzFloat />}
        {mood === 'happy' && (
          <div className="absolute top-5 right-8 w-14 h-14 rounded-full bg-yellow-300 opacity-70"
            style={{ boxShadow: '0 0 34px 14px rgba(253,224,71,0.45)' }} />
        )}
        {mood === 'tired' && (
          <>
            <div className="absolute top-3 left-3  w-32 h-10 rounded-full bg-slate-300 opacity-50" />
            <div className="absolute top-1 left-24 w-20 h-9  rounded-full bg-slate-400 opacity-40" />
          </>
        )}

        {hasStreak && (
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 bg-orange-500 text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-lg"
            style={{ animation: 'badgePop 2s ease-in-out infinite' }}>
            🔥 {streak} DAY STREAK
          </div>
        )}

        <div className={cn('absolute top-4 right-4 z-20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg', cfg.badgeBg)}>
          {cfg.emoji} {cfg.label}
        </div>

        {reaction && <ReactionBubble emoji={reaction.emoji} text={reaction.text} id={reaction.id} />}

        <div
          className="relative z-10 cursor-pointer select-none"
          style={{
            marginBottom: '-6px',
            filter: `drop-shadow(0 10px 22px ${cfg.accentColor}55)`,
            animation: isSquishing
              ? 'catSquish 0.4s ease-in-out'
              : hasStreak
              ? 'catBounce 0.7s ease-in-out infinite alternate'
              : 'catIdle 3.5s ease-in-out infinite',
          }}
          onClick={handleCatClick}
          role="button"
          aria-label={`Pet ${name}`}
          title="Click me!"
        >
          {level >= 5 && (
            <div
              className="absolute left-1/2 z-20 pointer-events-none"
              style={{ top: cfg.crownOffset, transform: 'translateX(-50%)', animation: 'crownBob 2s ease-in-out infinite' }}
            >
              <Crown />
            </div>
          )}
          <Image key={mood} src={cfg.image} alt={`${name} feeling ${mood}`} width={260} height={260} className="object-contain" draggable={false} priority />
          {clickCount === 0 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <span className="text-[10px] font-bold text-white/80 bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-sm"
                style={{ animation: 'hintPulse 2s ease-in-out infinite' }}>
                tap me! 🐾
              </span>
            </div>
          )}
        </div>

        <style>{`
          @keyframes catBounce { 0%{transform:translateY(0)} 100%{transform:translateY(-12px)} }
          @keyframes catIdle   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
          @keyframes catSquish { 0%{transform:scale(1,1)} 20%{transform:scale(1.12,0.88)} 50%{transform:scale(0.95,1.05)} 80%{transform:scale(1.04,0.97)} 100%{transform:scale(1,1)} }
          @keyframes badgePop  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.07)} }
          @keyframes crownBob  { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-5px)} }
          @keyframes hintPulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        `}</style>
      </div>

      <div className="bg-white px-6 pt-5 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Your Companion</p>
            <h3 className="text-2xl font-black text-gray-900 leading-none">{name}</h3>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-sm font-black shadow"
            style={{ background: `linear-gradient(135deg, ${cfg.accentColor}ee, ${cfg.accentColor}88)` }}>
            ⭐ LVL {level}
          </span>
        </div>

        <div className="mb-3.5">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Vitality</span>
            <span className="text-sm font-black" style={{ color: cfg.accentColor }}>
              {clamped}<span className="text-gray-300 font-medium text-xs"> /100 HP</span>
            </span>
          </div>
          <div className="relative h-3.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={cn('absolute inset-y-0 left-0 rounded-full bg-gradient-to-r transition-all duration-700', cfg.barColor)}
              style={{ width: `${clamped}%` }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent rounded-full pointer-events-none" />
          </div>
        </div>

        <div className="mb-5">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">XP → Lv.{level + 1}</span>
            <span className="text-[10px] text-gray-300">{xp}/100</span>
          </div>
          <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 transition-all duration-700"
              style={{ width: `${xp}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'Streak', value: `${streak}d`,                           icon: '🔥', bg: 'bg-orange-50', border: 'border-orange-100', color: 'text-orange-700' },
            { label: 'Level',  value: String(level),                          icon: '⭐', bg: 'bg-violet-50', border: 'border-violet-100', color: 'text-violet-700' },
            { label: 'Aura',
              value: hasStreak ? 'Wok Hei' : mood === 'happy' ? 'Glowing' : mood === 'tired' ? 'Sleepy' : 'Calm',
              icon:  hasStreak ? '✨'       : mood === 'happy' ? '🌟'      : mood === 'tired' ? '💤'     : '😌',
              bg: 'bg-sky-50', border: 'border-sky-100', color: 'text-sky-700' },
          ].map(({ label, value, icon, bg, border, color }) => (
            <div key={label} className={cn('rounded-2xl p-3 text-center border', bg, border)}>
              <p className="text-lg mb-0.5">{icon}</p>
              <p className={cn('text-sm font-black leading-none', color)}>{value}</p>
              <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-widest mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}