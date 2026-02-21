'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Stepper from '@/components/Stepper';
import MealCard from '@/components/MealCard';
import Toast from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import NutriBuddy from '@/components/NutriBuddy';
import { Button } from '@/components/ui/button';
import { MealPlan, Meal } from '@/lib/types';
import { saveMealPlanToFirestore } from '@/lib/firestore';
import {
  Flame,
  DollarSign,
  Calendar,
  ShoppingCart,
  Save,
  RefreshCw,
  Bell,
} from 'lucide-react';

const CHECKLIST_KEY = 'nutriChecklist';
const REMINDER_KEY = 'nutriReminders';

type MealLog = {
  adherence: number;
  photo: boolean;
  completed: boolean;
  loggedAt?: string;
};

type DayChecklist = {
  breakfast: MealLog;
  lunch: MealLog;
  dinner: MealLog;
};

type ChecklistMap = Record<string, DayChecklist>;

type ReminderSettings = {
  enabled: boolean;
  times: {
    breakfast: string;
    lunch: string;
    dinner: string;
  };
};

const defaultMealLog: MealLog = {
  adherence: 0,
  photo: false,
  completed: false,
};

const defaultChecklist: DayChecklist = {
  breakfast: { ...defaultMealLog },
  lunch: { ...defaultMealLog },
  dinner: { ...defaultMealLog },
};

const defaultReminders: ReminderSettings = {
  enabled: false,
  times: {
    breakfast: '08:00',
    lunch: '12:30',
    dinner: '19:00',
  },
};

const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeMealLog = (value: unknown): MealLog => {
  if (typeof value === 'boolean') {
    return {
      adherence: value ? 100 : 0,
      photo: false,
      completed: value,
    };
  }

  if (typeof value === 'object' && value !== null) {
    const raw = value as Partial<MealLog>;
    return {
      adherence: typeof raw.adherence === 'number' ? raw.adherence : 0,
      photo: Boolean(raw.photo),
      completed: Boolean(raw.completed),
      loggedAt: raw.loggedAt,
    };
  }

  return { ...defaultMealLog };
};

const normalizeDayChecklist = (value: unknown): DayChecklist => {
  if (typeof value === 'object' && value !== null) {
    const raw = value as Record<string, unknown>;
    return {
      breakfast: normalizeMealLog(raw.breakfast),
      lunch: normalizeMealLog(raw.lunch),
      dinner: normalizeMealLog(raw.dinner),
    };
  }

  return {
    breakfast: { ...defaultMealLog },
    lunch: { ...defaultMealLog },
    dinner: { ...defaultMealLog },
  };
};

const loadChecklistMap = (): ChecklistMap => {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(CHECKLIST_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<ChecklistMap>((acc, [key, value]) => {
      acc[key] = normalizeDayChecklist(value);
      return acc;
    }, {});
  } catch (error) {
    return {};
  }
};

const saveChecklistMap = (map: ChecklistMap) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHECKLIST_KEY, JSON.stringify(map));
};

const getChecklistForToday = (map: ChecklistMap): DayChecklist => {
  const key = getDateKey();
  return map[key] ? normalizeDayChecklist(map[key]) : normalizeDayChecklist(null);
};

const isDayComplete = (checklist: DayChecklist) =>
  checklist.breakfast.completed &&
  checklist.lunch.completed &&
  checklist.dinner.completed;

