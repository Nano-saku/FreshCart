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
import { CartItem } from "../../src/components/CartItem";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { ShoppingBag } from "lucide-react-native";

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
            <CartItem
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
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
        <View style={styles.emptyContainer}>
          <ShoppingBag size={48} color={colors.textMuted} />
          <Text style={styles.empty}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/(customer)")}
          >
            <Text style={styles.browseText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
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
    padding: 18,
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
  emptyContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    fontSize: 16,
  },
  browseBtn: {
    backgroundColor: colors.accent + "30",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + "50",
  },
  browseText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
});