import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  RefreshControl,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { Plus, Pencil, Trash2, PackageSearch, ChevronDown, Camera, X } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { router, useFocusEffect } from "expo-router";
import { useImageUpload } from "../../src/hooks/useImageUpload";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Default categories with icons - these will be created in DB if they don't exist
const DEFAULT_CATEGORIES = [
  { name: "Vegetables", icon: "🥬" },
  { name: "Fruits", icon: "🍎" },
  { name: "Meats", icon: "🥩" },
  { name: "Fish", icon: "🐟" },
  { name: "Eggs", icon: "🥚" },
  { name: "Breads", icon: "🍞" },
  { name: "Nuts", icon: "🥜" },
  { name: "Honey", icon: "🍯" },
  { name: "Wheat", icon: "🌾" },
  { name: "Cheese", icon: "🧀" },
  { name: "Milk", icon: "🥛" },
  { name: "Pasta", icon: "🍝" },
  { name: "Organic", icon: "🌿" },
  { name: "Spices", icon: "🌶️" },
  { name: "Beverages", icon: "🥤" },
  { name: "Snacks", icon: "🍿" },
];

// Function to get icon based on category name (for auto-icon mapping)
const getIconForCategory = (categoryName: string): string => {
  const iconMap: Record<string, string> = {
    "vegetables": "🥬",
    "fruits": "🍎",
    "meats": "🥩",
    "fish": "🐟",
    "eggs": "🥚",
    "breads": "🍞",
    "nuts": "🥜",
    "honey": "🍯",
    "wheat": "🌾",
    "cheese": "🧀",
    "milk": "🥛",
    "pasta": "🍝",
    "organic": "🌿",
    "spices": "🌶️",
    "beverages": "🥤",
    "snacks": "🍿",
    "rice": "🍚",
    "oil": "🫒",
    "sauce": "🥫",
    "baking": "🎂",
    "frozen": "❄️",
    "dairy": "🥛",
    "seafood": "🦐",
    "herbs": "🌿",
  };

  const key = categoryName.toLowerCase().trim();
  return iconMap[key] || "📦";
};

const UNITS = [
  { id: "piece", name: "Piece", icon: "📦" },
  { id: "kg", name: "Kilogram (kg)", icon: "⚖️" },
  { id: "g", name: "Gram (g)", icon: "⚖️" },
  { id: "liter", name: "Liter (L)", icon: "🥤" },
  { id: "ml", name: "Milliliter (ml)", icon: "🥤" },
  { id: "dozen", name: "Dozen", icon: "🥚" },
  { id: "bundle", name: "Bundle", icon: "🌿" },
  { id: "pack", name: "Pack", icon: "📦" },
];

