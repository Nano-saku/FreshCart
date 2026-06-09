import { useEffect, useMemo, useCallback, JSX } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { useCartStore } from "../../src/stores/cartStore";
import { CartItem } from "../../src/components/CartItem";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuthStore } from "../../src/stores/authStore";
import { router } from "expo-router";
import { ShoppingBag, ChevronRight, Store, AlertTriangle } from "lucide-react-native";

const CURRENCY = "₱";

export default function CartScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { 
    items, 
    loading, 
    fetchCart, 
    removeItem, 
    updateQuantity, 
    total,
    hasMultipleStores,
    getStoreGroups,
    getStoreTotal,
    clearStoreItems,
    clearCart
  } = useCartStore();
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    fetchCart();
  }, []);

  const subtotal = total();
  const storeGroups = getStoreGroups();
  const multipleStores = hasMultipleStores();

  // Handle checkout for a specific store
  const handleStoreCheckout = (storeId: string) => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to checkout.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
        ]
      );
      return;
    }

    // Navigate to checkout with store_id - this will only checkout items from this store
    router.push({
      pathname: "/(customer)/checkout",
      params: { store_id: storeId }
    });
  };

  // Handle checkout for ALL stores (creates separate orders)
  const handleCheckoutAll = () => {
    if (!user) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to checkout.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Sign In", onPress: () => router.push("/(auth)/login") },
        ]
      );
      return;
    }

    if (multipleStores) {
      Alert.alert(
        "Multiple Store Checkout",
        `Your cart has items from ${storeGroups.size} different stores.\n\nEach store will create a separate order. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Checkout All", 
            onPress: () => router.push("/(customer)/checkout") // No store_id = checkout all
          },
        ]
      );
    } else {
      // Single store - checkout directly
      const firstStore = Array.from(storeGroups.keys())[0];
      handleStoreCheckout(firstStore);
    }
  };

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

  // Render store sections for all items
  const renderStoreSections = () => {
    const sections: JSX.Element[] = [];
    
    storeGroups.forEach((storeItems, storeId) => {
      const storeName = storeItems[0]?.store_name || "Unknown Store";
      const storeTotal = getStoreTotal(storeId);
      
      sections.push(
        <View key={storeId} style={styles.storeSection}>
          {/* Store Header */}
          <View style={styles.storeHeader}>
            <View style={styles.storeInfo}>
              <Store size={18} color={theme.primary} />
              <Text style={styles.storeName}>{storeName}</Text>
              <Text style={styles.storeItemCount}>
                ({storeItems.length} {storeItems.length === 1 ? 'item' : 'items'})
              </Text>
            </View>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                "Clear Store Items",
                `Remove all items from ${storeName}?`,
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", onPress: () => clearStoreItems(storeId), style: "destructive" }
                ]
              );
            }}>
              <Text style={styles.clearStore}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Store Items */}
          {storeItems.map(item => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateQuantity={updateQuantity}
              onRemove={removeItem}
            />
          ))}

          {/* Store Total & Checkout Button */}
          <View style={styles.storeFooter}>
            <View style={styles.storeTotalRow}>
              <Text style={styles.storeTotalLabel}>Store Subtotal</Text>
              <Text style={styles.storeTotalAmount}>
                {CURRENCY}{storeTotal.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.storeCheckoutBtn, { backgroundColor: theme.primary }]}
              onPress={() => handleStoreCheckout(storeId)}
            >
              <Text style={styles.storeCheckoutText}>Checkout {storeName}</Text>
              <ChevronRight size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      );
    });

    return sections;
  };

  return (
    <AppScreen>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>My Cart</Text>
        <Text style={[styles.sub, { color: theme.textSecondary }]}>
          {items.length} item{items.length !== 1 ? "s" : ""}
          {multipleStores && ` from ${storeGroups.size} stores`}
        </Text>
        
        {/* Multi-store warning */}
        {multipleStores && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={16} color={theme.warning} />
            <Text style={styles.warningText}>
              Items from multiple stores will create separate orders
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={renderStoreSections}
          ListFooterComponent={() =>
            items.length > 0 ? (
              <View style={styles.footerSection}>
                {/* Order Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
                  <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>Order Summary</Text>
                  
                  {/* Per-store totals */}
                  {Array.from(storeGroups.entries()).map(([storeId, storeItems]) => (
                    <View key={storeId} style={styles.summaryRow}>
                      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                        {storeItems[0]?.store_name} ({storeItems.length} items)
                      </Text>
                      <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>
                        {CURRENCY}{getStoreTotal(storeId).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                  
                  <View style={[styles.divider, { borderTopColor: theme.border }]} />
                  
                  <View style={styles.summaryRow}>
                    <Text style={[styles.totalLabel, { color: theme.textPrimary }]}>Grand Total</Text>
                    <Text style={[styles.totalVal, { color: theme.primary }]}>
                      {CURRENCY}{subtotal.toFixed(2)}
                    </Text>
                  </View>

                  {/* Checkout All Button (for multi-store) */}
                  {multipleStores ? (
                    <View style={styles.checkoutOptions}>
                      <TouchableOpacity
                        onPress={handleCheckoutAll}
                        style={[styles.checkoutAllBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                      >
                        <Text style={[styles.checkoutText, { color: "#fff" }]}>
                          Checkout All Stores ({storeGroups.size} orders)
                        </Text>
                        <ChevronRight size={18} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.orText}>or checkout individually above</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={handleCheckoutAll}
                      style={[styles.checkoutAllBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                    >
                      <Text style={[styles.checkoutText, { color: "#fff" }]}>Proceed to Checkout</Text>
                      <ChevronRight size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                  
                  {/* Clear all button */}
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        "Clear Cart",
                        "Remove all items from your cart?",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Clear All", onPress: clearCart, style: "destructive" }
                        ]
                      );
                    }}
                    style={styles.clearAllBtn}
                  >
                    <Text style={styles.clearAllText}>Clear All Items</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 20 }}
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

const createStyles = (theme: any) => StyleSheet.create({
  header: {
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
  },
  sub: {
    fontSize: 14,
    marginTop: 4,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: theme.warning + "15",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.warning + "30",
  },
  warningText: {
    color: theme.warning,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  storeSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: theme.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  storeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: theme.primary + "08",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  storeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  storeItemCount: {
    fontSize: 13,
    color: theme.textMuted,
  },
  clearStore: {
    color: theme.error,
    fontSize: 14,
    fontWeight: "600",
  },
  storeFooter: {
    padding: 16,
    backgroundColor: theme.background,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  storeTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  storeTotalLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  storeTotalAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  storeCheckoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  storeCheckoutText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  footerSection: {
    padding: 16,
  },
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    marginBottom: 8,
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
  checkoutOptions: {
    marginTop: 16,
    gap: 8,
  },
  checkoutAllBtn: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 8,
  },
  checkoutText: {
    fontWeight: "700",
    fontSize: 16,
  },
  orText: {
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  clearAllBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  clearAllText: {
    color: theme.error,
    fontSize: 14,
    fontWeight: "600",
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