import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
} from "react-native";
import { useCartStore } from "../stores/cartStore";
import { useTheme } from "../contexts/ThemeContext";
import { router } from "expo-router";
import { Plus, ShoppingCart, Heart } from "lucide-react-native";
import { useState, useRef } from "react";

export function ProductCard({ item }: { item: any }) {
  const { theme } = useTheme();
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const [liked, setLiked] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAdd = async () => {
    setAdding(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    await addItem(item.id, 1);
    setTimeout(() => setAdding(false), 800);
  };

  const product = item.product || {};
  const price = item.price || 0;
  const stockQty = item.stock_qty || 0;
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/product/${item.id}`)}
      activeOpacity={0.9}
    >
      {/* Image Container */}
      <View style={styles.imageContainer}>
        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <ShoppingCart size={32} color={theme.textMuted} />
          </View>
        )}

        {/* Discount Badge */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-15%</Text>
        </View>

        {/* Like Button */}
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
        >
          <Heart
            size={18}
            color={liked ? theme.error : theme.textMuted}
            fill={liked ? theme.error : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name || "Unknown Product"}
        </Text>
        <Text style={styles.unit}>{product.unit || "piece"}</Text>

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>${price.toFixed(2)}</Text>
            <Text style={styles.originalPrice}>
              ${(price * 1.15).toFixed(2)}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.addBtn, adding && styles.addBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              disabled={adding || stockQty <= 0}
            >
              {adding ? (
                <ShoppingCart size={16} color="#FFFFFF" />
              ) : (
                <Plus size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        {stockQty <= 5 && stockQty > 0 && (
          <Text style={styles.lowStock}>Only {stockQty} left</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (theme: typeof import("../constants/colors").lightTheme) => StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    backgroundColor: theme.surface,
    overflow: "hidden",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 140,
    backgroundColor: theme.surfaceVariant,
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: theme.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  likeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.textPrimary,
    marginBottom: 2,
  },
  unit: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.primary,
  },
  originalPrice: {
    fontSize: 12,
    color: theme.textMuted,
    textDecorationLine: "line-through",
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtnActive: {
    backgroundColor: theme.primaryDark,
  },
  lowStock: {
    fontSize: 11,
    color: theme.warning,
    marginTop: 4,
    fontWeight: "500",
  },
});