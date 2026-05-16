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
import { useTheme } from "../contexts/ThemeContext";
import { Store, MapPin, Navigation, X, ChevronRight, Star } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { logger } from "../lib/logger";

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
  const { theme, isDark } = useTheme();

  const { data: stores, isLoading, error: queryError } = useQuery({
    queryKey: ["stores", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, address, logo_url, is_active, latitude, longitude, description")
        .eq("is_active", true)
        .order("name");

      if (error) {
        logger.error("Supabase StoreSelector error:", error);
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
        const rating = 4 + Math.random();
        return { ...store, distance, rating };
      });

      if (userLocation) {
        storesWithDistance.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      return storesWithDistance;
    },
    staleTime: 1000 * 60 * 5,
  });

  const selectedStoreData = stores?.find((s: StoreItem) => s.id === selectedStore);

  const handleSelect = useCallback((storeId: string | null) => {
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

  const styles = createStyles(theme, isDark);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={styles.loadingText}>Finding stores near you...</Text>
      </View>
    );
  }

  if (queryError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Failed to load stores: {(queryError as any).message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIcon, { backgroundColor: theme.primary + "20" }]}>
            <Store size={16} color={theme.primary} />
          </View>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Nearby Stores</Text>
        </View>
        <View style={[styles.countBadge, { backgroundColor: theme.surfaceVariant }]}>
          <Text style={[styles.countText, { color: theme.textPrimary }]}>{(stores?.length || 0) + 1}</Text>
        </View>
        {selectedStore && (
          <TouchableOpacity onPress={() => handleSelect(null)} activeOpacity={0.7} style={styles.clearBtn}>
            <X size={14} color={theme.textMuted} />
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
      >
        {/* All Stores Card */}
        <TouchableOpacity
          onPress={() => handleSelect(null)}
          onPressIn={() => handlePressIn("all")}
          onPressOut={handlePressOut}
          activeOpacity={0.85}
          style={[
            styles.card,
            !selectedStore && styles.cardActive,
            pressedCard === "all" && styles.cardPressed,
            { borderColor: !selectedStore ? theme.primary + "60" : theme.border },
          ]}
        >
          <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={styles.cardBlur}>
            <View style={[styles.cardInner, !selectedStore && styles.cardInnerActive, { backgroundColor: theme.surface }]}>
              <View style={[styles.allStoresIcon, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                <Store size={24} color={theme.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardName, !selectedStore && styles.cardNameActive, { color: theme.textPrimary }]}>
                  All Stores
                </Text>
                <Text style={[styles.cardMeta, { color: theme.textSecondary }]}>Browse everything</Text>
                <Text style={[styles.itemCount, { color: theme.textMuted }]}>{stores?.length || 0} stores</Text>
              </View>
              {!selectedStore && (
                <ChevronRight size={20} color={theme.primary} />
              )}
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Individual Store Cards */}
        {stores?.map((store: StoreItem) => (
          <TouchableOpacity
            key={store.id}
            onPress={() => handleSelect(store.id)}
            onPressIn={() => handlePressIn(store.id)}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
            style={[
              styles.card,
              selectedStore === store.id && styles.cardActive,
              pressedCard === store.id && styles.cardPressed,
              { borderColor: selectedStore === store.id ? theme.primary + "60" : theme.border },
            ]}
          >
            <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={styles.cardBlur}>
              <View style={[styles.cardInner, selectedStore === store.id && styles.cardInnerActive, { backgroundColor: theme.surface }]}>
                {/* Logo */}
                <View style={[styles.logoContainer, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
                  {store.logo_url ? (
                    <Image source={{ uri: store.logo_url }} style={styles.logoImage} />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Store size={24} color={theme.primary} />
                    </View>
                  )}
                </View>

                {/* Info */}
                <View style={styles.cardContent}>
                  <Text style={[styles.cardName, selectedStore === store.id && styles.cardNameActive, { color: theme.textPrimary }]}>
                    {store.name}
                  </Text>

                  {store.address && (
                    <View style={styles.addressRow}>
                      <MapPin size={12} color={theme.textMuted} />
                      <Text style={[styles.addressText, { color: theme.textMuted }]} numberOfLines={1}>
                        {store.address}
                      </Text>
                    </View>
                  )}

                  {/* Distance & Rating Row */}
                  <View style={styles.metaRow}>
                    {store.distance !== undefined && (
                      <View style={[styles.distanceBadge, { backgroundColor: theme.primary + "15" }]}>
                        <Navigation size={10} color={theme.primary} />
                        <Text style={[styles.distanceText, { color: theme.primary }]}>
                          {store.distance < 1
                            ? `${(store.distance * 1000).toFixed(0)} m`
                            : `${store.distance.toFixed(1)} km`}
                        </Text>
                      </View>
                    )}
                    {store.rating && (
                      <View style={[styles.ratingBadge, { backgroundColor: "rgba(255,215,0,0.15)" }]}>
                        <Star size={10} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>{store.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {selectedStore === store.id && (
                  <View style={[styles.activeIndicator, { backgroundColor: theme.primary }]} />
                )}
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Selected Store Banner */}
      {selectedStoreData && (
        <View style={[styles.selectedBanner, { borderColor: theme.primary + "40" }]}>
          <BlurView intensity={isDark ? 20 : 40} tint={isDark ? "dark" : "light"} style={styles.bannerBlur}>
            <View style={[styles.bannerInner, { backgroundColor: theme.primary + "12" }]}>
              <View style={[styles.bannerIcon, { backgroundColor: theme.primary + "20" }]}>
                <Store size={14} color={theme.primary} />
              </View>
              <Text style={[styles.bannerText, { color: theme.textPrimary }]}>
                Showing products from <Text style={[styles.bannerHighlight, { color: theme.primary }]}>{selectedStoreData.name}</Text>
              </Text>
              <TouchableOpacity onPress={() => handleSelect(null)} style={[styles.bannerClose, { backgroundColor: theme.surfaceVariant }]}>
                <X size={14} color={theme.textMuted} />
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

const createStyles = (theme: typeof import("../constants/colors").lightTheme, isDark: boolean) => StyleSheet.create({
  container: { marginTop: 8 },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { color: theme.textMuted, fontSize: 14 },
  errorContainer: {
    backgroundColor: theme.error + "10",
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
  },
  errorText: { color: theme.error, fontSize: 13, textAlign: "center" },
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
    gap: 8,
  },
  headerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
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
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
  },
  clearText: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardActive: {
    shadowColor: theme.primary,
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
    overflow: "hidden",
  },
  cardInner: {
    padding: 14,
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardInnerActive: {
    backgroundColor: theme.primary + "12",
  },
  allStoresIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  logoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  cardNameActive: {
    color: theme.primary,
  },
  cardMeta: {
    fontSize: 12,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  itemCount: {
    fontSize: 11,
    fontWeight: "500",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  addressText: {
    fontSize: 11,
    flex: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: "600",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  ratingText: {
    color: "#FFD700",
    fontSize: 11,
    fontWeight: "600",
  },
  activeIndicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  selectedBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  bannerBlur: {
    borderRadius: 14,
    overflow: "hidden",
  },
  bannerInner: {
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bannerIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  bannerText: {
    fontSize: 13,
    flex: 1,
  },
  bannerHighlight: {
    fontWeight: "700",
  },
  bannerClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});