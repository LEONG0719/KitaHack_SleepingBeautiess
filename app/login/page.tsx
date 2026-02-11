'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Utensils, Loader2, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail, user, loading } = useAuth();
    const router = useRouter();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Redirect if already logged in
    if (!loading && user) {
        router.push('/plan');
        return null;
    }

    const handleGoogleSignIn = async () => {
        try {
            setError(null);
            await signInWithGoogle();
            router.push('/plan');
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
        }
    };

    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);

        try {
            if (isSignUp) {
                if (!name.trim()) {
                    setError('Please enter your name');
                    setSubmitting(false);
                    return;
                }
                if (password.length < 6) {
                    setError('Password must be at least 6 characters');
                    setSubmitting(false);
                    return;
                }
                await signUpWithEmail(email, password, name);
            } else {
                await signInWithEmail(email, password);
            }
            router.push('/plan');
        } catch (err: any) {
            const code = err.code;
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Invalid email or password');
            } else if (code === 'auth/email-already-in-use') {
                setError('An account with this email already exists');
            } else if (code === 'auth/invalid-email') {
                setError('Please enter a valid email address');
            } else {
                setError(err.message || 'Authentication failed');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <div className="bg-emerald-100 rounded-full p-3">
                            <Utensils className="w-8 h-8 text-emerald-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        NutriBalance <span className="text-emerald-600">AI</span>
                    </h1>
                    <p className="text-gray-600 mt-1 text-sm">
                        {isSignUp ? 'Create your account' : 'Sign in to your account'}
                    </p>
                </div>

                {/* Auth Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* Google Sign In */}
                    <Button
                        type="button"
                        onClick={handleGoogleSignIn}
                        variant="outline"
                        className="w-full flex items-center justify-center gap-3 py-5 text-sm font-medium border-gray-300 hover:bg-gray-50"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </Button>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                            <span className="px-3 bg-white text-gray-500 uppercase tracking-wider">or</span>
                        </div>
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        {isSignUp && (
                            <div>
                                <Label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">
                                    Full Name
                                </Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="Your name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">
                                Email
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                                Password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder={isSignUp ? 'Min 6 characters' : 'Your password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5"
                        >
                            {submitting ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : null}
                            {isSignUp ? 'Create Account' : 'Sign In'}
                        </Button>
                    </form>

                    {/* Toggle Sign In / Sign Up */}
                    <div className="text-center mt-6">
                        <p className="text-sm text-gray-600">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError(null);
                                }}
                                className="text-emerald-600 font-medium hover:text-emerald-700"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-xs text-gray-500 mt-6">
                    NutriBalance AI — Made for Malaysian Students
                </p>
            </div>
        </div>
    );
}
