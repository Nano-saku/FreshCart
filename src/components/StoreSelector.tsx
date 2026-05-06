import { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { colors } from "../constants/colors";
import { Store, MapPin, Navigation, X } from "lucide-react-native";
import { BlurView } from "expo-blur";

const { width } = Dimensions.get("window");
const CARD_WIDTH = 280;
const CARD_SPACING = 12;

interface StoreItem {
  id: string;
  name: string;
  address: string;
  logo_url: string | null;
  is_active: boolean;
  distance?: number;
}

interface StoreSelectorProps {
  onSelect: (storeId: string | null) => void;
  selectedStore: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

export function StoreSelector({ onSelect, selectedStore, userLocation }: StoreSelectorProps) {
  const scrollRef = useRef<ScrollView>(null);

  const { data: stores, isLoading, error: queryError } = useQuery({
    queryKey: ["stores", userLocation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, address, logo_url, is_active, lat, lng")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Supabase StoreSelector error:", error);
        throw error;
      }

      const storesWithDistance = (data || []).map((store: any) => {
        let distance: number | undefined;
        if (userLocation && store.lat && store.lng) {
          distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            store.lat,
            store.lng
          );
        }
        return { ...store, distance };
      });

      if (userLocation) {
        storesWithDistance.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      return storesWithDistance;
    },
  });



  const selectedStoreData = stores?.find((s: StoreItem) => s.id === selectedStore);

  const handleSelect = (storeId: string) => {
    onSelect(storeId === selectedStore ? null : storeId);
  };

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
      <View style={[styles.loadingContainer, { backgroundColor: "rgba(255,0,0,0.1)", borderRadius: 12, marginHorizontal: 16 }]}>
        <Text style={{ color: "red", fontSize: 13, textAlign: "center" }}>
          Failed to load stores: {(queryError as any).message}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Store size={18} color={colors.accent} />
          <Text style={styles.headerTitle}>Nearby Stores</Text>
        </View>
        {selectedStore && (
          <TouchableOpacity style={styles.clearBtn} onPress={() => onSelect(null)}>
            <X size={14} color={colors.textMuted} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_SPACING}
        snapToAlignment="start"
      >
        <TouchableOpacity
          style={[styles.card, !selectedStore && styles.cardActive]}
          onPress={() => onSelect(null)}
          activeOpacity={0.9}
        >
          <BlurView intensity={!selectedStore ? 60 : 40} tint="light" style={styles.cardBlur}>
            <View style={[styles.cardInner, !selectedStore && styles.cardInnerActive]}>
              <View style={styles.allStoresIcon}>
                <Store size={28} color={!selectedStore ? colors.accent : colors.textMuted} />
              </View>
              <Text style={[styles.cardName, !selectedStore && styles.cardNameActive]}>
                All Stores
              </Text>
              <Text style={styles.cardMeta}>Browse everything</Text>
              {!selectedStore && <View style={styles.activeIndicator} />}
            </View>
          </BlurView>
        </TouchableOpacity>

        {stores?.map((store: StoreItem) => (
          <TouchableOpacity
            key={store.id}
            style={[styles.card, selectedStore === store.id && styles.cardActive]}
            onPress={() => handleSelect(store.id)}
            activeOpacity={0.9}
          >
            <BlurView intensity={selectedStore === store.id ? 60 : 40} tint="light" style={styles.cardBlur}>
              <View style={[styles.cardInner, selectedStore === store.id && styles.cardInnerActive]}>
                <View style={styles.logoContainer}>
                  {store.logo_url ? (
                    <Image source={{ uri: store.logo_url }} style={styles.logoImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.logoPlaceholder}>
                      <Store size={24} color={colors.textMuted} />
                    </View>
                  )}
                </View>

                <View style={styles.infoContainer}>
                  <Text style={[styles.cardName, selectedStore === store.id && styles.cardNameActive]} numberOfLines={1}>
                    {store.name}
                  </Text>

                  {store.address && (
                    <View style={styles.addressRow}>
                      <MapPin size={12} color={colors.textMuted} />
                      <Text style={styles.addressText} numberOfLines={1}>{store.address}</Text>
                    </View>
                  )}

                  {store.distance !== undefined && (
                    <View style={styles.distanceRow}>
                      <Navigation size={12} color={colors.accent} />
                      <Text style={styles.distanceText}>
                        {store.distance < 1 ? `${(store.distance * 1000).toFixed(0)} m` : `${store.distance.toFixed(1)} km`}
                      </Text>
                    </View>
                  )}
                </View>

                {selectedStore === store.id && <View style={styles.activeIndicator} />}
              </View>
            </BlurView>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {selectedStoreData && (
        <View style={styles.selectedBanner}>
          <BlurView intensity={50} tint="light" style={styles.bannerBlur}>
            <View style={styles.bannerInner}>
              <Text style={styles.bannerText}>
                Showing products from <Text style={styles.bannerHighlight}>{selectedStoreData.name}</Text>
              </Text>
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
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  clearText: { color: colors.textMuted, fontSize: 12, fontWeight: "500" },
  scrollContent: { paddingHorizontal: 16, gap: CARD_SPACING },
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardActive: {
    borderColor: colors.accent + "50",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cardBlur: { borderRadius: 20, overflow: "hidden" },
  cardInner: {
    backgroundColor: colors.glass,
    padding: 16,
    minHeight: 140,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  cardInnerActive: { backgroundColor: colors.accent + "10" },
  allStoresIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: colors.accent + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  logoImage: { width: "100%", height: "100%" },
  logoPlaceholder: { width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  infoContainer: { flex: 1, justifyContent: "center" },
  cardName: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 6 },
  cardNameActive: { color: colors.accent },
  cardMeta: { color: colors.textMuted, fontSize: 13 },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  addressText: { color: colors.textMuted, fontSize: 12, flex: 1 },
  distanceRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  distanceText: { color: colors.accent, fontSize: 13, fontWeight: "600" },
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
    borderColor: colors.accent + "30",
  },
  bannerBlur: { borderRadius: 14, overflow: "hidden" },
  bannerInner: { backgroundColor: colors.accent + "15", padding: 12, alignItems: "center" },
  bannerText: { color: "#fff", fontSize: 13 },
  bannerHighlight: { color: colors.accent, fontWeight: "700" },
});
