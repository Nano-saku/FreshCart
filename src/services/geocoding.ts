import * as Location from 'expo-location';

export class GeocodingService {
    private static hasPermission = false;

    // Call this once when app starts
    static async requestPermissions(): Promise<boolean> {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            this.hasPermission = status === 'granted';
            return this.hasPermission;
        } catch (error) {
            console.error('Permission error:', error);
            return false;
        }
    }

    // Convert address to coordinates
    static async addressToCoordinates(address: string): Promise<{
        latitude: number;
        longitude: number;
    } | null> {
        try {
            // Ensure we have permission
            if (!this.hasPermission) {
                const granted = await this.requestPermissions();
                if (!granted) {
                    console.log('Location permission not granted, skipping geocoding');
                    return null;
                }
            }

            const results = await Location.geocodeAsync(address);

            if (results.length > 0) {
                return {
                    latitude: results[0].latitude,
                    longitude: results[0].longitude,
                };
            }
            return null;
        } catch (error) {
            console.error('Geocoding error:', error);
            return null;
        }
    }

    // Calculate distance between two coordinates
    static calculateDistance(
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
    ): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
}