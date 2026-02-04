import type { Location } from '@/types/database'

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = toRad(point2.latitude - point1.latitude)
    const dLon = toRad(point2.longitude - point1.longitude)

    const lat1 = toRad(point1.latitude)
    const lat2 = toRad(point2.latitude)

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distance = R * c

    return Math.round(distance * 100) / 100 // Round to 2 decimal places
}

function toRad(degrees: number): number {
    return (degrees * Math.PI) / 180
}

/**
 * Geocode an address using Nominatim (OpenStreetMap)
 * Returns latitude and longitude
 */
export async function geocodeAddress(address: string): Promise<Location | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
                q: address,
                format: 'json',
                limit: '1',
                countrycodes: 'pk', // Pakistan
            }),
            {
                headers: {
                    'User-Agent': 'FoodDonationApp/1.0',
                },
            }
        )

        const data = await response.json()

        if (data && data.length > 0) {
            return {
                latitude: parseFloat(data[0].lat),
                longitude: parseFloat(data[0].lon),
                address: data[0].display_name,
            }
        }

        return null
    } catch (error) {
        console.error('Geocoding error:', error)
        return null
    }
}

/**
 * Reverse geocode coordinates to get address
 */
export async function reverseGeocode(
    latitude: number,
    longitude: number
): Promise<string | null> {
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?` +
            new URLSearchParams({
                lat: latitude.toString(),
                lon: longitude.toString(),
                format: 'json',
            }),
            {
                headers: {
                    'User-Agent': 'FoodDonationApp/1.0',
                },
            }
        )

        const data = await response.json()
        return data.display_name || null
    } catch (error) {
        console.error('Reverse geocoding error:', error)
        return null
    }
}

/**
 * Get user's current location using browser geolocation API
 */
export function getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported by your browser'))
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const location: Location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }

                // Try to get address
                const address = await reverseGeocode(location.latitude, location.longitude)
                if (address) {
                    location.address = address
                }

                resolve(location)
            },
            (error) => {
                reject(error)
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        )
    })
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
    if (km < 1) {
        return `${Math.round(km * 1000)}m`
    }
    return `${km.toFixed(1)}km`
}

/**
 * Check if a point is within a radius of another point
 */
export function isWithinRadius(
    center: { latitude: number; longitude: number },
    point: { latitude: number; longitude: number },
    radiusKm: number
): boolean {
    const distance = calculateDistance(center, point)
    return distance <= radiusKm
}
