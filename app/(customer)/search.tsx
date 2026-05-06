import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GreenScreen } from "../../src/components/GreenScreen";
import { ProductCard } from "../../src/components/ProductCard";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { Search, SlidersHorizontal } from "lucide-react-native";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: results,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data, error } = await supabase
        .from("store_products")
        .select(`*, product:products(*, category:categories(name)), store:stores(name)`)
        .ilike("product.name", `%${query}%`)
        .eq("is_available", true)
        .gt("stock_qty", 0);

      if (error) throw error;
      return data ?? [];
    },
    enabled: query.length > 1,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <GreenScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Search fresh products..."
            placeholderTextColor={colors.textMuted}
            autoFocus
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.filterBtn}>
            <SlidersHorizontal size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading && query.length > 1 && (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      )}

      {!isLoading && query.length > 1 && results?.length === 0 && (
        <View style={styles.emptyContainer}>
          <Search size={48} color={colors.textMuted} />
          <Text style={styles.empty}>No products found for "{query}"</Text>
          <Text style={styles.emptySub}>Try a different search term</Text>
        </View>
      )}

      {query.length <= 1 && (
        <View style={styles.emptyContainer}>
          <Search size={48} color={colors.textMuted} />
          <Text style={styles.empty}>Start typing to search</Text>
          <Text style={styles.emptySub}>Find fresh products near you</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => <ProductCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      />
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  title: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  filterBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 16,
  },
  emptySub: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 13,
    opacity: 0.7,
  },
});