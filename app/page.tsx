'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Utensils,
  Clock,
  DollarSign,
  Heart,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <Navbar />

      <main>
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-emerald-100 rounded-full p-4">
                <Utensils className="w-12 h-12 text-emerald-600" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Your Personal Meal Planner for{' '}
              <span className="text-emerald-600">Malaysia</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Get personalized, budget-friendly meal plans tailored to your
              lifestyle, dietary needs, and favorite cuisines. Made for
              Malaysian students and young professionals.
            </p>

            <Link href="/plan">
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Create Your Meal Plan
              </Button>
            </Link>

            <p className="text-sm text-gray-500 mt-4">
              Takes less than 2 minutes
            </p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="bg-emerald-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                Budget-Friendly
              </h3>
              <p className="text-gray-600 text-sm">
                Set your meal budget (RM 10-30) and get affordable meal
                suggestions that fit your wallet.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                Halal & Dietary Options
              </h3>
              <p className="text-gray-600 text-sm">
                Choose from Halal, vegetarian, vegan options, plus no pork/beef
                preferences and allergy filters.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="bg-orange-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Utensils className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                Local Cuisines
              </h3>
              <p className="text-gray-600 text-sm">
                Enjoy authentic Malay, Chinese, Indian, and Western dishes from
                Malaysian food culture.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                Quick & Easy
              </h3>
              <p className="text-gray-600 text-sm">
                Filter by meal prep time whether you want quick 10-minute meals
                or elaborate 30-minute dishes.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-emerald-50 py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How It Works
              </h2>
              <p className="text-gray-600">
                Simple steps to get your personalized meal plan
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  1
                </div>
                <h3 className="font-bold text-lg mb-2">Share Your Preferences</h3>
                <p className="text-gray-600 text-sm">
                  Tell us about your dietary needs, favorite cuisines, budget,
                  and lifestyle goals.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  2
                </div>
                <h3 className="font-bold text-lg mb-2">Get Your Plan</h3>
                <p className="text-gray-600 text-sm">
                  Our AI generates a personalized daily meal plan with
                  breakfast, lunch, and dinner.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
                  3
                </div>
                <h3 className="font-bold text-lg mb-2">Customize & Save</h3>
                <p className="text-gray-600 text-sm">
                  Swap meals you don't like, generate weekly plans, and save
                  your favorites.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-2xl p-8 sm:p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Start Eating Better?
            </h2>
            <p className="text-emerald-100 mb-8 text-lg">
              Join students across Malaysia who are planning healthier,
              budget-friendly meals.
            </p>
            <Link href="/plan">
              <Button
                size="lg"
                className="bg-white text-emerald-600 hover:bg-gray-100 px-8 py-6 text-lg rounded-lg shadow-lg"
              >
                Get Started Now
              </Button>
            </Link>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-16">
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-gray-900 mb-2">
                  Nutrition Information Note
                </h3>
                <p className="text-sm text-gray-700">
                  All calorie counts are approximate ranges based on typical
                  Malaysian portions. This tool is designed to help you explore
                  balanced meal options. For personalized dietary advice, please
                  consult a registered dietitian or nutritionist.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-600">
            NutriBalance AI - Made for Malaysian Students
          </p>
        </div>
      </footer>
    </div>
  );
}
