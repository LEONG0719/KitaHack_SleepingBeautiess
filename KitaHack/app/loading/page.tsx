'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Stepper from '@/components/Stepper';
import { UserPreferences } from '@/lib/types';
import { Loader2, Sparkles } from 'lucide-react';

const DAILY_LOADING_MESSAGES = [
  'Analyzing your preferences...',
  'Applying nutrition safety rules...',
  'Consulting Gemini AI for personalized meals...',
  'Finding the best Malaysian dishes for you...',
  'Creating your personalized plan...',
];

const WEEKLY_LOADING_MESSAGES = [
  'Analyzing your preferences...',
  'Building your Cook vs. Buy schedule...',
  'Planning 7 days of Malaysian meals...',
  'Consulting Gemini AI for hybrid planning...',
  'Aggregating your smart grocery list...',
  'Estimating local market prices...',
  'Finalizing your weekly meal matrix...',
];

export default function LoadingPage() {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'daily' | 'weekly'>('daily');
  const [ready, setReady] = useState(false);

  // Read planType from localStorage on mount (client-side only)
  useEffect(() => {
    const storedType = localStorage.getItem('planType') || 'daily';
    setPlanType(storedType as 'daily' | 'weekly');
    setReady(true);
  }, []);

  // Run the plan generation + message ticker after planType is known
  useEffect(() => {
    if (!ready) return;

    const messages = planType === 'weekly' ? WEEKLY_LOADING_MESSAGES : DAILY_LOADING_MESSAGES;

    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < messages.length - 1 ? prev + 1 : prev
      );
    }, planType === 'weekly' ? 2000 : 1500);

    const generatePlan = async () => {
      try {
        const preferencesStr = localStorage.getItem('userPreferences');
        if (!preferencesStr) {
          router.push('/plan');
          return;
        }

        const preferences: UserPreferences = JSON.parse(preferencesStr);
        const seasonalRules = localStorage.getItem('nutribalance_seasonal_rules') || undefined;

        if (planType === 'weekly') {
          const response = await fetch('/api/generate-weekly-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...preferences, seasonalRules }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to generate weekly meal plan');
          }

          const weeklyPlan = await response.json();
          localStorage.setItem('currentWeeklyPlan', JSON.stringify(weeklyPlan));

          setTimeout(() => {
            router.push('/weekly-result');
          }, 500);
        } else {
          const response = await fetch('/api/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...preferences, seasonalRules }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to generate meal plan');
          }

          const plan = await response.json();
          localStorage.setItem('currentPlan', JSON.stringify(plan));

          setTimeout(() => {
            router.push('/result');
          }, 500);
        }
      } catch (err: any) {
        console.error('Error generating plan:', err);
        setError(err.message || 'Something went wrong. Please try again.');
      }
    };

    generatePlan();

    return () => clearInterval(interval);
  }, [router, planType, ready]);

  const messages = planType === 'weekly' ? WEEKLY_LOADING_MESSAGES : DAILY_LOADING_MESSAGES;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8">
            <h2 className="text-xl font-bold text-red-900 mb-2">
              Oops! Something went wrong
            </h2>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={() => router.push('/plan')}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <Stepper currentStep={2} steps={['Preferences', 'Loading', 'Results']} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="bg-emerald-100 rounded-full p-6">
                <Sparkles className="w-16 h-16 text-emerald-600 animate-pulse" />
              </div>
              <Loader2 className="w-8 h-8 text-emerald-600 absolute -bottom-2 -right-2 animate-spin" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {planType === 'weekly'
              ? 'Building Your 7-Day Meal Matrix'
              : 'Creating Your Perfect Meal Plan'}
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            {planType === 'weekly'
              ? 'This may take a moment — planning a full week of meals...'
              : 'This will only take a moment...'}
          </p>

          <div className="bg-emerald-50 rounded-lg p-6 mb-6">
            <p className="text-emerald-700 font-medium">
              {messages[messageIndex]}
            </p>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-emerald-600 h-2 rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${((messageIndex + 1) / messages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

