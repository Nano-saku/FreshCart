import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GreenScreen } from "../../src/components/GreenScreen";
import { ProductCard } from "../../src/components/ProductCard";
import { StoreSelector } from "../../src/components/StoreSelector";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { Bell, TrendingUp } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["home-products", selectedStore],
    queryFn: async () => {
      let query = supabase
        .from("store_products")
        .select(`*, product:products(*, category:categories(name)), store:stores(name, logo_url)`)
        .eq("is_available", true)
        .gt("stock_qty", 0);

      if (selectedStore) {
        query = query.eq("store_id", selectedStore);
      }

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <GreenScreen>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>FreshCart</Text>
          <Text style={styles.subGreeting}>Fresh groceries, delivered fast</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn} onPress={() => router.push("/(customer)/orders")}>
          <Bell size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Store Selector */}
      <StoreSelector
        onSelect={setSelectedStore}
        selectedStore={selectedStore}
      />

      {/* Featured Section */}
      <View style={styles.sectionHeader}>
        <TrendingUp size={18} color={colors.accent} />
        <Text style={styles.sectionTitle}>
          {selectedStore ? "Store Products" : "Featured Products"}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={styles.errorText}>Failed to load products</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => <ProductCard item={item} />}
          contentContainerStyle={{ padding: 12, paddingBottom: 200 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No products available</Text>
              <Text style={styles.emptySub}>Check back later for fresh items</Text>
            </View>
          }
        />
      )}
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  greeting: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subGreeting: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorText: {
    color: "#ef5350",
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
});