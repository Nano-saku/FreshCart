import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useCartStore } from "../stores/cartStore";
import { colors } from "../constants/colors";
import { router } from "expo-router";

export function ProductCard({ item }: { item: any }) {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(customer)/product/${item.id}`)}
      activeOpacity={0.85}
    >
      {item.product?.image_url ? (
        <Image source={{ uri: item.product.image_url }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={{ fontSize: 36 }}>🛒</Text>
        </View>
      )}
      <Text style={styles.name} numberOfLines={1}>
        {item.product?.name}
      </Text>
      <Text style={styles.unit}>{item.product?.unit}</Text>
      <View style={styles.footer}>
        <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => addItem(item.id)}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 20,
    backgroundColor: colors.glassStrong,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  image: {
    width: 56,
    height: 56,
    alignSelf: "center",
    marginBottom: 8,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    alignSelf: "center",
    marginBottom: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textDark,
    textAlign: "center",
    marginBottom: 2,
  },
  unit: {
    fontSize: 11,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: { fontSize: 13, fontWeight: "700", color: colors.primary },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnText: { color: "#fff", fontSize: 18, lineHeight: 22 },
});
