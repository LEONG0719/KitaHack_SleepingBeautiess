'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Stepper from '@/components/Stepper';
import Toast from '@/components/Toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPreferences } from '@/lib/types';
import { ArrowRight, ArrowLeft } from 'lucide-react';

const CUISINES = ['Malay', 'Chinese', 'Indian', 'Western'];
const COMMON_ALLERGIES = ['Peanuts', 'Shellfish', 'Dairy', 'Eggs', 'Soy', 'Gluten'];

export default function PlanPage() {
  const router = useRouter();
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>({
    ageGroup: 'adult',
    activityLevel: 'moderate',
    isHalal: false,
    isVegetarian: false,
    isVegan: false,
    noPork: false,
    noBeef: false,
    allergies: [],
    customAllergies: '',
    favoriteCuisines: [],
    mealSpeed: 'normal',
    budgetPerMeal: 15,
    goals: 'balanced',
  });

  const handleCuisineToggle = (cuisine: string) => {
    setPreferences((prev) => ({
      ...prev,
      favoriteCuisines: prev.favoriteCuisines.includes(cuisine)
        ? prev.favoriteCuisines.filter((c) => c !== cuisine)
        : [...prev.favoriteCuisines, cuisine],
    }));
  };

  const handleAllergyToggle = (allergy: string) => {
    setPreferences((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }));
  };

  const validateForm = (): boolean => {
    if (preferences.budgetPerMeal < 10 || preferences.budgetPerMeal > 30) {
      setToast({
        message: 'Budget per meal must be between RM 10 and RM 30',
        type: 'error',
      });
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    localStorage.setItem('userPreferences', JSON.stringify(preferences));
    router.push('/loading');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Stepper currentStep={1} steps={['Preferences', 'Loading', 'Results']} />

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tell Us About You
            </h1>
            <p className="text-gray-600 mb-8">
              Help us create the perfect meal plan for your needs
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Basic Information
                </h2>

                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Age Group
                    </Label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="ageGroup"
                          value="teen"
                          checked={preferences.ageGroup === 'teen'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              ageGroup: e.target.value as 'teen' | 'adult',
                            }))
                          }
                          className="w-4 h-4 text-emerald-600"
                        />
                        <span className="text-sm">Teen (13-17)</span>
                      </label>
                      <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="ageGroup"
                          value="adult"
                          checked={preferences.ageGroup === 'adult'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              ageGroup: e.target.value as 'teen' | 'adult',
                            }))
                          }
                          className="w-4 h-4 text-emerald-600"
                        />
                        <span className="text-sm">Adult (18+)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Activity Level
                    </Label>
                    <select
                      value={preferences.activityLevel}
                      onChange={(e) =>
                        setPreferences((prev) => ({
                          ...prev,
                          activityLevel: e.target.value as any,
                        }))
                      }
                      className="w-full p-3 border rounded-lg text-sm"
                    >
                      <option value="sedentary">Sedentary (Little/no exercise)</option>
                      <option value="light">Light (1-3 days/week)</option>
                      <option value="moderate">Moderate (3-5 days/week)</option>
                      <option value="active">Active (6-7 days/week)</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Dietary Rules
                </h2>

                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={preferences.isHalal}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            isHalal: checked as boolean,
                          }))
                        }
                      />
                      <span className="text-sm font-medium">Halal Only</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={preferences.isVegetarian}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            isVegetarian: checked as boolean,
                          }))
                        }
                      />
                      <span className="text-sm font-medium">Vegetarian</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={preferences.isVegan}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            isVegan: checked as boolean,
                          }))
                        }
                      />
                      <span className="text-sm font-medium">Vegan</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={preferences.noPork}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            noPork: checked as boolean,
                          }))
                        }
                      />
                      <span className="text-sm font-medium">No Pork</span>
                    </label>

                    <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <Checkbox
                        checked={preferences.noBeef}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            noBeef: checked as boolean,
                          }))
                        }
                      />
                      <span className="text-sm font-medium">No Beef</span>
                    </label>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Allergies (Select all that apply)
                    </Label>
                    <div className="grid sm:grid-cols-3 gap-2">
                      {COMMON_ALLERGIES.map((allergy) => (
                        <label
                          key={allergy}
                          className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                        >
                          <Checkbox
                            checked={preferences.allergies.includes(allergy)}
                            onCheckedChange={() => handleAllergyToggle(allergy)}
                          />
                          <span className="text-sm">{allergy}</span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-3">
                      <Input
                        placeholder="Other allergies (comma separated)"
                        value={preferences.customAllergies}
                        onChange={(e) =>
                          setPreferences((prev) => ({
                            ...prev,
                            customAllergies: e.target.value,
                          }))
                        }
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Food Preferences
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Favorite Cuisines (Select your favorites)
                    </Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {CUISINES.map((cuisine) => (
                        <button
                          key={cuisine}
                          type="button"
                          onClick={() => handleCuisineToggle(cuisine)}
                          className={`p-4 rounded-lg border-2 transition-all text-sm font-medium ${preferences.favoriteCuisines.includes(cuisine)
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                          {cuisine}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Leave unselected to see all cuisines
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Meal Speed Preference
                    </Label>
                    <div className="grid sm:grid-cols-3 gap-3">
                      <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="mealSpeed"
                          value="quick"
                          checked={preferences.mealSpeed === 'quick'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              mealSpeed: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600"
                        />
                        <div>
                          <div className="text-sm font-medium">Quick</div>
                          <div className="text-xs text-gray-500">10-15 min</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="mealSpeed"
                          value="normal"
                          checked={preferences.mealSpeed === 'normal'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              mealSpeed: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600"
                        />
                        <div>
                          <div className="text-sm font-medium">Normal</div>
                          <div className="text-xs text-gray-500">15-25 min</div>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="mealSpeed"
                          value="elaborate"
                          checked={preferences.mealSpeed === 'elaborate'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              mealSpeed: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600"
                        />
                        <div>
                          <div className="text-sm font-medium">Elaborate</div>
                          <div className="text-xs text-gray-500">25-35 min</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Budget & Goals
                </h2>

                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Budget Per Meal: RM {preferences.budgetPerMeal}
                    </Label>
                    <input
                      type="range"
                      min="10"
                      max="30"
                      step="0.5"
                      value={preferences.budgetPerMeal}
                      onChange={(e) =>
                        setPreferences((prev) => ({
                          ...prev,
                          budgetPerMeal: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>RM 10</span>
                      <span>RM 30</span>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Your Goals
                    </Label>
                    <div className="space-y-2">
                      <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="goals"
                          value="maintain"
                          checked={preferences.goals === 'maintain'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              goals: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">
                            Maintain Current Wellness
                          </div>
                          <div className="text-xs text-gray-500">
                            Keep your current healthy habits
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="goals"
                          value="energy"
                          checked={preferences.goals === 'energy'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              goals: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">
                            Boost Energy & Focus
                          </div>
                          <div className="text-xs text-gray-500">
                            Stay energized throughout the day
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="goals"
                          value="muscle"
                          checked={preferences.goals === 'muscle'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              goals: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">
                            Support Muscle & Fitness
                          </div>
                          <div className="text-xs text-gray-500">
                            Higher protein for active lifestyle
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="goals"
                          value="balanced"
                          checked={preferences.goals === 'balanced'}
                          onChange={(e) =>
                            setPreferences((prev) => ({
                              ...prev,
                              goals: e.target.value as any,
                            }))
                          }
                          className="w-4 h-4 text-emerald-600 mt-0.5"
                        />
                        <div>
                          <div className="text-sm font-medium">
                            Balanced Nutrition
                          </div>
                          <div className="text-xs text-gray-500">
                            Well-rounded meals for overall health
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </section>

              <div className="flex gap-4 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>

                <Button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
                >
                  Generate My Meal Plan
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
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
