'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Utensils, LogOut, User } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
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

          <div className="flex items-center space-x-4">
            <Link
              href="/plan"
              className={`text-sm font-medium transition-colors hover:text-emerald-600 ${pathname === '/plan' ? 'text-emerald-600' : 'text-gray-700'
                }`}
            >
              Create Plan
            </Link>
            <Link
              href="/saved"
              className={`text-sm font-medium transition-colors hover:text-emerald-600 ${pathname === '/saved' ? 'text-emerald-600' : 'text-gray-700'
                }`}
            >
              Saved Plans
            </Link>
            <Link
              href="/nearby"
              className={`text-sm font-medium transition-colors hover:text-emerald-600 ${pathname === '/nearby' ? 'text-emerald-600' : 'text-gray-700'
                }`}
            >
              Nearby
            </Link>

            {/* Auth section */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center space-x-2 ml-2 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
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
                className="ml-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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
