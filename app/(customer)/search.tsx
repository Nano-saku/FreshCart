import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { GreenScreen } from "../../src/components/GreenScreen";
import { ProductCard } from "../../src/components/ProductCard";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { Search } from "lucide-react-native";

export default function SearchScreen() {
  const [query, setQuery] = useState("");

  const { data: results, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await supabase
        .from("store_products")
        .select(
          "*, product:products(*, category:categories(name)), store:stores(name)",
        )
        .ilike("product.name", `%${query}%`)
        .eq("is_available", true)
        .gt("stock_qty", 0);
      return data ?? [];
    },
    enabled: query.length > 1,
  });

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
            placeholder="Search fresh products…"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />
        </View>
      </View>
      {isLoading && (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      )}
      {!isLoading && query.length > 1 && results?.length === 0 && (
        <Text style={styles.empty}>No products found for "{query}"</Text>
      )}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={3}
        renderItem={({ item }) => <ProductCard item={item} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
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
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
});
