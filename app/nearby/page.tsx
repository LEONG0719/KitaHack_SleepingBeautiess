'use client';

import { useEffect, useRef, useState } from 'react';
import Navbar from '@/components/Navbar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loadGoogleMapsAPI } from '@/lib/googleMaps';
import {
    MapPin,
    Search,
    Loader2,
    Star,
    Navigation,
    Clock,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';

interface NearbyRestaurant {
    placeId: string;
    name: string;
    address: string;
    rating: number;
    totalRatings: number;
    isOpen: boolean | null;
    lat: number;
    lng: number;
    photoUrl: string | null;
    priceLevel: number | null;
}

export default function NearbyPage() {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.Marker[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [restaurants, setRestaurants] = useState<NearbyRestaurant[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    // Initialize map
    useEffect(() => {
        const init = async () => {
            try {
                await loadGoogleMapsAPI();

                // Get user location
                if (!navigator.geolocation) {
                    setError('Geolocation is not supported by your browser');
                    setLoading(false);
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const loc = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        setUserLocation(loc);
                        initMap(loc);
                        setLoading(false);
                    },
                    (err) => {
                        // Default to KL if location denied
                        const defaultLoc = { lat: 3.139, lng: 101.6869 };
                        setUserLocation(defaultLoc);
                        initMap(defaultLoc);
                        setError('Location access denied. Showing Kuala Lumpur as default.');
                        setLoading(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } catch (err: any) {
                setError(err.message || 'Failed to load Google Maps');
                setLoading(false);
            }
        };

        init();
    }, []);

    const initMap = (center: { lat: number; lng: number }) => {
        if (!mapRef.current || !window.google) return;

        const map = new google.maps.Map(mapRef.current, {
            center,
            zoom: 14,
            styles: [
                {
                    featureType: 'poi.business',
                    stylers: [{ visibility: 'off' }],
                },
            ],
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
        });

        // User location marker
        new google.maps.Marker({
            position: center,
            map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#10B981',
                fillOpacity: 1,
                strokeColor: '#fff',
                strokeWeight: 3,
            },
            title: 'Your Location',
        });

        mapInstanceRef.current = map;
        infoWindowRef.current = new google.maps.InfoWindow();
    };

    const clearMarkers = () => {
        markersRef.current.forEach((m) => m.setMap(null));
        markersRef.current = [];
    };

    const searchRestaurants = async (query?: string) => {
        if (!mapInstanceRef.current || !userLocation) return;

        setSearching(true);
        setHasSearched(true);
        clearMarkers();

        const service = new google.maps.places.PlacesService(mapInstanceRef.current);

        const searchText = query || searchQuery || 'restaurant';

        const request: google.maps.places.TextSearchRequest = {
            query: `${searchText} restaurant`,
            location: new google.maps.LatLng(userLocation.lat, userLocation.lng),
            radius: 3000,
        };

        service.textSearch(request, (results, status) => {
            console.log('[NearbySearch] Status:', status, '| Results:', results?.length || 0);
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const parsed: NearbyRestaurant[] = results.slice(0, 15).map((place) => ({
                    placeId: place.place_id || '',
                    name: place.name || 'Unknown',
                    address: place.formatted_address || 'No address',
                    rating: place.rating || 0,
                    totalRatings: place.user_ratings_total || 0,
                    isOpen: place.opening_hours?.isOpen?.() ?? null,
                    lat: place.geometry?.location?.lat() || 0,
                    lng: place.geometry?.location?.lng() || 0,
                    photoUrl: place.photos?.[0]?.getUrl({ maxWidth: 400 }) || null,
                    priceLevel: place.price_level ?? null,
                }));

                setRestaurants(parsed);

                // Add markers
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(new google.maps.LatLng(userLocation.lat, userLocation.lng));

                parsed.forEach((r, index) => {
                    const marker = new google.maps.Marker({
                        position: { lat: r.lat, lng: r.lng },
                        map: mapInstanceRef.current!,
                        title: r.name,
                        label: {
                            text: String(index + 1),
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '12px',
                        },
                        icon: {
                            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
                            fillColor: '#10B981',
                            fillOpacity: 1,
                            strokeColor: '#065F46',
                            strokeWeight: 1,
                            scale: 1.8,
                            anchor: new google.maps.Point(12, 24),
                            labelOrigin: new google.maps.Point(12, 10),
                        },
                    });

                    marker.addListener('click', () => {
                        if (infoWindowRef.current) {
                            const priceStr = r.priceLevel !== null ? ' · ' + '💰'.repeat(r.priceLevel) : '';
                            const openStr = r.isOpen !== null
                                ? r.isOpen ? '<span style="color:#10B981;font-weight:600">Open Now</span>' : '<span style="color:#EF4444;font-weight:600">Closed</span>'
                                : '';
                            infoWindowRef.current.setContent(`
                                <div style="max-width:250px;font-family:Inter,sans-serif">
                                    <h3 style="margin:0 0 4px;font-size:14px;font-weight:700">${r.name}</h3>
                                    <p style="margin:0 0 4px;font-size:12px;color:#6B7280">${r.address}</p>
                                    <p style="margin:0;font-size:12px">
                                        ⭐ ${r.rating} (${r.totalRatings})${priceStr}
                                    </p>
                                    ${openStr ? `<p style="margin:4px 0 0;font-size:12px">${openStr}</p>` : ''}
                                    <a href="https://www.google.com/maps/place/?q=place_id:${r.placeId}" target="_blank" style="display:inline-block;margin-top:6px;font-size:12px;color:#10B981;text-decoration:none;font-weight:600">View on Google Maps →</a>
                                </div>
                            `);
                            infoWindowRef.current.open(mapInstanceRef.current!, marker);
                        }
                    });

                    markersRef.current.push(marker);
                    bounds.extend(new google.maps.LatLng(r.lat, r.lng));
                });

                mapInstanceRef.current!.fitBounds(bounds, 50);
            } else {
                setRestaurants([]);
            }

            setSearching(false);
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            searchRestaurants(searchQuery.trim());
        }
    };

    const priceLevelText = (level: number | null) => {
        if (level === null) return '';
        return ['Free', 'Budget', 'Moderate', 'Expensive', 'Very Expensive'][level] || '';
    };

    const focusMarker = (index: number) => {
        const marker = markersRef.current[index];
        if (marker && mapInstanceRef.current) {
            mapInstanceRef.current.panTo(marker.getPosition()!);
            mapInstanceRef.current.setZoom(16);
            google.maps.event.trigger(marker, 'click');
        }
    };

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-gray-50">
                <Navbar />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 mb-1">
                            Find Nearby Restaurants
                        </h1>
                        <p className="text-gray-600 text-sm">
                            Discover restaurants near you serving your favorite Malaysian dishes
                        </p>
                    </div>

                    {/* Search Bar */}
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search cuisine or dish (e.g., nasi lemak, roti canai, char kuey teow)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={searching || loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                        >
                            {searching ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                        </Button>
                    </form>

                    {/* Quick search chips */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {['Nasi Lemak', 'Roti Canai', 'Char Kuey Teow', 'Mamak', 'Nasi Kandar', 'Chinese Restaurant', 'Vegetarian'].map(
                            (chip) => (
                                <button
                                    key={chip}
                                    onClick={() => {
                                        setSearchQuery(chip);
                                        searchRestaurants(chip);
                                    }}
                                    disabled={searching}
                                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                >
                                    {chip}
                                </button>
                            )
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-700">{error}</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Map */}
                        <div className="lg:col-span-2">
                            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
                                {loading && (
                                    <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center">
                                        <div className="text-center">
                                            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                                            <p className="text-sm text-gray-600">Loading map...</p>
                                        </div>
                                    </div>
                                )}
                                <div ref={mapRef} className="w-full h-[500px]" />
                            </div>
                        </div>

                        {/* Restaurant List */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="p-4 border-b border-gray-100">
                                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-emerald-600" />
                                        {hasSearched
                                            ? `${restaurants.length} Restaurant${restaurants.length !== 1 ? 's' : ''} Found`
                                            : 'Search for Restaurants'}
                                    </h2>
                                </div>

                                <div className="max-h-[440px] overflow-y-auto">
                                    {!hasSearched ? (
                                        <div className="p-8 text-center">
                                            <Search className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">
                                                Search for a cuisine or click a quick tag above to find nearby restaurants
                                            </p>
                                        </div>
                                    ) : searching ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
                                            <p className="text-sm text-gray-500">Searching nearby...</p>
                                        </div>
                                    ) : restaurants.length === 0 ? (
                                        <div className="p-8 text-center">
                                            <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                                            <p className="text-sm text-gray-500">
                                                No restaurants found. Try a different search.
                                            </p>
                                        </div>
                                    ) : (
                                        restaurants.map((r, index) => (
                                            <button
                                                key={r.placeId}
                                                onClick={() => focusMarker(index)}
                                                className="w-full text-left p-4 border-b border-gray-50 hover:bg-emerald-50/50 transition-colors"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-emerald-700">
                                                            {index + 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                                                            {r.name}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 truncate mt-0.5">
                                                            {r.address}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            {r.rating > 0 && (
                                                                <span className="flex items-center gap-1 text-xs text-gray-600">
                                                                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                                                                    {r.rating} ({r.totalRatings})
                                                                </span>
                                                            )}
                                                            {r.isOpen !== null && (
                                                                <span className={`flex items-center gap-1 text-xs font-medium ${r.isOpen ? 'text-emerald-600' : 'text-red-500'}`}>
                                                                    <Clock className="w-3 h-3" />
                                                                    {r.isOpen ? 'Open' : 'Closed'}
                                                                </span>
                                                            )}
                                                            {r.priceLevel !== null && (
                                                                <span className="text-xs text-gray-500">
                                                                    {priceLevelText(r.priceLevel)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <a
                                                        href={`https://www.google.com/maps/place/?q=place_id:${r.placeId}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="flex-shrink-0 self-center p-1.5 rounded-md hover:bg-emerald-100 text-emerald-600 transition-colors"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </ProtectedRoute>
    );
}
