'use client';

import { useEffect, useState, useCallback } from 'react';
import { updateProfile } from 'firebase/auth';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import Toast from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile as getFirestoreProfile, saveUserProfile } from '@/lib/firestore';
import { UserProfile, UserPreferences } from '@/lib/types';
import NutriBuddy from '@/components/NutriBuddy';
import BuddyChat from '@/components/BuddyChat';

// 🔥 IMPORTED Location functions
import { getUserStateFromCoordinates } from '@/lib/googleMaps';

import { 
  getUserProfile as getGamificationProfile, 
  getTierColor, 
  type TierName,
  overrideGamificationStats,
  updateCampus,
  updateUserState // 🔥 IMPORTED
} from '@/lib/gamification';

import {
  Trophy, Coins, Flame, MapPin, Target, User as UserIcon, Sparkles,
  Edit2, Utensils, ChevronRight, BellRing, Loader2, Info, HeartPulse, Map
} from 'lucide-react';

const CAMPUSES = [
  'Asia Pacific University (APU)', 'Universiti Malaya (UM)', "Taylor's University",
  'Universiti Kebangsaan Malaysia (UKM)', 'Universiti Putra Malaysia (UPM)',
  'Sunway University', 'Monash University Malaysia', 'HELP University',
  'UCSI University', 'Other',
];

const goalOptions: Array<{ value: UserPreferences['goals']; label: string }> = [
  { value: 'maintain', label: 'Maintain weight' },
  { value: 'energy', label: 'Boost Energy' },
  { value: 'muscle', label: 'Build Muscle' },
  { value: 'balanced', label: 'Balanced Health' },
];

function BuddyGuideModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                🐾 Buddy Care Guide
              </h3>
              <p className="text-xs text-gray-500 mt-1">How to keep your AI companion happy!</p>
            </div>
            <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
              <span className="text-xl leading-none">&times;</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-2xl bg-rose-50 border border-rose-100">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <HeartPulse className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-bold text-rose-900 text-sm mb-0.5">Vitality (Hunger)</p>
                <p className="text-xs text-rose-700 leading-relaxed">
                  Your buddy gets hungry! <b>Vitality drops every day</b> if you neglect it. Scan healthy plates (or log planned meals) to heal up to <b>+25 HP</b> per meal!
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-bold text-emerald-900 text-sm mb-0.5">Levels & XP</p>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  Earn NutriCoins for your <b>first 3 scans each day</b>. Every 100 Coins = 1 Level Up. Reach Level 5 to unlock a special crown 👑!
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-orange-50 border border-orange-100">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-bold text-orange-900 text-sm mb-0.5">Wok Hei Aura</p>
                <p className="text-xs text-orange-700 leading-relaxed">
                  Log a meal for <b>3 consecutive days</b> to ignite the "Wok Hei" fire aura. Don't miss a day, or your streak will reset to 0!
                </p>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="mt-6 w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-black transition-colors shadow-md"
          >
            Got it, let's feed him!
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [originalState, setOriginalState] = useState<any>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // 🔥 STATE FOR LOCATION FINDING
  const [isLocating, setIsLocating] = useState(false);

  const [formState, setFormState] = useState({
    displayName: '', photoURL: '', bio: '', campus: '', state: '',
    goals: 'balanced' as UserPreferences['goals'],
    favoriteCuisine: '',
    vitality: 50, level: 1, streak: 0,
    nutricoin_balance: 0, current_tier: 'Iron' as TierName,
  });

  const fetchProfileData = useCallback(async () => {
    if (!user) return;
    setLoadingProfile(true);
    try {
      const fProfile = await getFirestoreProfile(user.uid).catch(() => null);
      const gProfile = await getGamificationProfile().catch(() => null);

      const gStats = gProfile?.gamification_stats;
      
      const realVitality = gStats?.vitality ?? 50; 
      const realLevel = gStats ? Math.floor(gStats.nutricoin_balance / 100) + 1 : 1;
      const realStreak = gStats?.current_health_streak_days ?? 0;

      const loadedData = {
        displayName: fProfile?.displayName || user.displayName || '',
        photoURL: fProfile?.photoURL || user.photoURL || '',
        bio: fProfile?.bio || '',
        campus: gProfile?.campus || fProfile?.campus || '',
        state: (gProfile as any)?.state || fProfile?.state || '', // Load state!
        goals: fProfile?.goals || 'balanced',
        favoriteCuisine: fProfile?.favoriteCuisine || '',
        
        vitality: realVitality, 
        level: realLevel,
        streak: realStreak,
        
        nutricoin_balance: gStats?.nutricoin_balance ?? 0,
        current_tier: (gProfile?.current_tier as TierName) ?? 'Iron',
      };
      
      setFormState(loadedData);
      setOriginalState(loadedData);
    } catch {
      setToast({ message: 'Failed to load profile.', type: 'error' });
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleCancel = () => {
    if (originalState) setFormState(originalState);
    setIsEditing(false);
  };

  // 🔥 NEW: Function to ask browser for GPS and reverse geocode it
  const detectLocation = () => {
      setIsLocating(true);
      if (!navigator.geolocation) {
          setToast({ message: 'Geolocation is not supported by your browser', type: 'error' });
          setIsLocating(false);
          return;
      }

      navigator.geolocation.getCurrentPosition(
          async (position) => {
              const detectedState = await getUserStateFromCoordinates(
                  position.coords.latitude,
                  position.coords.longitude
              );

              if (detectedState) {
                  setFormState(p => ({ ...p, state: detectedState }));
                  setToast({ message: `Location found! You are in ${detectedState}`, type: 'success' });
              } else {
                  setToast({ message: 'Could not determine state from coordinates.', type: 'error' });
              }
              setIsLocating(false);
          },
          (err) => {
              setToast({ message: 'Location access denied. Please enable GPS.', type: 'error' });
              setIsLocating(false);
          },
          { enableHighAccuracy: true, timeout: 10000 }
      );
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateProfile(user, { displayName: formState.displayName, photoURL: formState.photoURL });
      
      const updatedProfile: UserProfile = {
        uid: user.uid,
        displayName: formState.displayName,
        email: user.email || '',
        photoURL: formState.photoURL,
        bio: formState.bio,
        campus: formState.campus,
        goals: formState.goals,
        favoriteCuisine: formState.favoriteCuisine,
        buddy: { vitality: formState.vitality, level: formState.level, streak: formState.streak },
      };
      await saveUserProfile(updatedProfile);

      // Save Gamification & Leaderboard specific fields
      await updateCampus(formState.campus);
      if (formState.state) {
         await updateUserState(formState.state); // 🔥 Save State!
      }

      await overrideGamificationStats(formState.vitality, formState.level, formState.streak);
      await fetchProfileData();

      setIsEditing(false);
      setToast({ message: 'Profile updated successfully!', type: 'success' });
    } catch {
      setToast({ message: 'Failed to save changes.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f4f0] pb-24">
        <Navbar />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-4xl font-black text-gray-900 tracking-tight">Profile Dashboard</h1>
              <p className="text-gray-500 mt-1">Manage your identity and NutriBuddy stats.</p>
            </div>
            <div className="px-5 py-3 rounded-2xl border-2 flex items-center gap-3 bg-white shadow-sm transition-colors duration-500" style={{ borderColor: getTierColor(formState.current_tier) }}>
              <Trophy className="w-5 h-5" style={{ color: getTierColor(formState.current_tier) }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 leading-none">Rank</p>
                <p className="text-lg font-black uppercase" style={{ color: getTierColor(formState.current_tier) }}>
                  {formState.current_tier}
                </p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-8 items-start">
            {/* LEFT COLUMN */}
            <div className="space-y-5">
              {!isEditing ? (
                <section className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-br from-emerald-50 to-teal-50" />
                  <button onClick={() => setIsEditing(true)} className="absolute top-5 right-5 p-2.5 bg-white text-gray-400 hover:text-emerald-600 rounded-full shadow hover:shadow-md transition-all z-10" title="Edit Profile">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <div className="relative pt-4">
                    <div className="w-20 h-20 rounded-full bg-white border-4 border-white flex items-center justify-center mb-4 overflow-hidden shadow-xl mx-auto sm:mx-0">
                      {formState.photoURL ? (
                        <img src={formState.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
                          <UserIcon className="w-9 h-9 text-emerald-600" />
                        </div>
                      )}
                    </div>
                    <div className="text-center sm:text-left mb-6">
                      <h2 className="text-2xl font-black text-gray-900">{formState.displayName || 'Dietitian Explorer'}</h2>
                      <p className="text-gray-400 text-sm">{user?.email}</p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 text-sm">
                        {formState.bio || 'No bio added yet. Click ✏️ to share your health journey!'}
                      </p>
                      
                      {/* 🔥 NEW: Showing both Campus and Location Badges */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formState.campus && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                {formState.campus}
                            </div>
                        )}
                        {formState.state && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-700">
                                <Map className="w-3.5 h-3.5 text-blue-600" />
                                {formState.state}
                            </div>
                        )}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
                          <div className="flex items-center gap-1.5 text-blue-600 mb-1">
                            <Target className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Goal</span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm capitalize">{formState.goals}</p>
                        </div>
                        <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-100">
                          <div className="flex items-center gap-1.5 text-orange-600 mb-1">
                            <Utensils className="w-3.5 h-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-widest">Favourite Cuisine</span>
                          </div>
                          <p className="font-bold text-gray-900 text-sm truncate">{formState.favoriteCuisine || 'Any 🍛'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              ) : (
                <section className="bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                  <form onSubmit={handleSave} className="space-y-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Edit2 className="w-4 h-4" /></div>
                      <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Display Name</Label>
                        <Input value={formState.displayName} onChange={(e) => setFormState(p => ({ ...p, displayName: e.target.value }))} className="rounded-xl h-11" placeholder="John Doe" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold">Photo URL</Label>
                        <Input value={formState.photoURL} onChange={(e) => setFormState(p => ({ ...p, photoURL: e.target.value }))} className="rounded-xl h-11" placeholder="https://..." />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Bio</Label>
                      <Textarea value={formState.bio} onChange={(e) => setFormState(p => ({ ...p, bio: e.target.value }))} className="rounded-xl min-h-[90px]" placeholder="Share your health journey..." />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-5 pt-3 border-t border-gray-100">
                      
                      {/* 🔥 NEW: State location box! */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold flex items-center justify-between gap-1">
                           <span className="flex items-center gap-1"><Map className="w-3 h-3 text-blue-500" /> Current State</span>
                        </Label>
                        <div className="flex gap-2">
                            <Input readOnly value={formState.state || 'Unknown'} className="rounded-xl h-11 bg-gray-50 text-gray-500" placeholder="Detecting..." />
                            <Button 
                                type="button" 
                                onClick={detectLocation} 
                                disabled={isLocating}
                                className="h-11 px-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl transition-colors"
                                title="Use GPS to detect location"
                            >
                                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                            </Button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold flex items-center gap-1"><MapPin className="w-3 h-3 text-emerald-500" /> Campus</Label>
                        <select value={formState.campus} onChange={(e) => setFormState(p => ({ ...p, campus: e.target.value }))} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                          <option value="">Select Campus</option>
                          {CAMPUSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold flex items-center gap-1"><Target className="w-3 h-3 text-orange-500" /> Goal</Label>
                        <select value={formState.goals} onChange={(e) => setFormState(p => ({ ...p, goals: e.target.value as UserPreferences['goals'] }))} className="w-full h-11 px-3 border border-gray-200 rounded-xl text-sm outline-none bg-white">
                          {goalOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold flex items-center gap-1"><Utensils className="w-3 h-3 text-purple-500"/> Favourite Cuisine</Label>
                        <Input value={formState.favoriteCuisine} onChange={(e) => setFormState(p => ({ ...p, favoriteCuisine: e.target.value }))} className="rounded-xl h-11" placeholder="Malay, Chinese, Indian..." />
                      </div>
                    </div>
                    
                    
                    <div className="border border-dashed border-red-200 bg-red-50/50 rounded-xl p-4 mt-4">
                      <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Admin Dev Override</p>
                      <p className="text-[10px] text-red-400 mb-3">WARNING: Saving will overwrite real Firebase Leaderboard stats.</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Vitality (0-100)', key: 'vitality', min: 0, max: 100 },
                          { label: 'Level (Updates Coins)', key: 'level', min: 1 },
                          { label: 'Day Streak', key: 'streak', min: 0 },
                        ].map(({ label, key, min, max }) => (
                          <div key={key}>
                            <Label className="text-[10px] font-bold text-gray-700 mb-1 block">{label}</Label>
                            <Input type="number" min={min} max={max} value={(formState as any)[key]}
                              onChange={(e) => setFormState(p => ({ ...p, [key]: Number(e.target.value) }))}
                              className="h-9 rounded-lg bg-white border-red-200 focus:border-red-500 focus:ring-red-500" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button type="button" variant="outline" onClick={handleCancel} className="flex-1 rounded-2xl h-11 font-bold" disabled={saving}>Cancel</Button>
                      <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 rounded-2xl shadow-lg shadow-emerald-100" disabled={saving || loadingProfile}>
                        {saving ? 'Saving to Database…' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </section>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all duration-500">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                    <Coins className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-emerald-700">{formState.nutricoin_balance}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">NutriCoins</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm transition-all duration-500">
                  <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-orange-700">{formState.streak}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Day Streak</p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-5 min-w-0 w-full overflow-hidden">
              {!loadingProfile && (
                <BuddyChat
                  buddyContext={{
                    name: formState.displayName || 'NutriBuddy',
                    photoURL: formState.photoURL,
                    mood: formState.vitality >= 70 ? 'happy' : formState.vitality >= 40 ? 'neutral' : 'tired',
                    vitality: formState.vitality,
                    level: formState.level,
                    streak: formState.streak,
                    goals: formState.goals,
                    campus: formState.campus,
                    favoriteCuisine: formState.favoriteCuisine,
                  }}
                />
              )}

              <div className="relative">
                <div className="absolute -inset-2 rounded-[2.5rem] opacity-40 blur-2xl transition-colors duration-1000"
                  style={{
                    background: formState.vitality >= 70
                      ? 'radial-gradient(ellipse, #34d399 0%, transparent 70%)'
                      : formState.vitality >= 40
                        ? 'radial-gradient(ellipse, #fbbf24 0%, transparent 70%)'
                        : 'radial-gradient(ellipse, #94a3b8 0%, transparent 70%)'
                  }}
                />
                <NutriBuddy
                  vitality={formState.vitality}
                  level={formState.level}
                  streak={formState.streak}
                  nutricoins={formState.nutricoin_balance}
                  name={formState.displayName || 'NutriBuddy'}
                />
              </div>

              {/* ── Companion Journey Card ── */}
              <div className="bg-gray-900 rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full bg-emerald-500 opacity-[0.08] blur-3xl pointer-events-none" />
                <div className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-violet-500 opacity-[0.08] blur-2xl pointer-events-none" />

                <div className="flex items-center justify-between mb-5 relative z-10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Companion Journey</h3>
                  </div>
                  <button 
                    onClick={() => setIsGuideOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-[10px] font-bold transition-colors"
                  >
                    <Info className="w-3 h-3" /> Guide
                  </button>
                </div>

                <div className="space-y-3 relative z-10">
                  {[
                    { label: 'State', value: formState.state || 'Unknown📍' },
                    { label: 'Campus', value: formState.campus || 'Unset' },
                    { label: 'Favourite Cuisine', value: formState.favoriteCuisine || 'Any 🍛' },
                    { label: 'Daily Goal', value: formState.goals },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between border-b border-white/[0.08] pb-3 last:border-0 last:pb-0">
                      <span className="text-xs text-gray-400 font-medium">{label}</span>
                      <span className="text-xs text-white font-bold capitalize truncate max-w-[150px] text-right">{value}</span>
                    </div>
                  ))}
                </div>

                <div 
                  onClick={() => setIsGuideOpen(true)}
                  className="mt-5 flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors group relative z-10"
                >
                  <div>
                    <p className="text-xs font-black text-white">How to level up?</p>
                    <p className="text-[10px] text-gray-400">Click here to read the Care Guide</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </div>
              </div>

            </div>
          </div>
        </main>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        
        <BuddyGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
      </div>
    </ProtectedRoute>
  );
}