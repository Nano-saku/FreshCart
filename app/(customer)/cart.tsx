import { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { useCartStore } from "../../src/stores/cartStore";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { Trash2, Plus, Minus } from "lucide-react-native";

export default function CartScreen() {
  const { items, loading, fetchCart, removeItem, updateQuantity, total } =
    useCartStore();

  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <GreenScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My cart</Text>
        <Text style={styles.sub}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 280 }}
          renderItem={({ item }) => (
            <BlurView intensity={30} tint="light" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.emoji}>
                  <Text style={{ fontSize: 28 }}>🛒</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.itemName}>{item.product.name}</Text>
                  <Text style={styles.itemStore}>{item.store_name}</Text>
                  <Text style={styles.itemUnit}>{item.product.unit}</Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.itemPrice}>
                    ₱{(item.price * item.quantity).toFixed(2)}
                  </Text>
                  <View style={styles.qtyRow}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus size={16} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.qty}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeItem(item.id)}>
                    <Trash2 size={16} color="rgba(255,100,100,0.8)" />
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          )}
          ListFooterComponent={() =>
            items.length > 0 ? (
              <BlurView
                intensity={30}
                tint="light"
                style={[styles.card, { marginTop: 8 }]}
              >
                <View style={styles.cardInner}>
                  <View style={{ flex: 1 }}>
                    {[
                      { label: "Subtotal", val: `₱${total().toFixed(2)}` },
                      { label: "Delivery", val: "₱50.00" },
                    ].map(({ label, val }) => (
                      <View key={label} style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>{label}</Text>
                        <Text style={styles.summaryVal}>{val}</Text>
                      </View>
                    ))}
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                      <Text
                        style={[
                          styles.summaryLabel,
                          { color: "#fff", fontWeight: "700", fontSize: 15 },
                        ]}
                      >
                        Total
                      </Text>
                      <Text
                        style={[
                          styles.summaryVal,
                          {
                            color: colors.accent,
                            fontWeight: "700",
                            fontSize: 17,
                          },
                        ]}
                      >
                        ₱{(total() + 50).toFixed(2)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.checkoutBtn}
                      onPress={() => router.push("/(customer)/checkout")}
                    >
                      <Text style={styles.checkoutText}>
                        Proceed to checkout
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </BlurView>
            ) : null
          }
        />
      )}
      {items.length === 0 && !loading && (
        <Text style={styles.empty}>Your cart is empty</Text>
      )}
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
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
  emoji: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  itemName: { color: "#fff", fontSize: 14, fontWeight: "600" },
  itemStore: { color: colors.textMuted, fontSize: 12 },
  itemUnit: { color: colors.accent, fontSize: 11, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 6 },
  itemPrice: { color: colors.accent, fontSize: 14, fontWeight: "700" },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qty: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    minWidth: 20,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryVal: { color: "#fff", fontSize: 13 },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    marginVertical: 10,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  checkoutText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 80,
    fontSize: 16,
  },
});
