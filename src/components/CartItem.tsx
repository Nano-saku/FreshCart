import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
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
    <View style={styles.card}>
      <View style={styles.cardInner}>
        {/* Product Image */}
        <View style={styles.imageContainer}>
          {item.product.image_url ? (
            <Image
              source={{ uri: item.product.image_url }}
              style={styles.image}
            />
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

          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
            <Text style={styles.unitPrice}>${item.price.toFixed(2)} each</Text>
          </View>
        </View>

        {/* Right Side - Qty & Delete */}
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onRemove(item.id)}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>

          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[
                styles.qtyBtn,
                item.quantity <= 1 && styles.qtyBtnDisabled,
              ]}
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
            >
              <Minus
                size={14}
                color={
                  item.quantity <= 1 ? colors.textMuted : colors.textPrimary
                }
              />
            </TouchableOpacity>
            <Text style={styles.qty}>{item.quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
            >
              <Plus size={14} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: colors.surface,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  cardInner: {
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: colors.surfaceVariant,
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
  info: {
    flex: 1,
    justifyContent: "center",
  },
  itemName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemStore: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemUnit: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  itemPrice: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  unitPrice: {
    color: colors.textMuted,
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 80,
  },
  deleteBtn: {
    padding: 4,
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyBtnDisabled: {
    backgroundColor: colors.borderLight,
  },
  qty: {
    color: colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    minWidth: 20,
    textAlign: "center",
  },
});
