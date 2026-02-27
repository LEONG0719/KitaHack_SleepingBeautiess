// lib/googleMaps.ts

// Google Maps JavaScript API loader — singleton pattern
let loadPromise: Promise<void> | null = null;

export function loadGoogleMapsAPI(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();

    // Already loaded
    if (window.google?.maps) return Promise.resolve();

    // Loading in progress
    if (loadPromise) return loadPromise;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        return Promise.reject(new Error('Google Maps API key not configured'));
    }

    loadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Maps'));
        document.head.appendChild(script);
    });

    return loadPromise;
}

// 🔥 NEW: Function to turn Lat/Lng into a Malaysian State Name!
// 🔥 BULLETPROOF VERSION: Uses OpenStreetMap as a free fallback so you don't need the Google Geocoding API enabled!
export async function getUserStateFromCoordinates(lat: number, lng: number): Promise<string | null> {
    
    // Helper function to match string against Malaysian States
    const matchState = (text: string): string | null => {
        if (!text) return null;
        if (text.includes('Kuala Lumpur')) return 'W.P. Kuala Lumpur';
        if (text.includes('Putrajaya')) return 'W.P. Putrajaya';
        if (text.includes('Labuan')) return 'W.P. Labuan';
        if (text.includes('Penang') || text.includes('Pulau Pinang')) return 'Pulau Pinang';
        if (text.includes('Malacca') || text.includes('Melaka')) return 'Melaka';
        if (text.includes('Johor')) return 'Johor';
        if (text.includes('Kedah')) return 'Kedah';
        if (text.includes('Kelantan')) return 'Kelantan';
        if (text.includes('Negeri Sembilan')) return 'Negeri Sembilan';
        if (text.includes('Pahang')) return 'Pahang';
        if (text.includes('Perak')) return 'Perak';
        if (text.includes('Perlis')) return 'Perlis';
        if (text.includes('Sabah')) return 'Sabah';
        if (text.includes('Sarawak')) return 'Sarawak';
        if (text.includes('Selangor')) return 'Selangor';
        if (text.includes('Terengganu')) return 'Terengganu';
        return null;
    };

    // 1. Try OpenStreetMap (Free, no API key required)
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`, {
            headers: { 'Accept-Language': 'en' } // Force English names
        });
        const data = await res.json();
        
        if (data && data.address) {
            // Combine all address parts to scan for state names
            const fullAddressOSM = Object.values(data.address).join(' ');
            const matchedState = matchState(fullAddressOSM);
            
            if (matchedState) {
                console.log("[Location] Successfully found state using OSM:", matchedState);
                return matchedState;
            }
        }
    } catch (e) {
        console.warn("OSM Fallback failed, trying Google Maps...", e);
    }

    // 2. Try Google Maps Geocoder (Requires Geocoding API enabled in Google Cloud)
    try {
        await loadGoogleMapsAPI();
        
        return new Promise((resolve) => {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    const fullAddressGoogle = results[0].address_components.map(c => c.long_name).join(' ');
                    const matchedState = matchState(fullAddressGoogle);
                    
                    if (matchedState) {
                        console.log("[Location] Successfully found state using Google:", matchedState);
                        resolve(matchedState);
                    } else {
                        console.warn("[Location] Could not match Google address to a state:", fullAddressGoogle);
                        resolve(null);
                    }
                } else {
                    console.warn("[Location] Google Geocoder failed. Status:", status);
                    resolve(null);
                }
            });
        });
    } catch (error) {
        console.error("All geocoding methods failed:", error);
        return null;
    }
}