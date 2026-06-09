import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { Minus, Plus, Trash2 } from "lucide-react-native";
import { useMemo } from 'react';
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
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.card}>
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
          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>
              ₱{(item.price * item.quantity).toFixed(2)}
            </Text>
            <Text style={styles.unitPrice}>
              ₱{item.price.toFixed(2)} each
            </Text>
          </View>
        </View>

        {/* Right Side - Qty & Delete */}
        <View style={styles.right}>
          <TouchableOpacity onPress={() => onRemove(item.id)} style={styles.deleteBtn}>
            <Trash2 size={18} color={theme.error} />
          </TouchableOpacity>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              disabled={item.quantity <= 1}
              style={[styles.qtyBtn, item.quantity <= 1 && styles.qtyBtnDisabled]}
            >
              <Minus size={14} color={item.quantity <= 1 ? theme.textMuted : theme.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.qty}>{item.quantity}</Text>
            <TouchableOpacity onPress={() => onUpdateQuantity(item.id, item.quantity + 1)} style={styles.qtyBtn}>
              <Plus size={14} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: typeof import("../constants/colors").lightTheme) => StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: theme.surface,
    shadowColor: theme.shadowColor,
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
    backgroundColor: theme.surfaceVariant,
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
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemStore: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemUnit: {
    color: theme.textMuted,
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
    color: theme.primary,
    fontSize: 16,
    fontWeight: "700",
  },
  unitPrice: {
    color: theme.textMuted,
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
    backgroundColor: theme.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.border,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 1,
  },
  qtyBtnDisabled: {
    backgroundColor: theme.borderLight,
  },
  qty: {
    color: theme.textPrimary,
    fontWeight: "600",
    fontSize: 14,
    minWidth: 20,
    textAlign: "center",
  },
});