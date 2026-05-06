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
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { useLocalSearchParams, router } from "expo-router";
import { OrderStatusBadge, STATUS_COLORS } from "../../src/components/OrderStatus";
import { Package, Clock } from "lucide-react-native";

export default function OrdersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
        .select(`*, store:stores(name, phone, address), order_items(*, store_product:store_products(price, product:products(name, unit, image_url)))`)
        .eq("id", id)
        .single();

      if (error) throw error;
      setOrders(data ?? []);
    } catch (err) {
      console.error("Fetch orders error:", err);
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

    // Realtime order status updates
    const channel = supabase
      .channel("my-orders")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <GreenScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My orders</Text>
        <Text style={styles.subtitle}>
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(customer)/order/${item.id}`)}
              activeOpacity={0.85}
            >
              <BlurView intensity={30} tint="light" style={styles.card}>
                <View style={styles.cardInner}>
                  <View style={styles.row}>
                    <View style={styles.orderIdContainer}>
                      <Package size={16} color={colors.accent} />
                      <Text style={styles.orderId}>
                        #{item.id.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                    <OrderStatusBadge status={item.status} size="sm" />
                  </View>

                  <Text style={styles.storeName}>{item.store?.name || "Unknown Store"}</Text>

                  <View style={styles.row}>
                    <View style={styles.metaContainer}>
                      <Clock size={12} color={colors.textMuted} />
                      <Text style={styles.meta}>
                        {new Date(item.created_at).toLocaleDateString("en-PH", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View style={styles.metaContainer}>
                      <Text style={styles.meta}>
                        {item.order_items?.length || 0} item{item.order_items?.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={styles.amount}>
                      ₱{item.total_amount?.toFixed(2)}
                    </Text>
                    <Text style={styles.trackText}>Tap to track →</Text>
                  </View>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Package size={48} color={colors.textMuted} />
              <Text style={styles.empty}>No orders yet</Text>
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
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  subtitle: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: { backgroundColor: colors.glass, padding: 16, gap: 8 },
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
  orderId: { color: "#fff", fontWeight: "700", fontSize: 14 },
  storeName: { color: colors.textMuted, fontSize: 13 },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: { color: colors.textMuted, fontSize: 12 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  amount: { color: colors.accent, fontWeight: "700", fontSize: 16 },
  trackText: { color: colors.textMuted, fontSize: 12 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
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