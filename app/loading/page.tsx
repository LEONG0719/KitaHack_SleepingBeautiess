'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Stepper from '@/components/Stepper';
import { UserPreferences } from '@/lib/types';
import { Loader2, Sparkles } from 'lucide-react';

const LOADING_MESSAGES = [
  'Analyzing your preferences...',
  'Applying nutrition safety rules...',
  'Consulting Gemini AI for personalized meals...',
  'Finding the best Malaysian dishes for you...',
  'Creating your personalized plan...',
];

export default function LoadingPage() {
  const router = useRouter();
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev
      );
    }, 1500);

    const generatePlan = async () => {
      try {
        const preferencesStr = localStorage.getItem('userPreferences');
        if (!preferencesStr) {
          router.push('/plan');
          return;
        }

        const preferences: UserPreferences = JSON.parse(preferencesStr);

        // Call the real API route (Gemini AI + Rule Engine)
        const response = await fetch('/api/generate-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(preferences),
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
      } catch (err: any) {
        console.error('Error generating plan:', err);
        setError(err.message || 'Something went wrong. Please try again.');
      }
    };

    generatePlan();

    return () => clearInterval(interval);
  }, [router]);

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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-white">
      <Navbar />
      <Stepper currentStep={2} steps={['Preferences', 'Loading', 'Results']} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 p-10 sm:p-12">
          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                In the kitchen
              </span>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mt-4 mb-3">
                Crafting Your Meal Plan
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Our AI is balancing nutrition, budget, and local flavors.
              </p>

              <div className="bg-amber-50 rounded-lg p-5">
                <p className="text-amber-700 font-medium">
                  {LOADING_MESSAGES[messageIndex]}
                </p>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mt-6">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${((messageIndex + 1) / LOADING_MESSAGES.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="h-44 w-44 rounded-full bg-amber-100 flex items-center justify-center">
                <Sparkles className="w-20 h-20 text-amber-600 animate-pulse" />
              </div>
              <div className="absolute -bottom-3 -right-3 h-12 w-12 rounded-full bg-white border border-amber-200 shadow-sm flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
