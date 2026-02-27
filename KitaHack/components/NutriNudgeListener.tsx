'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getUserProfile, type TierName } from '@/lib/gamification';
import {
    Bell,
    BellRing,
    X,
    ChevronRight,
    Sparkles,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getFCM, db } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';

interface NudgeData {
    notification: {
        title: string;
        body: string;
    };
    data: {
        nudge_type: string;
        action_url: string;
    };
}

export default function NutriNudgeListener() {
    const { user } = useAuth();
    const router = useRouter();
    const [nudge, setNudge] = useState<NudgeData | null>(null);
    const [visible, setVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'loading'>('loading');
    const [fcmReady, setFcmReady] = useState(false);

    // Check current permission state on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionStatus(Notification.permission);
        } else {
            setPermissionStatus('denied'); // unsupported
        }
    }, []);

    // Register FCM after permission is granted
    useEffect(() => {
        if (permissionStatus !== 'granted' || !user || fcmReady) return;

        const registerFCM = async () => {
            try {
                const messaging = await getFCM();
                if (!messaging) return;

                // Register our service worker explicitly
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('FCM: Service Worker registered');

                const token = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
                    serviceWorkerRegistration: registration,
                });

                if (token) {
                    console.log('FCM: Token registered');
                    await updateDoc(doc(db, 'users', user.uid), {
                        fcmToken: token,
                        notificationsEnabled: true,
                        lastTokenUpdate: new Date().toISOString(),
                    });
                }

                // Listen for foreground messages
                onMessage(messaging, (payload) => {
                    console.log('FCM: Foreground message:', payload);
                    setNudge({
                        notification: {
                            title: payload.notification?.title || 'NutriNudge',
                            body: payload.notification?.body || '',
                        },
                        data: {
                            nudge_type: payload.data?.nudge_type || 'health',
                            action_url: payload.data?.action_url || '#',
                        },
                    });
                    setVisible(true);
                    setTimeout(() => setVisible(false), 8000);
                });

                setFcmReady(true);
            } catch (err) {
                console.error('FCM: Registration error:', err);
            }
        };

        registerFCM();
    }, [permissionStatus, user, fcmReady]);

    // Manual permission request (triggered by user click)
    const requestPermission = async () => {
        const result = await Notification.requestPermission();
        setPermissionStatus(result);
    };

    // Fetch nudge from API (also triggers server-side FCM send)
    const fetchNudge = useCallback(async () => {
        if (!user || loading) return;
        setLoading(true);

        try {
            const profile = await getUserProfile().catch(() => null);
            const stats = profile?.gamification_stats;

            const hour = new Date().getHours();
            let timeOfDay = 'afternoon';
            if (hour < 11) timeOfDay = 'morning';
            else if (hour < 14) timeOfDay = 'lunchtime';
            else if (hour < 17) timeOfDay = 'afternoon';
            else if (hour < 20) timeOfDay = 'evening';
            else timeOfDay = 'night';

            const res = await fetch('/api/send-nudge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.uid,
                    displayName: user.displayName || 'User',
                    nutricoinBalance: stats?.nutricoin_balance || 0,
                    sukuScore: stats?.weekly_suku_avg_score || 'None yet',
                    timeOfDay,
                    nearbyArea: profile?.campus || 'Campus area',
                }),
            });

            const data: NudgeData = await res.json();
            setNudge(data);
            setVisible(true);
            setTimeout(() => setVisible(false), 8000);
        } catch (err) {
            console.warn('Failed to fetch nudge:', err);
        } finally {
            setLoading(false);
        }
    }, [user, loading]);

    // Expose fetchNudge globally so the profile page can trigger it
    useEffect(() => {
        (window as any).__triggerNutriNudge = fetchNudge;
        return () => {
            delete (window as any).__triggerNutriNudge;
        };
    }, [fetchNudge]);

    const handleAction = () => {
        if (nudge?.data?.action_url) {
            router.push(nudge.data.action_url);
        }
        setVisible(false);
    };

    // Show "Enable Alerts" button if permission not yet asked
    if (permissionStatus === 'default' && user) {
        return (
            <div className="fixed bottom-20 right-4 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button
                    onClick={requestPermission}
                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 text-white rounded-full shadow-xl hover:bg-violet-700 active:scale-95 transition-all group border-2 border-white/30"
                >
                    <Bell className="w-4 h-4 animate-bounce" />
                    <span className="text-xs font-bold">Enable Health Alerts</span>
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        );
    }

    if (!visible || !nudge) return null;

    const typeColors: Record<string, { bg: string; icon: string; border: string }> = {
        health: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-200' },
        budget: { bg: 'bg-amber-50', icon: 'text-amber-600', border: 'border-amber-200' },
        location: { bg: 'bg-blue-50', icon: 'text-blue-600', border: 'border-blue-200' },
    };

    const colors = typeColors[nudge.data?.nudge_type] || typeColors.health;

    return (
        <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 duration-300 max-w-sm w-full">
            <div className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-4 shadow-2xl`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                            <BellRing className={`w-4 h-4 ${colors.icon}`} />
                        </div>
                        <div className="flex items-center gap-1">
                            <Sparkles className={`w-3 h-3 ${colors.icon}`} />
                            <span className={`text-[10px] font-black uppercase tracking-widest ${colors.icon}`}>
                                NutriNudge
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={() => setVisible(false)}
                        className="p-1 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <h4 className="font-bold text-gray-900 text-sm mb-1">
                    {nudge.notification.title}
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed mb-3">
                    {nudge.notification.body}
                </p>

                {/* Action */}
                <button
                    onClick={handleAction}
                    className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold ${colors.icon} bg-white border ${colors.border} hover:shadow-sm transition-all`}
                >
                    Take Action
                    <ChevronRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
}
