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
