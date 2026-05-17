import { useState, useCallback, useMemo, useEffect } from "react";
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
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { AppScreen } from "../../src/components/AppScreen";
import { ProductCard } from "../../src/components/ProductCard";
import { StoreSelector } from "../../src/components/StoreSelector";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/contexts/ThemeContext";
import { router } from "expo-router";
import { Search, Bell, ShoppingBag, ChevronRight } from "lucide-react-native";

const { width } = Dimensions.get("window");

// Default categories (will be used as fallback)
const DEFAULT_CATEGORIES = [
  { id: "1", name: "Vegetables", icon: "🥬", color: "#4CAF50" },
  { id: "2", name: "Fruits", icon: "🍎", color: "#FF9800" },
  { id: "3", name: "Meats", icon: "🥩", color: "#F44336" },
  { id: "4", name: "Fish", icon: "🐟", color: "#2196F3" },
  { id: "5", name: "Eggs", icon: "🥚", color: "#FFC107" },
  { id: "6", name: "Breads", icon: "🍞", color: "#795548" },
  { id: "7", name: "Nuts", icon: "🥜", color: "#8D6E63" },
  { id: "8", name: "Honey", icon: "🍯", color: "#FFB300" },
  { id: "9", name: "Wheat", icon: "🌾", color: "#A1887F" },
  { id: "10", name: "Cheese", icon: "🧀", color: "#FFC107" },
  { id: "11", name: "Milk", icon: "🥛", color: "#90CAF9" },
  { id: "12", name: "Pasta", icon: "🍝", color: "#FFCC80" },
];

export default function HomeScreen() {
  const { theme } = useTheme();
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories from database
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, icon")
      .order("name");

    if (!error && data && data.length > 0) {
      // Map database categories with colors
      const mappedCategories = data.map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || "📦",
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color, or use a color map
      }));
      setCategories(mappedCategories);
    }
    setLoadingCategories(false);
  };

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
        .select(`
        *,
        store:stores(name, logo_url),
        product:products!inner (
          *,
          category:categories(id, name, icon)
        )
      `)
        .eq("is_available", true)
        .gt("stock_qty", 0);

      if (selectedStore) {
        query = query.eq("store_id", selectedStore);
      }

      if (selectedCategory) {
        // The key is using the !inner join and filtering on the nested table
        query = query.eq("product.category_id", selectedCategory);
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
    await fetchCategories();
    setRefreshing(false);
  }, [refetch]);

  const renderCategoryItem = ({ item }: { item: typeof categories[0] }) => {
    const isSelected = selectedCategory === item.id;
    return (
      <TouchableOpacity
        style={[
          styles.categoryItem,
          isSelected && styles.categoryItemActive,
        ]}
        onPress={() =>
          setSelectedCategory(isSelected ? null : item.id)
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
            isSelected && styles.categoryNameActive,
          ]}
        >
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderProduct = useCallback(
    ({ item }: { item: any }) => <ProductCard item={item} />,
    []
  );

  const styles = useMemo(() => createStyles(theme), [theme]);

  // See All handlers
  const handleSeeAllCategories = () => {
    router.push("/(customer)/categories");
  };

  const handleSeeAllProducts = () => {
    router.push({
      pathname: "/(customer)/product",
      params: selectedStore ? { storeId: selectedStore } : {},
    });
  };

  // Define all sections for the main FlatList
  const sections = [
    { type: "header", data: null },
    { type: "banner", data: null },
    { type: "categories", data: categories },
    { type: "storeSelector", data: null },
    { type: "productsHeader", data: null },
    { type: "products", data: products },
  ];

  const renderSection = ({ item }: { item: { type: string; data: any } }) => {
    switch (item.type) {
      case "header":
        return (
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
              <Text style={styles.searchPlaceholder}>
                Search fresh products...
              </Text>
            </TouchableOpacity>
          </View>
        );

      case "banner":
        return (
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
        );

      case "categories":
        return (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              {selectedCategory ? (
                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleSeeAllCategories}>
                  <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {loadingCategories ? (
              <ActivityIndicator color={theme.primary} style={{ marginVertical: 20 }} />
            ) : (
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesList}
              />
            )}
          </>
        );

      case "storeSelector":
        return (
          <StoreSelector
            onSelect={setSelectedStore}
            selectedStore={selectedStore}
          />
        );

      case "productsHeader":
        return (
          <View style={styles.sectionHeader}>
            <ShoppingBag size={18} color={theme.primary} />
            <Text style={styles.sectionTitle}>
              {selectedCategory
                ? `Products in ${categories.find(c => c.id === selectedCategory)?.name || "Category"}`
                : selectedStore
                  ? "Store Products"
                  : "Featured Products"}
            </Text>
            <TouchableOpacity onPress={handleSeeAllProducts}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
        );

      case "products":
        if (isLoading) {
          return (
            <ActivityIndicator
              color={theme.primary}
              style={{ marginTop: 40 }}
            />
          );
        }
        if (error) {
          return (
            <Text style={styles.errorText}>Failed to load products</Text>
          );
        }
        if (!products || products.length === 0) {
          return (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🛒</Text>
              <Text style={styles.emptyText}>
                {selectedCategory
                  ? "No products in this category yet"
                  : selectedStore
                    ? "No products available in this store"
                    : "No products available"}
              </Text>
              <Text style={styles.emptySub}>
                Check back later for fresh items
              </Text>
            </View>
          );
        }
        return (
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={renderProduct}
            scrollEnabled={false}
            contentContainerStyle={{ padding: 8, paddingBottom: 20 }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <AppScreen noPadding>
      <FlatList
        data={sections}
        renderItem={renderSection}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      />
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
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  clearText: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  emptySub: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
});