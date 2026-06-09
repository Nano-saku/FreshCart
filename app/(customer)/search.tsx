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
  Keyboard,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "../../src/components/AppScreen";
import { ProductCard } from "../../src/components/ProductCard";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Clock,
  TrendingUp,
} from "lucide-react-native";

const RECENT_SEARCHES = [
  "Fresh Blueberry",
  "Radishes",
  "Pear",
  "Red apple",
  "Grape",
  "Brown bread",
];

const TRENDING = [
  "Organic Vegetables",
  "Fresh Fruits",
  "Dairy Products",
  "Bakery Items",
];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [recentSearches, setRecentSearches] = useState(RECENT_SEARCHES);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

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
        .select(`
          id,
          price,
          stock_qty,
          is_available,
          product:products(
            id,
            name,
            image_url,
            unit,
            description,
            category:categories(name)
          ),
          store:stores(name)
        `)
        .ilike("product.name", `%${query}%`)
        .eq("is_available", true)
        .gt("stock_qty", 0)
        .limit(20);

      if (error) {
        console.error("Search error:", error);
        throw error;
      }
      
      // Filter out any results where product is null
      const validResults = (data || []).filter(item => 
        item.product !== null && item.product !== undefined
      );
      
      return validResults;
    },
    enabled: query.length > 1,
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSearch = (text: string) => {
    setQuery(text);
    // Add to recent searches
    if (text.trim() && !recentSearches.includes(text.trim())) {
      setRecentSearches(prev => [text.trim(), ...prev.slice(0, 5)]);
    }
  };

  const clearSearch = () => {
    setQuery("");
    Keyboard.dismiss();
  };

  const removeRecent = (item: string) => {
    setRecentSearches((prev) => prev.filter((r) => r !== item));
  };

  const renderProduct = useCallback(({ item }: { item: any }) => {
    return (
      <View style={styles.productCardContainer}>
        <ProductCard item={item} />
      </View>
    );
  }, [styles]);

  return (
    <AppScreen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <View style={styles.searchBar}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={handleSearch}
            placeholder="Search fresh products..."
            placeholderTextColor={theme.textMuted}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearBtn}>
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.filterBtn}>
            <SlidersHorizontal size={18} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Results */}
      {query.length > 1 && (
        <>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsText}>
              {isLoading
                ? "Searching..."
                : `${results?.length || 0} results found`}
            </Text>
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={theme.primary} size="large" />
              <Text style={styles.loadingText}>Searching products...</Text>
            </View>
          )}

          {!isLoading && results?.length === 0 && (
            <View style={styles.emptyContainer}>
              <Search size={48} color={theme.textMuted} />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySub}>
                Try a different search term or browse categories
              </Text>
            </View>
          )}

          {!isLoading && results && results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id?.toString()}
              numColumns={2}
              renderItem={renderProduct}
              contentContainerStyle={styles.productList}
              columnWrapperStyle={styles.productRow}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Default State - Recent & Trending */}
      {query.length <= 1 && (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <>
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Clock size={18} color={theme.primary} />
                    <Text style={styles.sectionTitle}>Recent</Text>
                    <TouchableOpacity onPress={() => setRecentSearches([])}>
                      <Text style={styles.clearAll}>Clear all</Text>
                    </TouchableOpacity>
                  </View>

                  {recentSearches.map((item, index) => (
                    <TouchableOpacity
                      key={`recent-${index}`}
                      style={styles.recentItem}
                      onPress={() => handleSearch(item)}
                    >
                      <Clock size={16} color={theme.textMuted} />
                      <Text style={styles.recentText}>{item}</Text>
                      <TouchableOpacity
                        onPress={() => removeRecent(item)}
                        style={styles.recentRemove}
                      >
                        <X size={16} color={theme.textMuted} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {/* Trending */}
              <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                <TrendingUp size={18} color={theme.primary} />
                <Text style={styles.sectionTitle}>Trending</Text>
              </View>

              <View style={styles.trendingGrid}>
                {TRENDING.map((item, index) => (
                  <TouchableOpacity
                    key={`trending-${index}`}
                    style={styles.trendingChip}
                    onPress={() => handleSearch(item)}
                  >
                    <Text style={styles.trendingText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Empty state when no recent searches */}
              {recentSearches.length === 0 && (
                <View style={styles.emptyState}>
                  <Search size={32} color={theme.textMuted} />
                  <Text style={styles.emptyStateText}>
                    Start searching for your favorite products
                  </Text>
                </View>
              )}
            </>
          }
        />
      )}
    </AppScreen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  header: {
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.surface,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  input: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 15,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsHeader: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  resultsText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  loadingText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  productList: {
    paddingHorizontal: 10,
    paddingBottom: 100,
  },
  productRow: {
    justifyContent: "space-between",
  },
  productCardContainer: {
    flex: 1,
    maxWidth: '50%',
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  clearAll: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  recentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.divider,
    gap: 12,
  },
  recentText: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 15,
  },
  recentRemove: {
    padding: 4,
  },
  trendingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  trendingChip: {
    backgroundColor: theme.primary + "15",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.primary + "25",
  },
  trendingText: {
    color: theme.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  emptySub: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyStateText: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});