import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { BlurView } from "expo-blur";
import { colors } from "../constants/colors";
import { Minus, Plus, Trash2 } from "lucide-react-native";

interface CartItemProps {
  item: {
    id: string;
    product: {
      name: string;
      unit: string;
      image_url?: string | null;
    };
    store_name: string;
    price: number;
    quantity: number;
  };
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
}

export function CartItem({ item, onUpdateQuantity, onRemove }: CartItemProps) {
  return (
    <BlurView intensity={30} tint="light" style={styles.card}>
      <View style={styles.cardInner}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {item.product.image_url ? (
            <Image source={{ uri: item.product.image_url }} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={{ fontSize: 24 }}>🛒</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text style={styles.itemName}>{item.product.name}</Text>
          <Text style={styles.itemStore}>{item.store_name}</Text>
          <Text style={styles.itemUnit}>{item.product.unit}</Text>
        </View>

        {/* Right Side */}
        <View style={styles.right}>
          <Text style={styles.itemPrice}>
            ₱{(item.price * item.quantity).toFixed(2)}
          </Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
            >
              <Minus size={14} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.qty}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={styles.removeBtn} 
            onPress={() => onRemove(item.id)}
          >
            <Trash2 size={16} color="#ef5350" />
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: {
    backgroundColor: colors.glass,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
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
  info: { flex: 1 },
  itemName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  itemStore: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  itemUnit: { color: colors.accent, fontSize: 11, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 6 },
  itemPrice: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  qty: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    padding: 4,
  },
});