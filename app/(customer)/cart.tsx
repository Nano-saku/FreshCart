import { useEffect, useMemo, useCallback } from "react";
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
import { useTheme } from "../../src/contexts/ThemeContext";
import { router } from "expo-router";
import { ShoppingBag, ChevronRight } from "lucide-react-native";

export default function CartScreen() {
  const { theme } = useTheme();
  const { items, loading, fetchCart, removeItem, updateQuantity, total } = useCartStore();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    fetchCart();
  }, []);

  const subtotal = total();

  // Memoize renderItem for cart list performance
  const renderCartItem = useCallback(
    ({ item }: { item: any }) => (
      <CartItem
        item={item}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
      />
    ),
    [updateQuantity, removeItem]
  );

  return (
    <AppScreen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>My Cart</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderCartItem}
          maxToRenderPerBatch={5}
          windowSize={3}
          removeClippedSubviews={true}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListFooterComponent={() =>
            items.length > 0 ? (
              <View style={[styles.summaryCard, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
                <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>Order Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>${subtotal.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push("/(customer)/checkout")}
                  style={[styles.checkoutBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                >
                  <Text style={[styles.checkoutText, { color: "#fff" }]}>Proceed to Checkout</Text>
                  <ChevronRight size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {items.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "10" }]}>
            <ShoppingBag size={40} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Your cart is empty</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Add some fresh items to get started</Text>
          <TouchableOpacity
            onPress={() => router.push("/(customer)")}
            style={[styles.browseBtn, { backgroundColor: theme.primary + "10", borderColor: theme.primary + "30" }]}
          >
            <Text style={[styles.browseText, { color: theme.primary }]}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      )}
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  sub: {
    fontSize: 14,
    marginTop: 4,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryTitle: {
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
    fontSize: 14,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    borderTopWidth: 1,
    marginVertical: 12,
  },
  totalLabel: {
    fontWeight: "700",
    fontSize: 18,
  },
  totalVal: {
    fontWeight: "800",
    fontSize: 20,
  },
  checkoutBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutText: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 14,
  },
  browseBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  browseText: {
    fontWeight: "600",
    fontSize: 15,
  },
});