const computeStreak = (map: ChecklistMap) => {
  let streak = 0;
  const cursor = new Date();
  while (true) {
    const key = getDateKey(cursor);
    const day = map[key];
    if (!day || !isDayComplete(day)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const timeWindows: Record<keyof DayChecklist, { start: number; end: number }> = {
  breakfast: { start: 6, end: 10 },
  lunch: { start: 11, end: 14 },
  dinner: { start: 18, end: 21 },
};

const isWithinWindow = (mealKey: keyof DayChecklist, date = new Date()) => {
  const { start, end } = timeWindows[mealKey];
  const hours = date.getHours();
  return hours >= start && hours < end;
};

const loadReminders = (): ReminderSettings => {
  if (typeof window === 'undefined') return defaultReminders;
  const raw = localStorage.getItem(REMINDER_KEY);
  if (!raw) return defaultReminders;
  try {
    const parsed = JSON.parse(raw) as ReminderSettings;
    return {
      enabled: parsed.enabled ?? defaultReminders.enabled,
      times: {
        breakfast: parsed.times?.breakfast || defaultReminders.times.breakfast,
        lunch: parsed.times?.lunch || defaultReminders.times.lunch,
        dinner: parsed.times?.dinner || defaultReminders.times.dinner,
      },
    };
  } catch (error) {
    return defaultReminders;
  }
};

const saveReminders = (settings: ReminderSettings) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
};

export default function ResultPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<MealPlan | null>(null);
  const [swappingMeal, setSwappingMeal] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [checklist, setChecklist] = useState<DayChecklist>(defaultChecklist);
  const [streak, setStreak] = useState(0);
  const [reminders, setReminders] = useState<ReminderSettings>(defaultReminders);
  const [expandedMeal, setExpandedMeal] = useState<keyof DayChecklist | null>(
    null
  );
  const scheduledRemindersRef = useRef<number[]>([]);
  const [buddyStats, setBuddyStats] = useState({
    vitality: 78,
    level: 4,
    streak: 2,
  });

  useEffect(() => {
    const planStr = localStorage.getItem('currentPlan');
    if (!planStr) {
      router.push('/plan');
      return;
    }

    const loadedPlan: MealPlan = JSON.parse(planStr);
    setPlan(loadedPlan);

    const checklistMap = loadChecklistMap();
    const todayChecklist = getChecklistForToday(checklistMap);
    setChecklist(todayChecklist);
    setStreak(computeStreak(checklistMap));

    const reminderSettings = loadReminders();
    setReminders(reminderSettings);

    const buddyStr = localStorage.getItem('nutriBuddyStats');
    if (buddyStr) {
      try {
        const parsed = JSON.parse(buddyStr) as Partial<{
          vitality: number;
          level: number;
          streak: number;
        }>;
        const next = {
          vitality:
            typeof parsed.vitality === 'number'
              ? Math.max(0, Math.min(100, parsed.vitality))
              : 78,
          level:
            typeof parsed.level === 'number'
              ? Math.max(1, Math.floor(parsed.level))
              : 4,
          streak:
            typeof parsed.streak === 'number'
              ? Math.max(0, Math.floor(parsed.streak))
              : 2,
        };
        setBuddyStats({ ...next, streak: computeStreak(checklistMap) });
      } catch (error) {
        setBuddyStats({ vitality: 78, level: 4, streak: computeStreak(checklistMap) });
      }
    } else {
      setBuddyStats((prev) => ({ ...prev, streak: computeStreak(checklistMap) }));
    }
  }, [router]);

  useEffect(() => {
    if (!reminders.enabled) {
      scheduledRemindersRef.current.forEach((id) => window.clearTimeout(id));
      scheduledRemindersRef.current = [];
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    scheduledRemindersRef.current.forEach((id) => window.clearTimeout(id));

    const now = new Date();
    const timeouts: number[] = [];

    (['breakfast', 'lunch', 'dinner'] as const).forEach((mealKey) => {
      const time = reminders.times[mealKey];
      const [hours, minutes] = time.split(':').map((value) => Number(value));
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      if (target.getTime() > now.getTime()) {
        const timeoutId = window.setTimeout(() => {
          new Notification('NutriBalance reminder', {
            body: `Time for your ${mealKey} meal!`,
          });
        }, target.getTime() - now.getTime());
        timeouts.push(timeoutId);
      }
    });

    scheduledRemindersRef.current = timeouts;

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [reminders]);

  const handleSwapMeal = async (
    mealType: 'breakfast' | 'lunch' | 'dinner',
    currentMeal: Meal
  ) => {
    if (!plan) return;

    setSwappingMeal(mealType);

    try {
      // Call the real API route for AI-powered meal swap
      const response = await fetch('/api/swap-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentMeal, preferences: plan.preferences }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to swap meal');
      }

      const newMeal: Meal = await response.json();

      const updatedPlan = {
        ...plan,
        [mealType]: newMeal,
        totalCost:
          (mealType === 'breakfast'
            ? newMeal.cost
            : plan.breakfast.cost) +
          (mealType === 'lunch' ? newMeal.cost : plan.lunch.cost) +
          (mealType === 'dinner' ? newMeal.cost : plan.dinner.cost),
        totalCaloriesMin:
          (mealType === 'breakfast'
            ? newMeal.caloriesMin
            : plan.breakfast.caloriesMin) +
          (mealType === 'lunch'
            ? newMeal.caloriesMin
            : plan.lunch.caloriesMin) +
          (mealType === 'dinner'
            ? newMeal.caloriesMin
            : plan.dinner.caloriesMin),
        totalCaloriesMax:
          (mealType === 'breakfast'
            ? newMeal.caloriesMax
            : plan.breakfast.caloriesMax) +
          (mealType === 'lunch'
            ? newMeal.caloriesMax
            : plan.lunch.caloriesMax) +
          (mealType === 'dinner'
            ? newMeal.caloriesMax
            : plan.dinner.caloriesMax),
      };

      setPlan(updatedPlan);
      localStorage.setItem('currentPlan', JSON.stringify(updatedPlan));

      setToast({
        message: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} swapped successfully!`,
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: 'Failed to swap meal. Please try again.',
        type: 'error',
      });
    } finally {
      setSwappingMeal(null);
    }
  };

  const handleSavePlan = async () => {
    if (!plan) return;

    try {
      // Save to Firestore
      await saveMealPlanToFirestore(plan);

      setToast({
        message: 'Meal plan saved successfully!',
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: 'Failed to save plan. Please try again.',
        type: 'error',
      });
    }
  };

  const handleGenerateWeekPlan = () => {
    setToast({
      message: 'Weekly plan generation coming soon!',
      type: 'info',
    });
  };

  const handleGenerateShoppingList = () => {
    if (!plan) return;

    const allIngredients = [
      ...plan.breakfast.ingredients,
      ...plan.lunch.ingredients,
      ...plan.dinner.ingredients,
    ];

    const uniqueIngredients = Array.from(new Set(allIngredients));

    const shoppingList = {
      date: new Date().toLocaleDateString(),
      ingredients: uniqueIngredients,
      totalCost: plan.totalCost,
    };

    localStorage.setItem('shoppingList', JSON.stringify(shoppingList));

    setToast({
      message: 'Shopping list created! (Check console for details)',
      type: 'success',
    });

    console.log('Shopping List:', shoppingList);
  };

  const handleNewPlan = () => {
    localStorage.removeItem('currentPlan');
    router.push('/plan');
  };

  const persistBuddyStreak = (nextStreak: number) => {
    setBuddyStats((prev) => ({ ...prev, streak: nextStreak }));
    try {
      const raw = localStorage.getItem('nutriBuddyStats');
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'nutriBuddyStats',
        JSON.stringify({ ...existing, streak: nextStreak })
      );
    } catch (error) {
      localStorage.setItem(
        'nutriBuddyStats',
        JSON.stringify({ streak: nextStreak })
      );
    }
  };

  const handleAdherenceChange = (
    mealKey: keyof DayChecklist,
    value: number
  ) => {
    setChecklist((prev) => ({
      ...prev,
      [mealKey]: {
        ...prev[mealKey],
        adherence: value,
      },
    }));
  };

  const handlePhotoChange = (mealKey: keyof DayChecklist, file?: File | null) => {
    setChecklist((prev) => ({
      ...prev,
      [mealKey]: {
        ...prev[mealKey],
        photo: Boolean(file),
      },
    }));
  };

  const handleLogMeal = (mealKey: keyof DayChecklist) => {
    const now = new Date();
    const mealLog = checklist[mealKey];
    const meetsAdherence = mealLog.adherence >= 80;
    const inWindow = isWithinWindow(mealKey, now);
    const completed = meetsAdherence && inWindow;

    const nextChecklist: DayChecklist = {
      ...checklist,
      [mealKey]: {
        ...mealLog,
        completed,
        loggedAt: now.toISOString(),
      },
    };

    setChecklist(nextChecklist);

    const checklistMap = loadChecklistMap();
    const todayKey = getDateKey();
    checklistMap[todayKey] = nextChecklist;
    saveChecklistMap(checklistMap);

    const nextStreak = computeStreak(checklistMap);
    setStreak(nextStreak);
    persistBuddyStreak(nextStreak);

    if (!meetsAdherence) {
      setToast({
        message: 'Log saved. Only 80%+ adherence counts toward your streak.',
        type: 'info',
      });
      return;
    }

    if (!inWindow) {
      setToast({
        message: 'Log saved. Outside the meal time window, so no streak count.',
        type: 'info',
      });
      return;
    }

    setToast({
      message: 'Meal logged! Streak updated.',
      type: 'success',
    });
  };

  const handleReminderToggle = async () => {
    const nextEnabled = !reminders.enabled;

    if (nextEnabled) {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setToast({
          message: 'Notifications are not supported in this browser.',
          type: 'info',
        });
        return;
      }

      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setToast({
            message: 'Enable notifications in your browser to use reminders.',
            type: 'info',
          });
          return;
        }
      } else if (Notification.permission !== 'granted') {
        setToast({
          message: 'Enable notifications in your browser to use reminders.',
          type: 'info',
        });
        return;
      }
    }

    const nextSettings = {
      ...reminders,
      enabled: nextEnabled,
    };
    setReminders(nextSettings);
    saveReminders(nextSettings);
  };

  const handleReminderTimeChange = (
    mealKey: keyof ReminderSettings['times'],
    value: string
  ) => {
    const nextSettings = {
      ...reminders,
      times: {
        ...reminders.times,
        [mealKey]: value,
      },
    };
    setReminders(nextSettings);
    saveReminders(nextSettings);
  };

  const completedCount = Object.values(checklist).filter(
    (entry) => entry.completed
  ).length;
  const completionPercent = Math.round((completedCount / 3) * 100);

  if (!plan) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <p className="text-gray-600">Loading your meal plan...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Stepper currentStep={3} steps={['Preferences', 'Loading', 'Results']} />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-emerald-100">
                  Results Ready
                </p>
                <h1 className="text-3xl font-bold mb-2">
                  Your Personalized Meal Plan
                </h1>
                <p className="text-emerald-100">
                  A balanced daily plan tailored to your preferences
                </p>
              </div>
              <div className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                Plan for Today
              </div>
            </div>
          </div>

          <div className="mb-8">
            <NutriBuddy
              vitality={buddyStats.vitality}
              level={buddyStats.level}
              streak={buddyStats.streak}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Daily Checklist
                  </h3>
                  <p className="text-sm text-gray-600">
                    Complete meals to build your streak.
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Current streak</p>
                  <p className="text-2xl font-bold text-emerald-600">
                    {streak}d
                  </p>
                </div>
              </div>

              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              <div className="space-y-2">
                {(
                  [
                    { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
                    { key: 'lunch', label: 'Lunch', icon: '☀️' },
                    { key: 'dinner', label: 'Dinner', icon: '🌙' },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() =>
                        setExpandedMeal(
                          expandedMeal === item.key ? null : item.key
                        )
                      }
                      className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-2xl">{item.icon}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">
                              {item.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {timeWindows[item.key].start}:00–
                              {timeWindows[item.key].end}:00
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`inline-block text-xs font-semibold py-1 px-2.5 rounded ${
                              checklist[item.key].completed
                                ? 'bg-emerald-100 text-emerald-700'
                                : checklist[item.key].adherence > 0
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {checklist[item.key].completed
                              ? 'Counted'
                              : checklist[item.key].adherence > 0
                              ? 'Pending'
                              : 'Not logged'}
                          </span>
                          <div className="text-right mt-1">
                            <p className="text-xs text-gray-500">
                              {checklist[item.key].adherence}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </button>

                    {expandedMeal === item.key && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <label className="font-medium text-gray-900">
                              How well did you follow the plan?
                            </label>
                            <span className="text-xs text-gray-500">
                              {checklist[item.key].adherence}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={10}
                            value={checklist[item.key].adherence}
                            onChange={(event) =>
                              handleAdherenceChange(
                                item.key,
                                Number(event.target.value)
                              )
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            80% or higher counts toward your streak.
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Add a photo (optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) =>
                              handlePhotoChange(
                                item.key,
                                event.target.files?.[0]
                              )
                            }
                            className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
                          />
                          {checklist[item.key].photo && (
                            <p className="text-xs text-blue-600 mt-1">
                              Photo attached
                            </p>
                          )}
                        </div>

                        <div className="flex gap-3">
                          <Button
                            type="button"
                            onClick={() => handleLogMeal(item.key)}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          >
                            Log & Save
                          </Button>
                          <Button
                            type="button"
                            onClick={() => setExpandedMeal(null)}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Reminders
                  </h3>
                  <p className="text-sm text-gray-600">
                    Gentle nudges while this page is open.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleReminderToggle}
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                    reminders.enabled
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {reminders.enabled ? 'Enabled' : 'Enable'}
                </button>
              </div>

              <div className="space-y-4">
                {(
                  [
                    { key: 'breakfast', label: 'Breakfast' },
                    { key: 'lunch', label: 'Lunch' },
                    { key: 'dinner', label: 'Dinner' },
                  ] as const
                ).map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <input
                      type="time"
                      value={reminders.times[item.key]}
                      onChange={(event) =>
                        handleReminderTimeChange(item.key, event.target.value)
                      }
                      disabled={!reminders.enabled}
                      className="border rounded-md px-2 py-1 text-sm"
                    />
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Notifications must be enabled in your browser.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <DollarSign className="w-5 h-5 text-emerald-600 mr-2" />
                <span className="text-sm text-gray-600 font-medium">
                  Total Daily Cost
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                RM {plan.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Within your budget of RM {plan.preferences.budgetPerMeal * 3}
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <Flame className="w-5 h-5 text-orange-600 mr-2" />
                <span className="text-sm text-gray-600 font-medium">
                  Calorie Range
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {plan.totalCaloriesMin}-{plan.totalCaloriesMax}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Approximate daily range
              </p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center mb-2">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-sm text-gray-600 font-medium">Date</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">Today</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-MY', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-8 mb-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-yellow-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-2xl">🌅</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Breakfast</h2>
              </div>
              <MealCard
                meal={plan.breakfast}
                onSwap={() => handleSwapMeal('breakfast', plan.breakfast)}
                isSwapping={swappingMeal === 'breakfast'}
              />
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div className="bg-orange-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-2xl">☀️</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Lunch</h2>
              </div>
              <MealCard
                meal={plan.lunch}
                onSwap={() => handleSwapMeal('lunch', plan.lunch)}
                isSwapping={swappingMeal === 'lunch'}
              />
            </div>

            <div>
              <div className="flex items-center mb-4">
                <div className="bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center mr-3">
                  <span className="text-2xl">🌙</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Dinner</h2>
              </div>
              <MealCard
                meal={plan.dinner}
                onSwap={() => handleSwapMeal('dinner', plan.dinner)}
                isSwapping={swappingMeal === 'dinner'}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-8">
            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={handleSavePlan}
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save This Plan
              </Button>

              <Button
                onClick={handleGenerateWeekPlan}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Generate Week Plan
              </Button>

              <Button
                onClick={handleGenerateShoppingList}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Shopping List
              </Button>

              <Button
                onClick={handleNewPlan}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Create New Plan
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-2">About Your Plan</h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  All meals are selected based on your dietary preferences and
                  budget constraints.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Calorie ranges are approximate and based on typical Malaysian
                  portions.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Prices may vary based on location and ingredient availability.
                </span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>
                  Use the Swap button to try different meal options that match
                  your preferences.
                </span>
              </li>
            </ul>
          </div>
        </main>

        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
