import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { GreenScreen } from "../../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../../src/lib/supabase";
import { colors } from "../../../src/constants/colors";
import { useCartStore } from "../../../src/stores/cartStore";
import { ChevronLeft, Star } from "lucide-react-native";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    supabase
      .from("store_products")
      .select(
        "*, product:products(*, category:categories(name)), store:stores(name)",
      )
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  const handleAddToCart = async () => {
    await addItem(id, qty);
    Alert.alert("Added!", `${product?.product?.name} added to cart`);
  };

  if (loading)
    return (
      <GreenScreen>
        <ActivityIndicator color="#fff" style={{ flex: 1 }} />
      </GreenScreen>
    );

  return (
    <GreenScreen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
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

        <View style={styles.heroContainer}>
          {product?.product?.image_url ? (
            <Image
              source={{ uri: product.product.image_url }}
              style={styles.heroImg}
            />
          ) : (
            <Text style={{ fontSize: 120 }}>🛒</Text>
          )}
        </View>

        <BlurView intensity={40} tint="light" style={styles.sheet}>
          <View style={styles.sheetInner}>
            <Text style={styles.productName}>{product?.product?.name}</Text>
            <Text style={styles.storeName}>
              {product?.store?.name} • Stock: {product?.stock_qty}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Text style={styles.metaText}>
                  {product?.product?.category?.name}
                </Text>
              </View>
              <View style={styles.metaPill}>
                <Text style={styles.metaText}>{product?.product?.unit}</Text>
              </View>
              <View style={styles.metaPill}>
                <Star size={12} color={colors.accent} fill={colors.accent} />
                <Text style={styles.metaText}> 4.8</Text>
              </View>
            </View>

            <Text style={styles.description}>
              {product?.product?.description ?? "Fresh and locally sourced."}
            </Text>
            <Text style={styles.price}>₱{product?.price?.toFixed(2)}</Text>

            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty(Math.max(1, qty - 1))}
              >
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyNum}>{qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQty(qty + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.qtyTotal}>
                {" "}
                = ₱{(product?.price * qty).toFixed(2)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addCartBtn}
              onPress={handleAddToCart}
            >
              <Text style={styles.addCartText}>Add to cart</Text>
            </TouchableOpacity>
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
  heroContainer: { alignItems: "center", paddingVertical: 24 },
  heroImg: { width: 160, height: 160, borderRadius: 16 },
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
  metaRow: { flexDirection: "row", gap: 8, marginTop: 14 },
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
  qtyBtnText: { color: "#fff", fontSize: 20, lineHeight: 24 },
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
  },
  addCartText: { color: colors.textDark, fontWeight: "700", fontSize: 15 },
});
