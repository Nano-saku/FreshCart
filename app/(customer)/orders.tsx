import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { OrderStatusBadge } from "../../src/components/OrderStatus";
import { Package, Clock, ChevronRight } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { logger } from "../../src/lib/logger";

export default function OrdersScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `*, store:stores(name, address, latitude, longitude), order_items(*, store_product:store_products(price, product:products(name, unit, image_url)))`,
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data ?? []);
    } catch (err) {
      logger.error("Fetch orders error:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("my-orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => fetchOrders(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.subtitle}>
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(customer)/order/${item.id}`)}
              activeOpacity={0.85}
              style={styles.orderCard}
            >
              <View style={styles.cardInner}>
                <View style={styles.row}>
                  <View style={styles.orderIdContainer}>
                    <Package size={16} color={theme.primary} />
                    <Text style={styles.orderId}>
                      #{item.id.slice(0, 8).toUpperCase()}
                    </Text>
                  </View>
                  <OrderStatusBadge status={item.status} size="sm" />
                </View>

                <Text style={styles.storeName}>
                  {item.store?.name || "Unknown Store"}
                </Text>

                <View style={styles.row}>
                  <View style={styles.metaContainer}>
                    <Clock size={12} color={theme.textMuted} />
                    <Text style={styles.meta}>
                      {new Date(item.created_at).toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={styles.meta}>
                    {item.order_items?.length || 0} item
                    {item.order_items?.length !== 1 ? "s" : ""}
                  </Text>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amount}>
                    ${item.total_amount?.toFixed(2)}
                  </Text>
                  <View style={styles.trackBtn}>
                    <Text style={styles.trackText}>Track</Text>
                    <ChevronRight size={14} color={theme.primary} />
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <Package size={48} color={theme.primary} />
              </View>
              <Text style={styles.emptyTitle}>No orders yet</Text>
              <Text style={styles.emptySub}>
                Start shopping to see your orders here
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push("/(customer)")}
              >
                <Text style={styles.browseText}>Start Shopping</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: theme.surface,
    borderRadius: 18,
    marginBottom: 12,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderId: {
    color: theme.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  storeName: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    color: theme.textMuted,
    fontSize: 12,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.divider,
  },
  amount: {
    color: theme.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: theme.primary + "10",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  trackText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  emptySub: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
  browseBtn: {
    backgroundColor: theme.primary + "10",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.primary + "30",
    marginTop: 8,
  },
  browseText: {
    color: theme.primary,
    fontWeight: "600",
    fontSize: 15,
  },
});
