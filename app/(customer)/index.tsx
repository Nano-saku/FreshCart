import { useState, useEffect } from "react";
import { View, FlatList, TextInput, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useQuery } from "@tanstack/react-query";
import * as Location from "expo-location";
import { supabase } from "../../src/lib/supabase";
import { ProductCard } from "../../src/components/ProductCard";
import { StoreSelector } from "../../src/components/StoreSelector";
import { GreenScreen } from "../../src/components/GreenScreen";
import { Search } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { colors } from "../../src/constants/colors";

export default function HomeScreen() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      } catch (err) {
        console.warn("Location error:", err);
      }
    })();
  }, []);

  const { data: products, isLoading, error } = useQuery({
    queryKey: ["products", selectedStore, search],
    queryFn: async () => {
      let q = supabase
        .from("store_products")
        .select("*, product:products(*), store:stores(name)")
        .eq("is_available", true);
      
      if (selectedStore) q = q.eq("store_id", selectedStore);
      if (search) q = q.ilike("product.name", `%${search}%`);
      
      const { data, error } = await q;
      if (error) {
        console.error("Products query error:", error);
        throw error;
      }
      return data || [];
    },
  });

  return (
    <GreenScreen>
      <StoreSelector 
        onSelect={setSelectedStore} 
        selectedStore={selectedStore}
        userLocation={userLocation}
      />

      <View style={styles.searchContainer}>
        <BlurView intensity={30} tint="light" style={styles.searchBlur}>
          <View style={styles.searchInner}>
            <Search size={16} color="rgba(255,255,255,0.65)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search fresh products..."
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </BlurView>
      </View>

      {error && (
        <Text style={{color: 'red', textAlign: 'center', marginTop: 20}}>
          Error loading products: {error.message}
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          numColumns={2}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ProductCard item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No products found.</Text>
          }
        />
      )}
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  searchBlur: {
    overflow: "hidden",
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#fff",
  },
  listContent: { 
    paddingHorizontal: 8, 
    paddingBottom: 100,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
  }
});