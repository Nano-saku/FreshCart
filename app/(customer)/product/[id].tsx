import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { GreenScreen } from "../../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../../src/lib/supabase";
import { colors } from "../../../src/constants/colors";
import { useCartStore } from "../../../src/stores/cartStore";
import { ChevronLeft, Star, ShoppingCart, Check } from "lucide-react-native";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const scaleAnim = useRef(new Animated.Value(1)).current;

 useEffect(() => {
    supabase
      .from("store_products")
      .select(`*, product:products(*, category:categories(name)), store:stores(name, address)`)
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.error("Product fetch error:", error);
        }
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;

    setAdding(true);

    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    await addItem(id, qty);

    setTimeout(() => {
      setAdding(false);
      setQty(1);
    }, 800);
  };

  if (loading) {
    return (
      <GreenScreen>
        <ActivityIndicator color="#fff" style={{ flex: 1 }} />
      </GreenScreen>
    );
  }

  if (!product) {
    return (
      <GreenScreen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Product not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </GreenScreen>
    );
  }

  const isOutOfStock = product.stock_qty <= 0;
  const isLowStock = product.stock_qty <= 5 && product.stock_qty > 0;

  return (
    <GreenScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Product details</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {product?.product?.image_url ? (
            <Image
              source={{ uri: product.product.image_url }}
              style={styles.heroImg}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Text style={{ fontSize: 80 }}>🛒</Text>
            </View>
          )}

          {/* Stock Badge */}
          {isOutOfStock ? (
            <View style={[styles.stockBadge, { backgroundColor: "#ef5350" }]}>
              <Text style={styles.stockText}>Out of Stock</Text>
            </View>
          ) : isLowStock ? (
            <View style={[styles.stockBadge, { backgroundColor: "#ffa726" }]}>
              <Text style={styles.stockText}>Only {product.stock_qty} left</Text>
            </View>
          ) : null}
        </View>

        {/* Product Info Sheet */}
        <BlurView intensity={40} tint="light" style={styles.sheet}>
          <View style={styles.sheetInner}>
            <Text style={styles.productName}>{product?.product?.name}</Text>
            <Text style={styles.storeName}>
              {product?.store?.name} • Stock: {product?.stock_qty}
            </Text>

            {/* Meta Pills */}
            <View style={styles.metaRow}>
              {product?.product?.category?.name && (
                <View style={styles.metaPill}>
                  <Text style={styles.metaText}>
                    {product.product.category.name}
                  </Text>
                </View>
              )}
              <View style={styles.metaPill}>
                <Text style={styles.metaText}>{product?.product?.unit}</Text>
              </View>
              <View style={[styles.metaPill, styles.ratingPill]}>
                <Star size={12} color="#FFD700" fill="#FFD700" />
                <Text style={[styles.metaText, { color: "#FFD700" }]}> 4.8</Text>
              </View>
            </View>

            <Text style={styles.description}>
              {product?.product?.description || "Fresh and locally sourced. Quality guaranteed."}
            </Text>

            <Text style={styles.price}>₱{product?.price?.toFixed(2)}</Text>

            {/* Quantity Selector */}
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnDisabled]}
                onPress={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
              >
                <Text style={[styles.qtyBtnText, qty <= 1 && styles.qtyBtnTextDisabled]}>
                  −
                </Text>
              </TouchableOpacity>

              <Text style={styles.qtyNum}>{qty}</Text>

              <TouchableOpacity
                style={[styles.qtyBtn, qty >= product?.stock_qty && styles.qtyBtnDisabled]}
                onPress={() => setQty(Math.min(product?.stock_qty || 99, qty + 1))}
                disabled={qty >= (product?.stock_qty || 99)}
              >
                <Text style={[styles.qtyBtnText, qty >= product?.stock_qty && styles.qtyBtnTextDisabled]}>
                  +
                </Text>
              </TouchableOpacity>

              <Text style={styles.qtyTotal}>
                = ₱{(product?.price * qty).toFixed(2)}
              </Text>
            </View>

            {/* Add to Cart Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                style={[
                  styles.addCartBtn,
                  (isOutOfStock || adding) && styles.addCartBtnDisabled,
                ]}
                onPress={handleAddToCart}
                disabled={isOutOfStock || adding}
              >
                {adding ? (
                  <>
                    <Check size={20} color={colors.textDark} />
                    <Text style={styles.addCartText}>Added!</Text>
                  </>
                ) : isOutOfStock ? (
                  <>
                    <ShoppingCart size={20} color={colors.textMuted} />
                    <Text style={[styles.addCartText, { color: colors.textMuted }]}>
                      Out of Stock
                    </Text>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={20} color={colors.textDark} />
                    <Text style={styles.addCartText}>Add to cart</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </BlurView>
      </ScrollView>
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  topTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  heroContainer: {
    alignItems: "center",
    paddingVertical: 24,
    position: "relative",
  },
  heroImg: {
    width: 200,
    height: 200,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  heroPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stockBadge: {
    position: "absolute",
    bottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stockText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  sheet: {
    marginHorizontal: 16,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  sheetInner: { backgroundColor: colors.glass, padding: 22 },
  productName: { color: "#fff", fontSize: 24, fontWeight: "700" },
  storeName: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  ratingPill: {
    backgroundColor: "rgba(255,215,0,0.15)",
    borderColor: "rgba(255,215,0,0.3)",
  },
  metaText: { color: "#fff", fontSize: 12 },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginVertical: 12,
  },
  price: {
    color: colors.accent,
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 16,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyBtnText: { color: "#fff", fontSize: 20, lineHeight: 24 },
  qtyBtnTextDisabled: {
    color: colors.textMuted,
  },
  qtyNum: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    minWidth: 28,
    textAlign: "center",
  },
  qtyTotal: { color: colors.textMuted, fontSize: 14 },
  addCartBtn: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  addCartBtnDisabled: {
    opacity: 0.6,
  },
  addCartText: { color: colors.textDark, fontWeight: "700", fontSize: 15 },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
  },
  backBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});