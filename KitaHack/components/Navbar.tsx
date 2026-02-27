'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useCultural, SeasonalMode } from '@/lib/CulturalContext';
import { Utensils, LogOut, User, ScanLine, Trophy, Moon, PartyPopper, Sun } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { checkStreakDecay } from '@/lib/gamification';

const NAV_LINKS = [
  { href: '/plan', label: 'Plan' },
  { href: '/scanner', label: 'Scanner' },
  { href: '/saved', label: 'Saved' },
  { href: '/nearby', label: 'Nearby' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

const MODE_CONFIG: Record<SeasonalMode, { icon: React.ReactNode; label: string; color: string }> = {
  normal: { icon: <Sun className="w-3.5 h-3.5" />, label: 'Normal', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  ramadan: { icon: <Moon className="w-3.5 h-3.5" />, label: 'Ramadan', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  festive: { icon: <PartyPopper className="w-3.5 h-3.5" />, label: 'Festive', color: 'bg-rose-100 text-rose-700 border-rose-300' },
};

// 🔥 MAGIC THEME INJECTION: This overrides the default Emerald theme globally!
const globalThemeStyles = {
  normal: '', // Default tailwind emerald colors
  ramadan: `
    .text-emerald-500 { color: #6366f1 !important; }
    .text-emerald-600 { color: #4f46e5 !important; }
    .text-emerald-700 { color: #4338ca !important; }
    .text-emerald-800 { color: #3730a3 !important; }
    .bg-emerald-50 { background-color: #eef2ff !important; }
    .bg-emerald-100 { background-color: #e0e7ff !important; }
    .bg-emerald-500 { background-color: #6366f1 !important; }
    .bg-emerald-600 { background-color: #4f46e5 !important; }
    .hover\\:bg-emerald-700:hover { background-color: #4338ca !important; }
    .hover\\:bg-emerald-50:hover { background-color: #eef2ff !important; }
    .hover\\:text-emerald-600:hover { color: #4f46e5 !important; }
    .border-emerald-100 { border-color: #e0e7ff !important; }
    .border-emerald-200 { border-color: #c7d2fe !important; }
    .border-emerald-300 { border-color: #a5b4fc !important; }
    .border-emerald-500 { border-color: #6366f1 !important; }
    .ring-emerald-500 { --tw-ring-color: #6366f1 !important; }
  `,
  festive: `
    .text-emerald-500 { color: #f43f5e !important; }
    .text-emerald-600 { color: #e11d48 !important; }
    .text-emerald-700 { color: #be123c !important; }
    .text-emerald-800 { color: #9f1239 !important; }
    .bg-emerald-50 { background-color: #fff1f2 !important; }
    .bg-emerald-100 { background-color: #ffe4e6 !important; }
    .bg-emerald-500 { background-color: #f43f5e !important; }
    .bg-emerald-600 { background-color: #e11d48 !important; }
    .hover\\:bg-emerald-700:hover { background-color: #be123c !important; }
    .hover\\:bg-emerald-50:hover { background-color: #fff1f2 !important; }
    .hover\\:text-emerald-600:hover { color: #e11d48 !important; }
    .border-emerald-100 { border-color: #ffe4e6 !important; }
    .border-emerald-200 { border-color: #fecdd3 !important; }
    .border-emerald-300 { border-color: #fda4af !important; }
    .border-emerald-500 { border-color: #f43f5e !important; }
    .ring-emerald-500 { --tw-ring-color: #f43f5e !important; }
  `
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { seasonalMode, setSeasonalMode } = useCultural();
  const [showMenu, setShowMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (modeRef.current && !modeRef.current.contains(event.target as Node)) {
        setShowModeMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setShowMenu(false);
    await logout();
    router.push('/login');
  };

  useEffect(() => {
    if (user) {
      // Run the decay check silently in the background when the user logs in/opens the app
      checkStreakDecay();
    }
  }, [user]);

  const currentMode = MODE_CONFIG[seasonalMode];

  return (
    <>
      {/* 🔥 THE INJECTOR: This applies the colors to the whole app instantly */}
      <style dangerouslySetInnerHTML={{ __html: globalThemeStyles[seasonalMode] }} />

      <nav className="border-b bg-white sticky top-0 z-50 shadow-sm transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2 group">
              <Utensils className="h-6 w-6 text-emerald-600 transition-colors" />
              <span className="font-bold text-xl text-gray-900">
                NutriBalance <span className="text-emerald-600 transition-colors">AI</span>
              </span>
            </Link>

            <div className="flex items-center space-x-1 sm:space-x-3">
              {/* Nav Links */}
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-xs sm:text-sm font-medium transition-colors hover:text-emerald-600 px-1.5 sm:px-2 py-1 rounded ${pathname === href
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-gray-600'
                    }`}
                >
                  {label}
                </Link>
              ))}

              {/* Theme / Mode Toggle */}
              <div className="relative ml-2" ref={modeRef}>
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all shadow-sm ${currentMode.color} hover:scale-105 active:scale-95`}
                >
                  {currentMode.icon}
                  <span className="hidden sm:inline">{currentMode.label} Mode</span>
                </button>
                {showModeMenu && (
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden origin-top-right animate-in fade-in zoom-in duration-200">
                    <div className="px-3 py-1.5 mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-50">
                      Context Adaptive AI
                    </div>
                    {(Object.keys(MODE_CONFIG) as SeasonalMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setSeasonalMode(mode);
                          setShowModeMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${seasonalMode === mode ? 'bg-gray-50 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                          }`}
                      >
                        <span className={`p-1.5 rounded-md ${MODE_CONFIG[mode].color.split(' ')[0]} ${MODE_CONFIG[mode].color.split(' ')[1]}`}>
                          {MODE_CONFIG[mode].icon}
                        </span>
                        {MODE_CONFIG[mode].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Auth section */}
              {user ? (
                <div className="relative ml-2" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center space-x-2 ml-1 p-1 rounded-full hover:bg-gray-50 transition-colors border-2 border-transparent hover:border-gray-100"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="w-8 h-8 rounded-full border border-emerald-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-200">
                        <User className="w-4 h-4 text-emerald-600" />
                      </div>
                    )}
                  </button>

                  {showMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 origin-top-right animate-in fade-in zoom-in duration-200">
                      <div className="px-4 py-2 border-b border-gray-50 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {user.displayName || 'User'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 flex items-center gap-2 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="ml-2 px-4 py-1.5 bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}