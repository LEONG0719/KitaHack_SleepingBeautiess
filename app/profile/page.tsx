'use client';

import { useEffect, useState } from 'react';
import { updateProfile } from 'firebase/auth';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile, saveUserProfile } from '@/lib/firestore';
import { UserProfile, UserPreferences } from '@/lib/types';
import NutriBuddy from '@/components/NutriBuddy';

const goalOptions: Array<{ value: UserPreferences['goals']; label: string }> = [
  { value: 'maintain', label: 'Maintain' },
  { value: 'energy', label: 'Energy' },
  { value: 'muscle', label: 'Muscle' },
  { value: 'balanced', label: 'Balanced' },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [formState, setFormState] = useState({
    displayName: '',
    photoURL: '',
    bio: '',
    campus: '',
    goals: 'balanced' as UserPreferences['goals'],
    favoriteCuisine: '',
    vitality: 78,
    level: 4,
    streak: 2,
  });

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const profile = await getUserProfile(user.uid);
        if (!isMounted) return;

        const buddy = profile?.buddy;
        setFormState({
          displayName: profile?.displayName || user.displayName || '',
          photoURL: profile?.photoURL || user.photoURL || '',
          bio: profile?.bio || '',
          campus: profile?.campus || '',
          goals: profile?.goals || 'balanced',
          favoriteCuisine: profile?.favoriteCuisine || '',
          vitality: buddy?.vitality ?? 78,
          level: buddy?.level ?? 4,
          streak: buddy?.streak ?? 2,
        });
      } catch (error) {
        setToast({
          message: 'Failed to load profile. Please refresh.',
          type: 'error',
        });
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const level = Math.max(1, Math.floor(formState.level));
    const streak = Math.max(0, Math.floor(formState.streak));
    const vitality = Math.max(0, Math.min(100, Math.floor(formState.vitality)));

    setSaving(true);
    try {
      await updateProfile(user, {
        displayName: formState.displayName || user.displayName || '',
        photoURL: formState.photoURL || user.photoURL || '',
      });

      const profile: UserProfile = {
        uid: user.uid,
        displayName: formState.displayName || user.displayName || 'User',
        email: user.email || '',
        photoURL: formState.photoURL || user.photoURL || '',
        bio: formState.bio,
        campus: formState.campus,
        goals: formState.goals,
        favoriteCuisine: formState.favoriteCuisine,
        buddy: {
          vitality,
          level,
          streak,
        },
      };

      await saveUserProfile(profile);
      localStorage.setItem(
        'nutriBuddyStats',
        JSON.stringify({ vitality, level, streak })
      );

      setFormState((prev) => ({
        ...prev,
        vitality,
        level,
        streak,
      }));

      setToast({
        message: 'Profile updated successfully!',
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: 'Failed to update profile. Please try again.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
            <p className="text-gray-600">
              Keep your NutriBalance details fresh and personalize your buddy.
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-start">
            <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Profile Details
              </h2>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Display Name
                    </Label>
                    <Input
                      value={formState.displayName}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          displayName: event.target.value,
                        }))
                      }
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Photo URL
                    </Label>
                    <Input
                      value={formState.photoURL}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          photoURL: event.target.value,
                        }))
                      }
                      placeholder="https://"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Email</Label>
                  <Input value={user?.email || ''} disabled />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Bio</Label>
                  <Textarea
                    value={formState.bio}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        bio: event.target.value,
                      }))
                    }
                    placeholder="Tell us about your nutrition goals"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Campus
                    </Label>
                    <Input
                      value={formState.campus}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          campus: event.target.value,
                        }))
                      }
                      placeholder="University or campus"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Nutrition Goal
                    </Label>
                    <select
                      value={formState.goals}
                      onChange={(event) =>
                        setFormState((prev) => ({
                          ...prev,
                          goals: event.target.value as UserPreferences['goals'],
                        }))
                      }
                      className="w-full p-3 border rounded-lg text-sm"
                    >
                      {goalOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Favorite Cuisine
                  </Label>
                  <Input
                    value={formState.favoriteCuisine}
                    onChange={(event) =>
                      setFormState((prev) => ({
                        ...prev,
                        favoriteCuisine: event.target.value,
                      }))
                    }
                    placeholder="Malay, Chinese, Indian, Western"
                  />
                </div>

                <div className="border border-gray-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    NutriBuddy Controls
                  </h3>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs font-medium mb-1 block">
                        Vitality
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={formState.vitality}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            vitality: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">
                        Level
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={formState.level}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            level: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium mb-1 block">
                        Streak
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={formState.streak}
                        onChange={(event) =>
                          setFormState((prev) => ({
                            ...prev,
                            streak: Number(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={saving || loadingProfile}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </section>

            <section className="space-y-6">
              <NutriBuddy
                vitality={formState.vitality}
                level={formState.level}
                streak={formState.streak}
                name={formState.displayName || 'NutriBuddy'}
              />

              <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-3">
                  Preview
                </h2>
                <p className="text-sm text-gray-600 mb-4">
                  Your profile details help personalize meals and bring NutriBuddy
                  to life.
                </p>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="font-semibold">Name:</span>{' '}
                    {formState.displayName || 'Add a name'}
                  </p>
                  <p>
                    <span className="font-semibold">Campus:</span>{' '}
                    {formState.campus || 'Not set'}
                  </p>
                  <p>
                    <span className="font-semibold">Goal:</span>{' '}
                    {formState.goals}
                  </p>
                  <p>
                    <span className="font-semibold">Favorite cuisine:</span>{' '}
                    {formState.favoriteCuisine || 'Not set'}
                  </p>
                </div>
              </div>
            </section>
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
