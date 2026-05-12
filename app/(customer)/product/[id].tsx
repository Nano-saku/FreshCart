import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen } from "../../../src/components/AppScreen";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { useAuthStore } from "../../../src/stores/authStore";
import { supabase } from "../../../src/lib/supabase";
import { ArrowLeft, Plus, Minus, ShoppingCart, Star, MapPin, Store } from "lucide-react-native";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const styles = createStyles(theme);

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("store_products")
      .select("*, product:products(*, category:categories(name)), store:stores(name, address)")
      .eq("id", id)
      .single();

    if (!error) setProduct(data);
    setLoading(false);
  };

  const handleAddToCart = () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in or create an account to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
          { text: "Sign Up", onPress: () => router.push("/(auth)/register") },
        ]
      );
      return;
    }

    // Add to authenticated cart
    // addToCart(product.id, quantity);
    Alert.alert("Added to cart", `${quantity} × ${product.product.name}`);
  };

  if (loading || !product) {
    return (
      <AppScreen>
        <Text style={{ color: theme.textPrimary }}>Loading...</Text>
      </AppScreen>
    );
  }

  return (
    <AppScreen noPadding>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Product Image */}
        <View style={[styles.imageContainer, { backgroundColor: theme.surfaceVariant }]}>
          {product.product?.image_url ? (
            <Image source={{ uri: product.product.image_url }} style={styles.image} />
          ) : (
            <Text style={{ fontSize: 80 }}>🥬</Text>
          )}
        </View>

        {/* Info */}
        <View style={[styles.infoContainer, { backgroundColor: theme.background }]}>
          <View style={styles.categoryRow}>
            <Text style={[styles.category, { color: theme.primary }]}>
              {product.product?.category?.name || "Fresh"}
            </Text>
            <View style={[styles.stockBadge, { backgroundColor: product.stock_qty > 5 ? theme.primary + "15" : theme.error + "15" }]}>
              <Text style={[styles.stockText, { color: product.stock_qty > 5 ? theme.primary : theme.error }]}>
                {product.stock_qty > 5 ? "In Stock" : `Only ${product.stock_qty} left`}
              </Text>
            </View>
          </View>

          <Text style={[styles.name, { color: theme.textPrimary }]}>{product.product?.name}</Text>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {product.product?.description || "Fresh quality product"}
          </Text>

          {/* Store Info */}
          <View style={[styles.storeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Store size={18} color={theme.primary} />
            <View style={styles.storeInfo}>
              <Text style={[styles.storeName, { color: theme.textPrimary }]}>{product.store?.name}</Text>
              <View style={styles.addressRow}>
                <MapPin size={12} color={theme.textMuted} />
                <Text style={[styles.storeAddress, { color: theme.textMuted }]}>{product.store?.address}</Text>
              </View>
            </View>
          </View>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: theme.primary }]}>
              ${(product.price * quantity).toFixed(2)}
            </Text>
            <Text style={[styles.unitPrice, { color: theme.textMuted }]}>
              ${product.price.toFixed(2)} / {product.product?.unit}
            </Text>
          </View>

          {/* Quantity */}
          <View style={styles.qtySection}>
            <Text style={[styles.qtyLabel, { color: theme.textPrimary }]}>Quantity</Text>
            <View style={[styles.qtyRow, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
              <TouchableOpacity
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                style={[styles.qtyBtn, { backgroundColor: theme.surface }]}
              >
                <Minus size={18} color={theme.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.qtyValue, { color: theme.textPrimary }]}>{quantity}</Text>
              <TouchableOpacity
                onPress={() => setQuantity(quantity + 1)}
                style={[styles.qtyBtn, { backgroundColor: theme.surface }]}
              >
                <Plus size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Add to Cart Button */}
          <TouchableOpacity
            onPress={handleAddToCart}
            style={[styles.addBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
          >
            <ShoppingCart size={20} color="#fff" />
            <Text style={styles.addBtnText}>Add to Cart — ${(product.price * quantity).toFixed(2)}</Text>
          </TouchableOpacity>

          {/* Reviews Preview */}
          <View style={styles.reviewsSection}>
            <Text style={[styles.reviewsTitle, { color: theme.textPrimary }]}>Reviews</Text>
            <View style={styles.reviewCard}>
              <Star size={16} color="#FFD700" fill="#FFD700" />
              <Text style={[styles.reviewText, { color: theme.textSecondary }]}>
                Sign in to see reviews and leave your own
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imageContainer: {
    height: 300,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  infoContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    padding: 24,
    minHeight: 400,
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  category: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 11,
    fontWeight: "600",
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  storeAddress: {
    fontSize: 12,
  },
  priceRow: {
    marginBottom: 20,
  },
  price: {
    fontSize: 32,
    fontWeight: "800",
  },
  unitPrice: {
    fontSize: 14,
    marginTop: 4,
  },
  qtySection: {
    marginBottom: 20,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    alignSelf: "flex-start",
    borderRadius: 14,
    padding: 6,
    borderWidth: 1,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 30,
    textAlign: "center",
  },
  addBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  reviewsSection: {
    marginTop: 8,
  },
  reviewsTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  reviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
  },
  reviewText: {
    fontSize: 13,
  },
});