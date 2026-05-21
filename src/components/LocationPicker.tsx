import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Navigation, RotateCcw } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useFocusEffect } from 'expo-router';

interface Props {
    initialLatitude?: number;
    initialLongitude?: number;
    onLocationSelect: (location: {
        latitude: number;
        longitude: number;
        address: string;
    }) => void;
    onClose: () => void;
}

export function LocationPicker({ initialLatitude, initialLongitude, onLocationSelect, onClose }: Props) {
    const { theme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [currentAddress, setCurrentAddress] = useState('');
    const [currentCoords, setCurrentCoords] = useState<{
        latitude: number;
        longitude: number;
    } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Reset and get fresh location every time component opens
    useEffect(() => {
        setLoading(true);
        setCurrentAddress('');
        setCurrentCoords(null);
        setErrorMsg(null);
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        try {
            setLoading(true);
            setErrorMsg(null);

            // Get current GPS position
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                setErrorMsg('Location permission is required. Please enable it in Settings.');
                setLoading(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });

            const coords = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };

            setCurrentCoords(coords);
            await reverseGeocode(coords.latitude, coords.longitude);
            setLoading(false);
        } catch (error) {
            console.error('Error getting location:', error);
            setErrorMsg('Could not get your location. Please try again.');
            setLoading(false);
        }
    };

    const reverseGeocode = async (lat: number, lng: number) => {
        try {
            const results = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lng,
            });

            if (results.length > 0) {
                const addr = results[0];
                const parts = [addr.name, addr.street, addr.district, addr.city, addr.region]
                    .filter(Boolean);
                setCurrentAddress(parts.join(', ') || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            } else {
                setCurrentAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
            }
        } catch (error) {
            setCurrentAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
    };

    const handleConfirm = () => {
        if (!currentCoords || !currentAddress) {
            Alert.alert('Error', 'Could not determine your location. Please try again.');
            return;
        }
        onLocationSelect({
            latitude: currentCoords.latitude,
            longitude: currentCoords.longitude,
            address: currentAddress,
        });
    };

    const styles = createStyles(theme);

    return (
        <View style={styles.container}>
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.primary} />
                    <Text style={styles.loadingText}>Getting your location...</Text>
                    <TouchableOpacity style={[styles.cancelBtn, { marginTop: 20 }]} onPress={onClose}>
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            ) : errorMsg ? (
                <View style={styles.center}>
                    <View style={[styles.statusCircle, { backgroundColor: '#FF5252' + '15' }]}>
                        <MapPin size={48} color="#FF5252" />
                    </View>
                    <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Location Error</Text>
                    <Text style={styles.errorText}>{errorMsg}</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]} onPress={onClose}>
                            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.retryBtn, { backgroundColor: theme.primary }]} onPress={getCurrentLocation}>
                            <RotateCcw size={18} color="#fff" />
                            <Text style={styles.retryBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <>
                    <View style={styles.center}>
                        <View style={[styles.statusCircle, { backgroundColor: '#4CAF50' + '15' }]}>
                            <MapPin size={48} color="#4CAF50" />
                        </View>

                        <Text style={[styles.statusTitle, { color: theme.textPrimary }]}>Location Found!</Text>

                        <View style={[styles.addressCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
                            <MapPin size={20} color={theme.primary} />
                            <Text style={[styles.addressText, { color: theme.textPrimary }]}>{currentAddress}</Text>
                        </View>

                        <Text style={[styles.coordsText, { color: theme.textMuted }]}>
                            {currentCoords?.latitude.toFixed(6)}, {currentCoords?.longitude.toFixed(6)}
                        </Text>

                        <TouchableOpacity style={styles.retryLink} onPress={getCurrentLocation}>
                            <Navigation size={16} color={theme.primary} />
                            <Text style={[styles.retryLinkText, { color: theme.primary }]}>Refresh Location</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: theme.background, borderColor: theme.border, borderWidth: 1 }]} onPress={onClose}>
                            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: theme.primary }]} onPress={handleConfirm}>
                            <Text style={styles.confirmBtnText}>Use This Location</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
}

const createStyles = (theme: any) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.background,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: theme.textSecondary,
    },
    statusCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    statusTitle: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 20,
    },
    errorText: {
        fontSize: 15,
        color: '#FF5252',
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 16,
        borderRadius: 12,
        gap: 12,
        width: '100%',
        borderWidth: 1,
    },
    addressText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 22,
    },
    coordsText: {
        marginTop: 12,
        fontSize: 12,
        fontFamily: 'monospace',
        marginBottom: 8,
    },
    retryLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
    },
    retryLinkText: {
        fontSize: 14,
        fontWeight: '600',
    },
    buttonRow: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
        paddingBottom: 32,
    },
    cancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    retryBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    retryBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
    confirmBtn: {
        flex: 2,
        padding: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
    },
});