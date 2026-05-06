import { View, Text, TouchableOpacity, Image, StyleSheet, Animated } from "react-native";
import { useCartStore } from "../stores/cartStore";
import { colors } from "../constants/colors";
import { router } from "expo-router";
import { Plus, Minus, ShoppingCart } from "lucide-react-native";
import { useState, useRef } from "react";

export function ProductCard({ item }: { item: any }) {
  const addItem = useCartStore((s) => s.addItem);
  const [adding, setAdding] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleAdd = async () => {
    setAdding(true);

    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    await addItem(item.id, 1);

    setTimeout(() => setAdding(false), 600);
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/product/${item.id}`)}
      activeOpacity={0.85}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {item.product?.image_url ? (
          <Image source={{ uri: item.product.image_url }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 36 }}>🛒</Text>
          </View>
        )}

        {/* Category Badge */}
        {item.product?.category?.name && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.product.category.name}</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.product?.name || "Unknown Product"}
        </Text>
        <Text style={styles.unit}>{item.product?.unit || "piece"}</Text>

        {/* Store name if available */}
        {item.store?.name && (
          <Text style={styles.storeName} numberOfLines={1}>
            {item.store.name}
          </Text>
        )}

        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>
            {item.stock_qty <= 5 && item.stock_qty > 0 && (
              <Text style={styles.lowStock}>Only {item.stock_qty} left</Text>
            )}
          </View>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.addBtn, adding && styles.addBtnActive]}
              onPress={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              disabled={adding}
            >
              {adding ? (
                <ShoppingCart size={16} color="#fff" />
              ) : (
                <Plus size={18} color="#fff" />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 20,
    backgroundColor: colors.glass,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  imageContainer: {
    position: "relative",
    width: "100%",
    height: 120,
    backgroundColor: "rgba(255,255,255,0.05)",
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
  categoryBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  content: {
    padding: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  unit: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  storeName: {
    fontSize: 11,
    color: colors.accent,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
  },
  price: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.accent,
  },
  lowStock: {
    fontSize: 10,
    color: "#ffa726",
    marginTop: 2,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addBtnActive: {
    backgroundColor: "#4caf50",
  },
});