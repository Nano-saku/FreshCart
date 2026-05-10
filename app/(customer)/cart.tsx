import { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { useCartStore } from "../../src/stores/cartStore";
import { CartItem } from "../../src/components/CartItem";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { ShoppingBag, ChevronRight } from "lucide-react-native";

export default function CartScreen() {
  const { items, loading, fetchCart, removeItem, updateQuantity, total } =
    useCartStore();

  useEffect(() => {
    fetchCart();
  }, []);

  const subtotal = total();
  const deliveryFee = items.length > 0 ? 5.0 : 0;
  const grandTotal = subtotal + deliveryFee;

  return (
    <AppScreen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <Text style={styles.sub}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <CartItem
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          )}
          ListFooterComponent={() =>
            items.length > 0 ? (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Order Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>${subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryVal}>
                    ${deliveryFee.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalVal}>${grandTotal.toFixed(2)}</Text>
                </View>

                <TouchableOpacity
                  style={styles.checkoutBtn}
                  onPress={() => router.push("/(customer)/checkout")}
                >
                  <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                  <ChevronRight size={20} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {items.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <ShoppingBag size={48} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>
            Add some fresh items to get started
          </Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/(customer)")}
          >
            <Text style={styles.browseText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  summaryVal: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginVertical: 12,
  },
  totalLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 18,
  },
  totalVal: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 20,
  },
  checkoutBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutText: {
    color: colors.textLight,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    marginTop: 60,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  emptySub: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  browseBtn: {
    backgroundColor: colors.primary + "10",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary + "30",
    marginTop: 8,
  },
  browseText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 15,
  },
});
