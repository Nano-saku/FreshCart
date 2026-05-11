import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "../../src/components/AppScreen";
import { ProductCard } from "../../src/components/ProductCard";
import { StoreSelector } from "../../src/components/StoreSelector";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/contexts/ThemeContext";
import { router } from "expo-router";
import { Search, Bell, ShoppingBag, ChevronRight } from "lucide-react-native";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  { name: "Vegetables", icon: "🥬", color: "#4CAF50" },
  { name: "Fruits", icon: "🍎", color: "#FF9800" },
  { name: "Meats", icon: "🥩", color: "#F44336" },
  { name: "Fish", icon: "🐟", color: "#2196F3" },
  { name: "Eggs", icon: "🥚", color: "#FFC107" },
  { name: "Breads", icon: "🍞", color: "#795548" },
  { name: "Nuts", icon: "🥜", color: "#8D6E63" },
  { name: "Honey", icon: "🍯", color: "#FFB300" },
  { name: "Wheat", icon: "🌾", color: "#A1887F" },
  { name: "Cheese", icon: "🧀", color: "#FFC107" },
  { name: "Milk", icon: "🥛", color: "#90CAF9" },
  { name: "Pasta", icon: "🍝", color: "#FFCC80" },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: products,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["home-products", selectedStore, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("store_products")
        .select(
          `*, product:products(*, category:categories(name)), store:stores(name, logo_url)`,
        )
        .eq("is_available", true)
        .gt("stock_qty", 0);

      if (selectedStore) {
        query = query.eq("store_id", selectedStore);
      }

      if (selectedCategory) {
        query = query.ilike("product.category.name", selectedCategory);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderCategoryItem = ({ item }: { item: (typeof CATEGORIES)[0] }) => {
    const styles = createStyles(theme);
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          selectedCategory === item.name && styles.categoryItemActive,
        ]}
        onPress={() =>
          setSelectedCategory(selectedCategory === item.name ? null : item.name)
        }
        activeOpacity={0.8}
      >
        <View
          style={[styles.categoryIcon, { backgroundColor: item.color + "15" }]}
        >
          <Text style={styles.categoryEmoji}>{item.icon}</Text>
        </View>
        <Text
          style={[
            styles.categoryName,
            selectedCategory === item.name && styles.categoryNameActive,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const styles = createStyles(theme);

  return (
    <AppScreen noPadding>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Welcome to</Text>
            <Text style={styles.title}>FreshCart</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/(customer)/search")}
            >
              <Search size={22} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/(customer)/orders")}
            >
              <Bell size={22} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => router.push("/(customer)/search")}
          activeOpacity={0.8}
        >
          <Search size={18} color={theme.textMuted} />
          <Text style={styles.searchPlaceholder}>Search fresh products...</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Promo Banner */}
        <View style={styles.bannerContainer}>
          <View style={styles.banner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTag}>Special Offer</Text>
              <Text style={styles.bannerTitle}>
                30% off your first purchase
              </Text>
              <TouchableOpacity style={styles.bannerBtn}>
                <Text style={styles.bannerBtnText}>Shop Now</Text>
                <ChevronRight size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.bannerImage}>
              <Text style={{ fontSize: 60 }}>🥗</Text>
            </View>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.name}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />

        {/* Store Selector */}
        <StoreSelector
          onSelect={setSelectedStore}
          selectedStore={selectedStore}
        />

        {/* Products Section */}
        <View style={styles.sectionHeader}>
          <ShoppingBag size={18} color={theme.primary} />
          <Text style={styles.sectionTitle}>
            {selectedStore ? "Store Products" : "Featured Products"}
          </Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <Text style={styles.errorText}>Failed to load products</Text>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item }) => <ProductCard item={item} />}
            contentContainerStyle={{ padding: 8, paddingBottom: 200 }}
            scrollEnabled={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No products available</Text>
                <Text style={styles.emptySub}>
                  Check back later for fresh items
                </Text>
              </View>
            }
          />
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: theme.surface,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  greeting: {
    color: theme.textMuted,
    fontSize: 14,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.background,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchPlaceholder: {
    color: theme.textMuted,
    fontSize: 15,
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  banner: {
    backgroundColor: theme.primary + "10",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.primary + "20",
  },
  bannerContent: {
    flex: 1,
  },
  bannerTag: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  bannerTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    lineHeight: 26,
  },
  bannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerBtnText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  bannerImage: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    flex: 1,
  },
  seeAll: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  categoriesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  categoryItem: {
    alignItems: "center",
    marginHorizontal: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    minWidth: 72,
  },
  categoryItemActive: {
    backgroundColor: theme.primary + "10",
    borderColor: theme.primary,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: "500",
  },
  categoryNameActive: {
    color: theme.primary,
    fontWeight: "700",
  },
  errorText: {
    color: theme.error,
    textAlign: "center",
    marginTop: 40,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptySub: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
});
