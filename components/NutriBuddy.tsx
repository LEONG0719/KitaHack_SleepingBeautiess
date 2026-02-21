'use client';

import { cn } from '@/lib/utils';

interface NutriBuddyProps {
  vitality: number;
  level: number;
  streak: number;
  name?: string;
}

type Mood = 'happy' | 'neutral' | 'tired';

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getMood = (vitality: number): Mood => {
  if (vitality >= 70) return 'happy';
  if (vitality >= 40) return 'neutral';
  return 'tired';
};

const moodStyles: Record<
  Mood,
  {
    ring: string;
    bg: string;
    stroke: string;
    text: string;
  }
> = {
  happy: {
    ring: 'ring-emerald-400/60',
    bg: 'bg-emerald-50',
    stroke: '#047857',
    text: 'text-emerald-700',
  },
  neutral: {
    ring: 'ring-yellow-400/60',
    bg: 'bg-yellow-50',
    stroke: '#b45309',
    text: 'text-yellow-700',
  },
  tired: {
    ring: 'ring-gray-400/60',
    bg: 'bg-gray-100',
    stroke: '#4b5563',
    text: 'text-gray-700',
  },
};

const mouthPath: Record<Mood, string> = {
  happy: 'M40 70 Q60 88 80 70',
  neutral: 'M40 74 H80',
  tired: 'M40 70 Q60 90 80 70',
};

export default function NutriBuddy({
  vitality,
  level,
  streak,
  name = 'NutriBuddy',
}: NutriBuddyProps) {
  const clampedVitality = clamp(vitality, 0, 100);
  const mood = getMood(clampedVitality);
  const styles = moodStyles[mood];
  const showCrown = level >= 5;
  const showStreak = streak >= 3;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div
          className={cn(
            'relative flex items-center justify-center',
            showStreak && 'nutri-buddy-bounce'
          )}
          aria-live="polite"
        >
          {showStreak && (
            <div
              className="nutri-buddy-fire absolute -inset-5 rounded-full"
              aria-hidden="true"
            />
          )}

          {showCrown && (
            <svg
              viewBox="0 0 80 40"
              className="absolute -top-6 w-16 h-8"
              aria-hidden="true"
            >
              <path
                d="M5 32 L15 10 L30 26 L40 6 L50 26 L65 10 L75 32 Z"
                fill="#f59e0b"
                stroke="#b45309"
                strokeWidth="2"
              />
              <circle cx="15" cy="10" r="3" fill="#fde68a" />
              <circle cx="40" cy="6" r="3" fill="#fde68a" />
              <circle cx="65" cy="10" r="3" fill="#fde68a" />
            </svg>
          )}

          <div
            className={cn(
              'relative w-32 h-32 rounded-full ring-4 flex items-center justify-center',
              styles.ring,
              styles.bg
            )}
            role="img"
            aria-label={`${name} mood is ${mood}`}
          >
            <svg viewBox="0 0 120 120" className="w-24 h-24">
              <circle
                cx="60"
                cy="60"
                r="46"
                fill="#ffffff"
                stroke={styles.stroke}
                strokeWidth="4"
              />
              <circle cx="45" cy="52" r="6" fill={styles.stroke} />
              <circle cx="75" cy="52" r="6" fill={styles.stroke} />
              {mood === 'tired' && (
                <>
                  <line
                    x1="38"
                    y1="50"
                    x2="52"
                    y2="50"
                    stroke="#9ca3af"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <line
                    x1="68"
                    y1="50"
                    x2="82"
                    y2="50"
                    stroke="#9ca3af"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </>
              )}
              <path
                d={mouthPath[mood]}
                fill="none"
                stroke={styles.stroke}
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        <div className="flex-1 w-full">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-sm text-gray-500">Your companion</p>
              <h3 className="text-xl font-bold text-gray-900">{name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-semibold border',
                  styles.text,
                  styles.bg,
                  'border-transparent'
                )}
              >
                {mood === 'happy'
                  ? 'Happy Emerald'
                  : mood === 'neutral'
                  ? 'Neutral Yellow'
                  : 'Tired Gray'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Vitality (HP)</span>
                <span className="font-semibold text-gray-900">
                  {clampedVitality}/100
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', styles.bg)}
                  style={{ width: `${clampedVitality}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Level</p>
                <p className="text-lg font-bold text-gray-900">{level}</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Streak</p>
                <p className="text-lg font-bold text-gray-900">
                  {streak}d
                </p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">Aura</p>
                <p className="text-sm font-semibold text-gray-900">
                  {showStreak ? 'Wok Hei' : 'Calm'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
