import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { colors } from "../constants/colors";
import { Store, MapPin, Navigation, X, ChevronRight, Star } from "lucide-react-native";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");
const CARD_WIDTH = 260;
const CARD_SPACING = 12;

interface StoreItem {
  id: string;
  name: string;
  address: string;
  logo_url: string | null;
  is_active: boolean;
  distance?: number;
  description?: string;
  rating?: number;
}

interface StoreSelectorProps {
  onSelect: (storeId: string | null) => void;
  selectedStore: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

export function StoreSelector({ onSelect, selectedStore, userLocation }: StoreSelectorProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [pressedCard, setPressedCard] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { data: stores, isLoading, error: queryError } = useQuery({
    queryKey: ["stores", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, address, logo_url, is_active, latitude, longitude, description")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Supabase StoreSelector error:", error);
        throw error;
      }

      const storesWithDistance = (data || []).map((store: any) => {
        let distance: number | undefined;
        if (userLocation && store.latitude && store.longitude) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            store.latitude,
            store.longitude
          );
        }
        // Mock rating for demo - in production fetch from reviews
        const rating = 4 + Math.random();
        return { ...store, distance, rating };
      });

      if (userLocation) {
        storesWithDistance.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      return storesWithDistance;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const selectedStoreData = stores?.find((s: StoreItem) => s.id === selectedStore);

  const handleSelect = useCallback((storeId: string | null) => {
    // Animate selection
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onSelect(storeId);
  }, [onSelect, scaleAnim]);

  const handlePressIn = (id: string) => setPressedCard(id);
  const handlePressOut = () => setPressedCard(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.accent} />
        <Text style={styles.loadingText}>Finding stores near you...</Text>
      </View>
    );
  }

  if (queryError) {
    return (
      <View style={[styles.loadingContainer, styles.errorContainer]}>
        <Text style={styles.errorText}>
          Failed to load stores: {(queryError as any).message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with animated count */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIcon}>
            <Store size={16} color={colors.accent} />
          </View>
          <Text style={styles.headerTitle}>Nearby Stores</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{(stores?.length || 0) + 1}</Text>
          </View>
        </View>
        {selectedStore && (
          <TouchableOpacity 
            style={styles.clearBtn} 
            onPress={() => handleSelect(null)}
            activeOpacity={0.7}
          >
            <X size={14} color={colors.textMuted} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Scroll Cards */}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        {/* All Stores Card */}
        <TouchableOpacity
          style={[
            styles.card,
            !selectedStore && styles.cardActive,
            pressedCard === "all" && styles.cardPressed,
          ]}
          onPress={() => handleSelect(null)}
          onPressIn={() => handlePressIn("all")}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
        >
          <BlurView intensity={!selectedStore ? 50 : 30} tint="light" style={styles.cardBlur}>
            <View style={[
              styles.cardInner,
              !selectedStore && styles.cardInnerActive
            ]}>
              <View style={[
                styles.allStoresIcon,
                !selectedStore && styles.allStoresIconActive
              ]}>
                <Store size={28} color={!selectedStore ? colors.accent : colors.textMuted} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[
                  styles.cardName,
                  !selectedStore && styles.cardNameActive
                ]}>
                  All Stores
                </Text>
                <Text style={styles.cardMeta}>Browse everything</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.itemCount}>{stores?.length || 0} stores</Text>
                  <ChevronRight size={14} color={colors.textMuted} />
                </View>
              </View>
              {!selectedStore && (
                <Animated.View style={[styles.activeIndicator, { transform: [{ scale: scaleAnim }] }]} />
              )}
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Individual Store Cards */}
        {stores?.map((store: StoreItem) => (
          <TouchableOpacity
            key={store.id}
            style={[
              styles.card,
              selectedStore === store.id && styles.cardActive,
              pressedCard === store.id && styles.cardPressed,
            ]}
            onPress={() => handleSelect(store.id)}
            onPressIn={() => handlePressIn(store.id)}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
          >
            <BlurView 
              intensity={selectedStore === store.id ? 50 : 30} 
              tint="light" 
              style={styles.cardBlur}
            >
              <View style={[
                styles.cardInner,
                selectedStore === store.id && styles.cardInnerActive
              ]}>
                {/* Logo */}
                <View style={styles.logoContainer}>
                  {store.logo_url ? (
                    <Image 
                      source={{ uri: store.logo_url }} 
                      style={styles.logoImage} 
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Store size={24} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardContent}>
                  <Text 
                    style={[
                      styles.cardName,
                      selectedStore === store.id && styles.cardNameActive
                    ]} 
                    numberOfLines={1}
                  >
                    {store.name}
                  </Text>

                  {store.address && (
                    <View style={styles.addressRow}>
                      <MapPin size={11} color={colors.textMuted} />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {store.address}
                      </Text>
                    </View>
                  )}

                  {/* Distance & Rating Row */}
                  <View style={styles.metaRow}>
                    {store.distance !== undefined && (
                      <View style={styles.distanceBadge}>
                        <Navigation size={10} color={colors.accent} />
                        <Text style={styles.distanceText}>
                          {store.distance < 1 
                            ? `${(store.distance * 1000).toFixed(0)} m` 
                            : `${store.distance.toFixed(1)} km`
                          }
                        </Text>
                      </View>
                    )}
                    {store.rating && (
                      <View style={styles.ratingBadge}>
                        <Star size={10} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {selectedStore === store.id && (
                  <Animated.View style={[styles.activeIndicator, { transform: [{ scale: scaleAnim }] }]} />
                )}
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected Store Banner */}
      {selectedStoreData && (
        <View style={styles.selectedBanner}>
          <BlurView intensity={40} tint="light" style={styles.bannerBlur}>
            <View style={styles.bannerInner}>
              <View style={styles.bannerIcon}>
                <Store size={16} color={colors.accent} />
              </View>
              <Text style={styles.bannerText}>
                Showing products from <Text style={styles.bannerHighlight}>{selectedStoreData.name}</Text>
              </Text>
              <TouchableOpacity 
                style={styles.bannerClose} 
                onPress={() => handleSelect(null)}
              >
                <X size={14} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  errorContainer: {
    backgroundColor: "rgba(255,0,0,0.1)",
    borderRadius: 12,
    marginHorizontal: 16,
  },
  errorText: { color: "#ef5350", fontSize: 13, textAlign: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  headerLeft: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8 
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "700" 
  },
  countBadge: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  clearText: { 
    color: colors.textMuted, 
    fontSize: 12, 
    fontWeight: "500" 
  },
  scrollContent: { 
    paddingHorizontal: 16, 
    gap: CARD_SPACING 
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    transform: [{ scale: 1 }],
  },
  cardActive: {
    borderColor: colors.accent + "60",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
  },
  cardBlur: { 
    borderRadius: 20, 
    overflow: "hidden" 
  },
  cardInner: {
    backgroundColor: colors.glass,
    padding: 14,
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardInnerActive: { 
    backgroundColor: colors.accent + "12" 
  },
  allStoresIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  allStoresIconActive: {
    backgroundColor: colors.accent + "25",
    borderColor: colors.accent + "40",
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  logoImage: { 
    width: "100%", 
    height: "100%" 
  },
  logoPlaceholder: { 
    width: "100%", 
    height: "100%", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  cardContent: { 
    flex: 1, 
    justifyContent: "center" 
  },
  cardName: { 
    color: "#fff", 
    fontSize: 15, 
    fontWeight: "600", 
    marginBottom: 4 
  },
  cardNameActive: { 
    color: colors.accent 
  },
  cardMeta: { 
    color: colors.textMuted, 
    fontSize: 12, 
    marginBottom: 6 
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemCount: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  addressRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 4, 
    marginBottom: 6 
  },
  addressText: { 
    color: colors.textMuted, 
    fontSize: 11, 
    flex: 1 
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.accent + "15",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: { 
    color: colors.accent, 
    fontSize: 11, 
    fontWeight: "600" 
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,215,0,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: { 
    color: "#FFD700", 
    fontSize: 11, 
    fontWeight: "600" 
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.accent,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  selectedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.accent + "40",
  },
  bannerBlur: { 
    borderRadius: 14, 
    overflow: "hidden" 
  },
  bannerInner: { 
    backgroundColor: colors.accent + "12", 
    padding: 12, 
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: { 
    color: "#fff", 
    fontSize: 13,
    flex: 1,
  },
  bannerHighlight: { 
    color: colors.accent, 
    fontWeight: "700" 
  },
  bannerClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});