export default function SellerProducts() {
  const { profile } = useAuthStore();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { uploadImage, uploading } = useImageUpload("products");

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [unitModalVisible, setUnitModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    id: "",
    product_name: "",
    category_id: "",
    price: "",
    stock_qty: "",
    unit: "piece",
    is_available: true,
    image_url: "",
  });

  // New category form
  const [newCategory, setNewCategory] = useState({ name: "" });

  // Get store ID - fetch fresh every time
  const { data: store, isLoading: storeLoading, refetch: refetchStore } = useQuery({
    queryKey: ["seller-store", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", profile?.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching store:", error);
        return null;
      }
      return data;
    },
    enabled: !!profile?.id,
    staleTime: 0, // Always fetch fresh
  });

  // Fetch categories with caching
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      return (data || []).map(cat => ({
        ...cat,
        icon: cat.icon || getIconForCategory(cat.name)
      }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch store products with proper joins - OPTIMIZED
  const {
    data: storeProducts = [],
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ["store-products", store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      // Step 1: Get store products
      const { data: storeItems, error: storeError } = await supabase
        .from("store_products")
        .select("*")
        .eq("store_id", store.id)
        .order("created_at", { ascending: false });

      if (storeError) throw storeError;
      if (!storeItems || storeItems.length === 0) return [];

      // Step 2: Get products with their categories
      const productIds = storeItems.map(item => item.product_id);

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select(`
        id,
        name,
        description,
        image_url,
        unit,
        category_id,
        categories (
          id,
          name,
          icon
        )
      `)
        .in("id", productIds);

      if (productsError) throw productsError;

      // Step 3: Combine the data
      const combined = storeItems.map(storeItem => {
        const product = products?.find(p => p.id === storeItem.product_id);

        // Get category (it might be an array or single object)
        let category = null;
        if (product?.categories) {
          // If categories is an array, take first item
          if (Array.isArray(product.categories) && product.categories.length > 0) {
            category = product.categories[0];
          }
          // If it's a single object
          else if (!Array.isArray(product.categories)) {
            category = product.categories;
          }
        }

        return {
          id: storeItem.id,
          store_id: storeItem.store_id,
          product_id: storeItem.product_id,
          price: storeItem.price,
          stock_qty: storeItem.stock_qty,
          is_available: storeItem.is_available,
          created_at: storeItem.created_at,
          product: {
            id: product?.id,
            name: product?.name || "Unknown",
            description: product?.description,
            image_url: product?.image_url,
            unit: product?.unit || "piece",
            category_id: product?.category_id,
            category: category
          }
        };
      });

      return combined;
    },
    enabled: !!store?.id,
    staleTime: 30 * 1000,
  });

  // Seed categories only once when the table is empty
  const seedCategoriesIfEmpty = useCallback(async () => {
    // Check if we've already seeded in this session
    const hasSeeded = await AsyncStorage.getItem('categories_seeded');
    if (hasSeeded === 'true') return;

    // Check if any categories exist in the database
    const { count, error } = await supabase
      .from("categories")
      .select("*", { count: 'exact', head: true });

    if (error) {
      console.error("Error checking categories count:", error);
      return;
    }

    // Only seed if no categories exist
    if (count === 0) {
      console.log("Seeding default categories...");
      for (const cat of DEFAULT_CATEGORIES) {
        const { error: insertError } = await supabase
          .from("categories")
          .insert({ name: cat.name, icon: cat.icon });

        if (insertError) {
          console.error("Error inserting category:", insertError);
        }
      }
      // Mark as seeded for this session
      await AsyncStorage.setItem('categories_seeded', 'true');
      // Invalidate categories cache to refresh
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    }
  }, [queryClient]);

  // Call this once when the component mounts
  useEffect(() => {
    seedCategoriesIfEmpty();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        // Refetch store first
        refetchStore().then(({ data: freshStore }) => {
          if (freshStore?.id) {
            // If store exists, refetch products
            refetchProducts();
          }
        });
      }
    }, [profile?.id, refetchStore, refetchProducts])
  );

  const handleImagePick = async () => {
    Alert.alert("Product Image", "Choose image source", [
      { text: "Camera", onPress: () => processImagePick("camera") },
      { text: "Gallery", onPress: () => processImagePick("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const processImagePick = async (source: "camera" | "gallery") => {
    const url = await uploadImage(source, "products");
    if (url) {
      setForm((prev) => ({ ...prev, image_url: url }));
    }
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
  };

  const openAddModal = () => {
    setEditMode(false);
    setForm({
      id: "",
      product_name: "",
      category_id: "",
      price: "",
      stock_qty: "",
      unit: "piece",
      is_available: true,
      image_url: "",
    });
    setModalVisible(true);
  };

  const openEditModal = (item: any) => {
    setEditMode(true);
    setForm({
      id: item.id,
      product_name: item.product?.name || "",
      category_id: item.product?.category_id || "",
      price: item.price?.toString() || "",
      stock_qty: item.stock_qty?.toString() || "0",
      unit: item.product?.unit || "piece",
      is_available: item.is_available ?? true,
      image_url: item.product?.image_url || "",
    });
    setModalVisible(true);
  };

  const addNewCategory = async () => {
    if (!newCategory.name.trim()) {
      Alert.alert("Error", "Category name is required");
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .ilike("name", newCategory.name.trim())
        .maybeSingle();

      if (existing) {
        Alert.alert("Info", "Category already exists");
        setForm({ ...form, category_id: existing.id });
      } else {
        const icon = getIconForCategory(newCategory.name);

        const { data, error } = await supabase
          .from("categories")
          .insert({ name: newCategory.name.trim(), icon })
          .select()
          .single();

        if (error) throw error;

        Alert.alert("Success", "Category created");
        setForm({ ...form, category_id: data.id });
        // Invalidate categories cache
        queryClient.invalidateQueries({ queryKey: ["categories"] });
      }

      setCategoryModalVisible(false);
      setNewCategory({ name: "" });
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const saveProduct = async () => {
    if (!store?.id) {
      Alert.alert("Error", "You need to create a store first before adding products");
      return;
    }

    if (!form.product_name.trim()) {
      return Alert.alert("Error", "Please enter a product name");
    }

    if (!form.category_id) {
      return Alert.alert("Error", "Please select a category");
    }

    if (!form.price || isNaN(Number(form.price))) {
      return Alert.alert("Error", "Enter a valid price");
    }

    if (!form.stock_qty || isNaN(Number(form.stock_qty))) {
      return Alert.alert("Error", "Enter valid stock");
    }

    setSaving(true);

    try {
      if (editMode) {
        const existingProduct = storeProducts.find(sp => sp.id === form.id);
        const productId = existingProduct?.product_id;

        if (!productId) throw new Error("Product not found");

        // Update product details
        const { error: productError } = await supabase
          .from("products")
          .update({
            name: form.product_name.trim(),
            category_id: form.category_id,
            unit: form.unit,
            image_url: form.image_url || null,
          })
          .eq("id", productId);

        if (productError) throw productError;

        // Update store_product details
        const { error: storeProductError } = await supabase
          .from("store_products")
          .update({
            price: parseFloat(form.price),
            stock_qty: parseInt(form.stock_qty, 10),
            is_available: form.is_available,
          })
          .eq("id", form.id);

        if (storeProductError) throw storeProductError;

        Alert.alert("Success", "Product updated");
      } else {
        // Create new product
        const { data: newProduct, error: productError } = await supabase
          .from("products")
          .insert({
            name: form.product_name.trim(),
            category_id: form.category_id,
            unit: form.unit,
            image_url: form.image_url || null,
          })
          .select()
          .single();

        if (productError) throw productError;

        // Link product to store
        const { error: storeProductError } = await supabase
          .from("store_products")
          .insert({
            store_id: store.id,
            product_id: newProduct.id,
            price: parseFloat(form.price),
            stock_qty: parseInt(form.stock_qty, 10),
            is_available: form.is_available,
          });

        if (storeProductError) throw storeProductError;

        Alert.alert("Success", "Product added to store");
      }

      setModalVisible(false);
      // Invalidate and refetch products
      queryClient.invalidateQueries({ queryKey: ["store-products", store.id] });
    } catch (err: any) {
      console.error("Save product error:", err);
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (id: string) => {
    Alert.alert(
      "Remove Product",
      "Are you sure you want to remove this product from your store?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await supabase.from("store_products").delete().eq("id", id);
            queryClient.invalidateQueries({ queryKey: ["store-products", store?.id] });
          },
        },
      ],
    );
  };

  const getUnitName = (unitId: string) => {
    return UNITS.find(u => u.id === unitId)?.name || unitId;
  };

  const getUnitIcon = (unitId: string) => {
    return UNITS.find(u => u.id === unitId)?.icon || "📦";
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || getIconForCategory(category?.name || "");
  };

  const isLoading = storeLoading || (categoriesLoading && categories.length === 0);
  const isRefreshing = productsLoading && storeProducts.length > 0;

  if (isLoading && !storeProducts.length) {
    return (
      <AppScreen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading your products...</Text>
        </View>
      </AppScreen>
    );
  }

  if (!store && !storeLoading) {
    return (
      <AppScreen>
        <View style={styles.noStoreContainer}>
          <PackageSearch size={50} color={theme.accent} />
          <Text style={styles.noStoreTitle}>No Store Setup</Text>
          <Text style={styles.noStoreText}>
            Please setup your store profile first before managing products.
          </Text>
          <TouchableOpacity
            style={styles.createStoreBtn}
            onPress={() => router.push("/(seller)/store-settings")}
          >
            <Text style={styles.createStoreBtnText}>Create Store</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Plus size={20} color={theme.surface} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={storeProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              refetchStore();
              refetchProducts();
            }}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          productsLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator color={theme.primary} />
              <Text style={styles.emptySub}>Loading products...</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>
              No products in your store. Tap + to add items to sell.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            {item.product?.image_url ? (
              <Image source={{ uri: item.product.image_url }} style={styles.productImage} />
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Text style={styles.productImagePlaceholderText}>📦</Text>
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.product?.name}</Text>
              <View style={styles.productMetaRow}>
                <Text style={styles.categoryIcon}>{getCategoryIcon(item.product?.category_id)}</Text>
                <Text style={styles.productMeta}>
                  {item.product?.category?.name || "Uncategorized"} • {getUnitIcon(item.product?.unit)} {item.product?.unit}
                </Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>
                <Text style={styles.stock}>Stock: {item.stock_qty}</Text>
              </View>
              {!item.is_available && (
                <Text style={styles.unavailableBadge}>Unavailable</Text>
              )}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => openEditModal(item)}
              >
                <Pencil size={18} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => deleteProduct(item.id)}
              >
                <Trash2 size={18} color="#ef5350" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Product Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalInner} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>
                {editMode ? "Edit Product" : "Add New Product"}
              </Text>

              {/* Image Picker */}
              <Text style={styles.label}>Product Image</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={handleImagePick} disabled={uploading}>
                {form.image_url ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: form.image_url }} style={styles.imagePreview} />
                    <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                      <X size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePlaceholder}>
                    {uploading ? (
                      <ActivityIndicator color={theme.primary} />
                    ) : (
                      <>
                        <Camera size={32} color={theme.textMuted} />
                        <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* Product Name */}
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                value={form.product_name}
                onChangeText={(v) => setForm({ ...form, product_name: v })}
                placeholder="Enter product name"
                placeholderTextColor={theme.textMuted}
              />

              {/* Category Selection */}
              <Text style={styles.label}>Category *</Text>
              <View style={styles.categoryRow}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryChip,
                        form.category_id === cat.id && styles.categoryChipActive,
                      ]}
                      onPress={() => setForm({ ...form, category_id: cat.id })}
                    >
                      <Text style={styles.categoryIconText}>{cat.icon || "📦"}</Text>
                      <Text style={styles.categoryChipText}>{cat.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={styles.addCategoryBtn}
                  onPress={() => setCategoryModalVisible(true)}
                >
                  <Plus size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>

              {/* Selected Category Display */}
              {form.category_id && (
                <View style={styles.selectedCategory}>
                  <Text style={styles.selectedCategoryIcon}>
                    {getCategoryIcon(form.category_id)}
                  </Text>
                  <Text style={styles.selectedCategoryText}>
                    {categories.find(c => c.id === form.category_id)?.name || "Selected"}
                  </Text>
                </View>
              )}

              {/* Unit Dropdown */}
              <Text style={styles.label}>Unit *</Text>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setUnitModalVisible(true)}
              >
                <View style={styles.dropdownButtonLeft}>
                  <Text style={styles.dropdownButtonIcon}>{getUnitIcon(form.unit)}</Text>
                  <Text style={styles.dropdownButtonText}>
                    {getUnitName(form.unit)}
                  </Text>
                </View>
                <ChevronDown size={20} color={theme.textMuted} />
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₱) *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.price}
                    onChangeText={(v) => setForm({ ...form, price: v })}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock Qty *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.stock_qty}
                    onChangeText={(v) => setForm({ ...form, stock_qty: v })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.availabilityToggle}
                onPress={() =>
                  setForm({ ...form, is_available: !form.is_available })
                }
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: form.is_available
                        ? theme.accent
                        : theme.textMuted,
                    },
                  ]}
                />
                <Text style={styles.availabilityText}>
                  {form.is_available
                    ? "Product is Available"
                    : "Product is Hidden"}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveProduct}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.surface} />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Unit Selection Modal */}
      <Modal visible={unitModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalCard}>
            <Text style={styles.modalTitle}>Select Unit</Text>
            <ScrollView style={styles.pickerList}>
              {UNITS.map((unit) => (
                <TouchableOpacity
                  key={unit.id}
                  style={[
                    styles.pickerItem,
                    form.unit === unit.id && styles.pickerItemActive,
                  ]}
                  onPress={() => {
                    setForm({ ...form, unit: unit.id });
                    setUnitModalVisible(false);
                  }}
                >
                  <Text style={styles.pickerItemIcon}>{unit.icon}</Text>
                  <Text style={[
                    styles.pickerItemText,
                    form.unit === unit.id && styles.pickerItemTextActive,
                  ]}>
                    {unit.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.pickerCloseBtn}
              onPress={() => setUnitModalVisible(false)}
            >
              <Text style={styles.pickerCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalCard}>
            <Text style={styles.modalTitle}>Add New Category</Text>

            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              value={newCategory.name}
              onChangeText={(v) => setNewCategory({ ...newCategory, name: v })}
              placeholder="e.g., Organic, Spices, Bakery"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={styles.noteText}>
              Icon will be automatically assigned based on category name
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={addNewCategory}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={theme.surface} />
                ) : (
                  <Text style={styles.saveText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 8,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  card: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.surface,
    gap: 12,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  productImagePlaceholderText: {
    fontSize: 30,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  productMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 14,
  },
  productMeta: {
    color: theme.textMuted,
    fontSize: 13,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  price: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: "700",
  },
  stock: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  unavailableBadge: {
    color: "#ef5350",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },
  actions: {
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  emptySub: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    color: theme.textMuted,
    fontSize: 14,
    marginTop: 16,
  },
  noStoreContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noStoreTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  noStoreText: {
    color: theme.textMuted,
    textAlign: "center",
  },
  createStoreBtn: {
    marginTop: 24,
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  createStoreBtnText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.border,
    maxHeight: "80%",
    backgroundColor: theme.surface,
  },
  modalInner: {
    padding: 24,
  },
  modalTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.surfaceVariant,
    borderRadius: 14,
    padding: 16,
    color: theme.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  imagePicker: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    position: "relative",
    alignSelf: "flex-start",
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 16,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  imagePlaceholderText: {
    color: theme.textMuted,
    fontSize: 12,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.surfaceVariant,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  dropdownButtonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dropdownButtonIcon: {
    fontSize: 18,
  },
  dropdownButtonText: {
    color: theme.textPrimary,
    fontSize: 15,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryScroll: {
    flex: 1,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    marginRight: 8,
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.accent,
  },
  categoryIconText: {
    fontSize: 14,
  },
  categoryChipText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  addCategoryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedCategory: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.primary + "15",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  selectedCategoryIcon: {
    fontSize: 18,
  },
  selectedCategoryText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  availabilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  availabilityText: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  cancelText: {
    color: theme.textMuted,
    fontWeight: "600",
    fontSize: 16,
  },
  saveBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
  },
  saveText: {
    color: theme.surface,
    fontWeight: "700",
    fontSize: 16,
  },
  categoryModalCard: {
    margin: 20,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  noteText: {
    color: theme.textMuted,
    fontSize: 12,
    marginBottom: 16,
    textAlign: "center",
  },
  pickerModalCard: {
    margin: 20,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    maxHeight: "70%",
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  pickerItemActive: {
    backgroundColor: theme.primary + "20",
  },
  pickerItemIcon: {
    fontSize: 20,
  },
  pickerItemText: {
    color: theme.textPrimary,
    fontSize: 16,
    flex: 1,
  },
  pickerItemTextActive: {
    color: theme.primary,
    fontWeight: "600",
  },
  pickerCloseBtn: {
    marginTop: 16,
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
  },
  pickerCloseText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});