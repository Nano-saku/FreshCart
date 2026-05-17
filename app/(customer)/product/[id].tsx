import { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Image, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { AppScreen } from "../../../src/components/AppScreen";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { useAuthStore } from "../../../src/stores/authStore";
import { useCartStore } from "../../../src/stores/cartStore";
import { supabase } from "../../../src/lib/supabase";
import { useMemo } from 'react';
import {
  ArrowLeft, Plus, Minus, ShoppingCart,
  Star, MapPin, Store,
} from "lucide-react-native";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [product, setProduct] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => { if (id) fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    const [{ data: prod }, { data: revs }] = await Promise.all([
      supabase
        .from("store_products")
        .select("*, product:products(*, category:categories(name)), store:stores(name, address)")
        .eq("id", id)
        .single(),
      supabase
        .from("reviews")
        .select("*, reviewer:profiles(full_name)")
        .eq("store_product_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
    if (prod) setProduct(prod);
    if (revs) setReviews(revs);
    setLoading(false);
  };

  const handleAddToCart = async () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to add items to your cart.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
        ]
      );
      return;
    }
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, quantity);
      Alert.alert("Added to cart", `${product.product?.name} × ${quantity}`);
    } catch {
      Alert.alert("Error", "Failed to add item. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : null;

  if (loading) return (
    <AppScreen>
      <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 60 }} />
    </AppScreen>
  );

  if (!product) return (
    <AppScreen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: theme.textSecondary }}>Product not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );

  const p = product.product || {};
  const outOfStock = product.stock_qty <= 0;

  return (
    <AppScreen noPadding>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image */}
        <View style={styles.imageContainer}>
          {p.image_url
            ? <Image source={{ uri: p.image_url }} style={styles.image} resizeMode="cover" />
            : <View style={[styles.image, styles.imagePlaceholder]}>
              <ShoppingCart size={48} color={theme.textMuted} />
            </View>}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          {/* Category */}
          {p.category?.name && (
            <View style={[styles.chip, { backgroundColor: theme.primary + "15" }]}>
              <Text style={[styles.chipText, { color: theme.primary }]}>{p.category.name}</Text>
            </View>
          )}

          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.unit}>{p.unit}</Text>

          {/* Rating */}
          {avgRating && (
            <View style={styles.ratingRow}>
              <Star size={16} color={theme.warning} fill={theme.warning} />
              <Text style={styles.ratingText}>
                {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
              </Text>
            </View>
          )}

          {/* Price */}
          <Text style={styles.price}>₱{product.price?.toFixed(2)}</Text>

          {/* Stock */}
          {product.stock_qty <= 5 && product.stock_qty > 0 && (
            <Text style={[styles.lowStock, { color: theme.warning }]}>
              Only {product.stock_qty} left in stock
            </Text>
          )}
          {outOfStock && (
            <Text style={[styles.lowStock, { color: theme.error }]}>Out of stock</Text>
          )}

          {/* Store */}
          {product.store && (
            <View style={styles.infoRow}>
              <Store size={15} color={theme.textMuted} />
              <Text style={styles.infoText}>{product.store.name}</Text>
            </View>
          )}
          {product.store?.address && (
            <View style={styles.infoRow}>
              <MapPin size={15} color={theme.textMuted} />
              <Text style={styles.infoText}>{product.store.address}</Text>
            </View>
          )}

          {/* Description */}
          {p.description && (
            <>
              <Text style={styles.sectionTitle}>About this product</Text>
              <Text style={styles.description}>{p.description}</Text>
            </>
          )}

          {/* Quantity */}
          {!outOfStock && (
            <View style={styles.qtyRow}>
              <Text style={styles.sectionTitle}>Quantity</Text>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={[styles.qtyBtn, { borderColor: theme.border }]}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus size={18} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{quantity}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, { borderColor: theme.border }]}
                  onPress={() => setQuantity(Math.min(product.stock_qty, quantity + 1))}
                >
                  <Plus size={18} color={theme.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reviews */}
          <Text style={styles.sectionTitle}>
            Reviews {reviews.length > 0 ? `(${reviews.length})` : ""}
          </Text>
          {reviews.length === 0 ? (
            <View style={[styles.reviewEmpty, { backgroundColor: theme.surfaceVariant }]}>
              <Text style={styles.reviewEmptyText}>No reviews yet. Be the first!</Text>
            </View>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{r.reviewer?.full_name || "Customer"}</Text>
                  <View style={styles.reviewStars}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        color={i < r.rating ? theme.warning : theme.border}
                        fill={i < r.rating ? theme.warning : "transparent"}
                      />
                    ))}
                  </View>
                </View>
                {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add to Cart Button */}
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <View style={styles.footerTotal}>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerPrice}>₱{(product.price * quantity).toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.addBtn,
            { backgroundColor: outOfStock ? theme.border : theme.primary },
          ]}
          onPress={handleAddToCart}
          disabled={outOfStock || adding}
        >
          {adding
            ? <ActivityIndicator color="#fff" size="small" />
            : <>
              <ShoppingCart size={20} color="#fff" />
              <Text style={styles.addBtnText}>
                {outOfStock ? "Out of Stock" : "Add to Cart"}
              </Text>
            </>}
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    imageContainer: { width: "100%", height: 300, backgroundColor: theme.surfaceVariant },
    image: { width: "100%", height: "100%" },
    imagePlaceholder: { alignItems: "center", justifyContent: "center" },
    backBtn: {
      position: "absolute", top: 48, left: 16,
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: theme.surface + "E0",
      alignItems: "center", justifyContent: "center",
    },
    body: { padding: 20, paddingBottom: 120 },
    chip: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, marginBottom: 10 },
    chipText: { fontSize: 12, fontWeight: "600" },
    name: { fontSize: 24, fontWeight: "800", color: theme.textPrimary, marginBottom: 4 },
    unit: { fontSize: 14, color: theme.textMuted, marginBottom: 8 },
    ratingRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
    ratingText: { fontSize: 13, color: theme.textSecondary, fontWeight: "600" },
    price: { fontSize: 28, fontWeight: "800", color: theme.primary, marginBottom: 8 },
    lowStock: { fontSize: 13, fontWeight: "600", marginBottom: 12 },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    infoText: { fontSize: 13, color: theme.textSecondary },
    sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.textPrimary, marginTop: 20, marginBottom: 10 },
    description: { fontSize: 14, color: theme.textSecondary, lineHeight: 22 },
    qtyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    qtyControl: { flexDirection: "row", alignItems: "center", gap: 16 },
    qtyBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
    qtyText: { fontSize: 18, fontWeight: "700", color: theme.textPrimary, minWidth: 28, textAlign: "center" },
    reviewEmpty: { borderRadius: 12, padding: 20, alignItems: "center" },
    reviewEmptyText: { color: theme.textMuted, fontSize: 14 },
    reviewCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
    reviewHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
    reviewerName: { fontSize: 13, fontWeight: "600", color: theme.textPrimary },
    reviewStars: { flexDirection: "row", gap: 2 },
    reviewComment: { fontSize: 13, color: theme.textSecondary, lineHeight: 19 },
    footer: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      flexDirection: "row", alignItems: "center", gap: 16,
      padding: 16, paddingBottom: 32, borderTopWidth: 1,
    },
    footerTotal: { flex: 1 },
    footerLabel: { fontSize: 12, color: theme.textMuted, fontWeight: "500" },
    footerPrice: { fontSize: 20, fontWeight: "800", color: theme.textPrimary },
    addBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
    addBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  });