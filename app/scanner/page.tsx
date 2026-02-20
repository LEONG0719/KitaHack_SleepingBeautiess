'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { canScanToday, recordScan, MAX_DAILY_SCANS } from '@/lib/gamification';
import {
    Camera,
    Upload,
    Loader2,
    Target,
    Leaf,
    Drumstick,
    Wheat,
    AlertCircle,
    Coins,
    RotateCcw,
    CheckCircle2,
    XCircle,
} from 'lucide-react';

interface ScanResult {
    detected_dish_name: string;
    breakdown: {
        carbs_percentage: number;
        protein_percentage: number;
        fiber_percentage: number;
        other_percentage: number;
    };
    suku_score: number;
    feedback: {
        title: string;
        message: string;
        tone: string;
    };
    nutricoin_reward: number;
}

export default function ScannerPage() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [coinsEarned, setCoinsEarned] = useState<number | null>(null);
    const [canScan, setCanScan] = useState(true);

    useEffect(() => {
        canScanToday().then(setCanScan).catch(() => setCanScan(true));
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setImagePreview(ev.target?.result as string);
            setResult(null);
            setError(null);
            setCoinsEarned(null);
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async () => {
        if (!imagePreview) return;

        setAnalyzing(true);
        setError(null);

        try {
            // Extract base64 and mimeType
            const [header, base64Data] = imagePreview.split(',');
            const mimeType = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';

            const res = await fetch('/api/analyze-meal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64Data, mimeType }),
            });

            const data = await res.json();

            if (data.status === 'error') {
                setError(data.message);
                return;
            }

            setResult(data.data);

            // Award NutriCoins
            try {
                const coins = await recordScan(data.data.suku_score);
                setCoinsEarned(coins);
                const stillCan = await canScanToday();
                setCanScan(stillCan);
            } catch (coinErr) {
                // Non-critical
                console.warn('Could not award coins:', coinErr);
            }
        } catch (err: any) {
            setError(err.message || 'Analysis failed. Please try again.');
        } finally {
            setAnalyzing(false);
        }
    };

    const resetScanner = () => {
        setImagePreview(null);
        setResult(null);
        setError(null);
        setCoinsEarned(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-emerald-600';
        if (score >= 5) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 9) return 'Excellent!';
        if (score >= 7) return 'Great Job!';
        if (score >= 5) return 'Not Bad';
        if (score >= 3) return 'Needs Work';
        return 'Try Harder!';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 7) return <CheckCircle2 className="w-6 h-6 text-emerald-500" />;
        if (score >= 5) return <AlertCircle className="w-6 h-6 text-amber-500" />;
        return <XCircle className="w-6 h-6 text-red-500" />;
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <Navbar />

                <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-sm font-medium mb-3">
                            <Target className="w-4 h-4" />
                            Suku-Suku Separuh Scanner
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            Scan Your Meal
                        </h1>
                        <p className="text-gray-600 max-w-lg mx-auto">
                            Take a photo of your plate and our AI will analyze it against the
                            Malaysian Healthy Plate guidelines (¼ Carbs, ¼ Protein, ½ Fiber)
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upload Section */}
                        <div>
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview}
                                            alt="Meal to analyze"
                                            className="w-full h-80 object-cover"
                                        />
                                        <button
                                            onClick={resetScanner}
                                            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full shadow hover:bg-white transition"
                                        >
                                            <RotateCcw className="w-4 h-4 text-gray-700" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-80 flex flex-col items-center justify-center gap-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                                            <Camera className="w-8 h-8 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900">
                                                Upload a photo of your meal
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Click to browse or take a photo
                                            </p>
                                        </div>
                                    </button>
                                )}

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <div className="p-4 border-t border-gray-100">
                                    {!imagePreview ? (
                                        <Button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            <Upload className="w-4 h-4 mr-2" />
                                            Choose Photo
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={analyzeImage}
                                            disabled={analyzing || !canScan}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700"
                                        >
                                            {analyzing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Analyzing...
                                                </>
                                            ) : !canScan ? (
                                                'Daily scan limit reached'
                                            ) : (
                                                <>
                                                    <Target className="w-4 h-4 mr-2" />
                                                    Analyze Plate
                                                </>
                                            )}
                                        </Button>
                                    )}

                                    {!canScan && (
                                        <p className="text-xs text-amber-600 text-center mt-2">
                                            Max {MAX_DAILY_SCANS} scans per day for NutriCoin rewards
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Ideal Ratio Reference */}
                            <div className="mt-4 bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                                    ✅ Ideal "Suku-Suku Separuh" Ratio
                                </h3>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                        <Wheat className="w-5 h-5 text-amber-600 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-amber-700">25%</p>
                                        <p className="text-xs text-amber-600">Carbs</p>
                                    </div>
                                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                        <Drumstick className="w-5 h-5 text-red-600 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-red-700">25%</p>
                                        <p className="text-xs text-red-600">Protein</p>
                                    </div>
                                    <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                        <Leaf className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                                        <p className="text-lg font-bold text-emerald-700">50%</p>
                                        <p className="text-xs text-emerald-600">Fiber</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Results Section */}
                        <div>
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            )}

                            {analyzing && (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                                    <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-4" />
                                    <p className="text-gray-700 font-medium">Analyzing your plate...</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Identifying food groups & calculating ratios
                                    </p>
                                </div>
                            )}

                            {result && !analyzing && (
                                <div className="space-y-4">
                                    {/* Score Card */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <p className="text-sm text-gray-500">Detected Dish</p>
                                                <h2 className="text-lg font-bold text-gray-900">
                                                    {result.detected_dish_name}
                                                </h2>
                                            </div>
                                            {getScoreIcon(result.suku_score)}
                                        </div>

                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="text-center">
                                                <p className={`text-4xl font-black ${getScoreColor(result.suku_score)}`}>
                                                    {result.suku_score}
                                                </p>
                                                <p className="text-xs text-gray-500">/10</p>
                                            </div>
                                            <div className="flex-1">
                                                <p className={`text-sm font-semibold ${getScoreColor(result.suku_score)}`}>
                                                    {getScoreLabel(result.suku_score)}
                                                </p>
                                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                                    <div
                                                        className={`h-2.5 rounded-full transition-all duration-700 ${result.suku_score >= 8
                                                                ? 'bg-emerald-500'
                                                                : result.suku_score >= 5
                                                                    ? 'bg-amber-500'
                                                                    : 'bg-red-500'
                                                            }`}
                                                        style={{ width: `${result.suku_score * 10}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* NutriCoin Reward */}
                                        {coinsEarned !== null && coinsEarned > 0 && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                                                <Coins className="w-5 h-5 text-amber-600" />
                                                <span className="text-sm font-semibold text-amber-700">
                                                    +{coinsEarned} NutriCoins earned!
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Breakdown */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                        <h3 className="text-sm font-semibold text-gray-900 mb-4">
                                            Plate Breakdown
                                        </h3>
                                        <div className="space-y-3">
                                            {[
                                                {
                                                    label: 'Carbs',
                                                    value: result.breakdown.carbs_percentage,
                                                    ideal: 25,
                                                    color: 'bg-amber-500',
                                                    icon: <Wheat className="w-4 h-4 text-amber-600" />,
                                                },
                                                {
                                                    label: 'Protein',
                                                    value: result.breakdown.protein_percentage,
                                                    ideal: 25,
                                                    color: 'bg-red-500',
                                                    icon: <Drumstick className="w-4 h-4 text-red-600" />,
                                                },
                                                {
                                                    label: 'Fiber/Veg',
                                                    value: result.breakdown.fiber_percentage,
                                                    ideal: 50,
                                                    color: 'bg-emerald-500',
                                                    icon: <Leaf className="w-4 h-4 text-emerald-600" />,
                                                },
                                            ].map((item) => (
                                                <div key={item.label}>
                                                    <div className="flex items-center justify-between text-sm mb-1">
                                                        <span className="flex items-center gap-1.5 text-gray-700">
                                                            {item.icon} {item.label}
                                                        </span>
                                                        <span className="font-semibold text-gray-900">
                                                            {item.value}%{' '}
                                                            <span className="text-gray-400 font-normal text-xs">
                                                                (ideal: {item.ideal}%)
                                                            </span>
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full transition-all duration-700 ${item.color}`}
                                                            style={{ width: `${Math.min(item.value, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Feedback */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                                        <h3 className="font-semibold text-gray-900 mb-1">
                                            💡 {result.feedback.title}
                                        </h3>
                                        <p className="text-sm text-gray-600 leading-relaxed">
                                            {result.feedback.message}
                                        </p>
                                    </div>

                                    {/* Scan Again */}
                                    <Button
                                        onClick={resetScanner}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Scan Another Meal
                                    </Button>
                                </div>
                            )}

                            {!result && !analyzing && !error && (
                                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                                    <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="text-gray-500 text-sm">
                                        Upload a photo to see your Suku-Suku score
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
