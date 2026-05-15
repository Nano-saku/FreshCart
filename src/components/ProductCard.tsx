import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Animated,
} from "react-native";
import { useCartStore } from "../stores/cartStore";
import { useTheme } from "../contexts/ThemeContext";
import { router } from "expo-router";
import { Plus, ShoppingCart } from "lucide-react-native";
import { useState, useRef } from "react";

const CURRENCY = "₱";

export function ProductCard({ item }: { item: any }) {
  const { theme } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = createStyles(theme);

  const handleAdd = async () => {
    setAdding(true);
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    try {
      await addItem(item.id, 1);
    } catch (err) {
      console.error("Add to cart error:", err);
    } finally {
      setTimeout(() => setAdding(false), 800);
    }
  };

  const product = item.product || {};
  const price = item.price ?? 0;
  const stockQty = item.stock_qty ?? 0;
  const outOfStock = stockQty <= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/product/${item.id}`)}
      activeOpacity={0.9}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {product.image_url
          ? <Image source={{ uri: product.image_url }} style={styles.image} />
          : <View style={styles.imagePlaceholder}>
            <ShoppingCart size={32} color={theme.textMuted} />
          </View>}

        {/* Out of stock overlay */}
        {outOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}

        {/* Low stock badge — only when real */}
        {stockQty <= 5 && stockQty > 0 && (
          <View style={[styles.stockBadge, { backgroundColor: theme.warning }]}>
            <Text style={styles.stockBadgeText}>Only {stockQty} left</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.textPrimary }]} numberOfLines={1}>
          {product.name || "Unknown Product"}
        </Text>
        <Text style={[styles.unit, { color: theme.textMuted }]}>{product.unit || "piece"}</Text>

        <View style={styles.footer}>
          <Text style={[styles.price, { color: theme.primary }]}>
            {CURRENCY}{price.toFixed(2)}
          </Text>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[
                styles.addBtn,
                { backgroundColor: outOfStock ? theme.border : theme.primary },
                adding && { backgroundColor: theme.primaryDark },
              ]}
              onPress={(e) => { e.stopPropagation(); handleAdd(); }}
              disabled={adding || outOfStock}
            >
              {adding
                ? <ShoppingCart size={16} color="#fff" />
                : <Plus size={18} color="#fff" />}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: typeof import("../constants/colors").lightTheme) => StyleSheet.create({
  card: { flex: 1, margin: 6, borderRadius: 16, backgroundColor: theme.surface, overflow: "hidden", shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8, elevation: 3 },
  imageContainer: { position: "relative", width: "100%", height: 140, backgroundColor: theme.surfaceVariant },
  image: { width: "100%", height: "100%", resizeMode: "cover" },
  imagePlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center" },
  outOfStockOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" },
  outOfStockText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  stockBadge: { position: "absolute", bottom: 6, left: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stockBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  content: { padding: 12 },
  name: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  unit: { fontSize: 12, marginBottom: 8 },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 16, fontWeight: "700" },
  addBtn: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});