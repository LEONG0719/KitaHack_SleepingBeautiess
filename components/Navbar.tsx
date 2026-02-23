'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { useCultural, SeasonalMode } from '@/lib/CulturalContext';
import { Utensils, LogOut, User, ScanLine, Trophy, Moon, PartyPopper, Sun } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const NAV_LINKS = [
  { href: '/plan', label: 'Plan' },
  { href: '/scanner', label: 'Scanner' },
  { href: '/saved', label: 'Saved' },
  { href: '/nearby', label: 'Nearby' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/profile', label: 'Profile' },
];

const MODE_CONFIG: Record<SeasonalMode, { icon: React.ReactNode; label: string; color: string }> = {
  normal: { icon: <Sun className="w-3.5 h-3.5" />, label: 'Normal', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  ramadan: { icon: <Moon className="w-3.5 h-3.5" />, label: 'Ramadan', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  festive: { icon: <PartyPopper className="w-3.5 h-3.5" />, label: 'Festive', color: 'bg-pink-100 text-pink-700 border-pink-300' },
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

  const currentMode = MODE_CONFIG[seasonalMode];

  return (
    <nav className="border-b bg-white sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <Utensils className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-xl text-gray-900">
              NutriBalance <span className="text-emerald-600">AI</span>
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

            {/* Bazaar Mode Toggle */}
            <div className="relative" ref={modeRef}>
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border transition ${currentMode.color}`}
              >
                {currentMode.icon}
                <span className="hidden sm:inline">{currentMode.label}</span>
              </button>
              {showModeMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                  {(Object.keys(MODE_CONFIG) as SeasonalMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => {
                        setSeasonalMode(mode);
                        setShowModeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 ${seasonalMode === mode ? 'text-emerald-600 font-semibold' : 'text-gray-600'
                        }`}
                    >
                      {MODE_CONFIG[mode].icon}
                      {MODE_CONFIG[mode].label} Mode
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Auth section */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 ml-1 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-8 h-8 rounded-full border-2 border-emerald-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-200">
                      <User className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {user.email}
                      </p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
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
                className="ml-1 px-3 py-1.5 bg-emerald-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
