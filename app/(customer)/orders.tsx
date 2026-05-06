import { useEffect, useState } from "react";
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
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";

const STATUS_COLOR: Record<string, string> = {
  pending: "#ffeb3b",
  confirmed: "#64b5f6",
  preparing: "#ffa726",
  out_for_delivery: "#a8e063",
  delivered: "#4caf50",
  cancelled: "#ef5350",
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, store:stores(name), order_items(id)")
      .eq("customer_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // Realtime order status updates
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
    <GreenScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My orders</Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/(customer)/order/${item.id}`)}
            >
              <BlurView intensity={30} tint="light" style={styles.card}>
                <View style={styles.cardInner}>
                  <View style={styles.row}>
                    <Text style={styles.orderId}>
                      #{item.id.slice(0, 8).toUpperCase()}
                    </Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: `${STATUS_COLOR[item.status]}22`,
                          borderColor: `${STATUS_COLOR[item.status]}55`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: STATUS_COLOR[item.status] },
                        ]}
                      >
                        {item.status.replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.storeName}>{item.store?.name}</Text>
                  <View style={styles.row}>
                    <Text style={styles.meta}>
                      {item.order_items?.length} item
                      {item.order_items?.length !== 1 ? "s" : ""}
                    </Text>
                    <Text style={styles.amount}>
                      ₱{item.total_amount?.toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.date}>
                    {new Date(item.created_at).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No orders yet</Text>}
        />
      )}
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 8 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  card: {
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: { backgroundColor: colors.glass, padding: 16, gap: 6 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: { color: "#fff", fontWeight: "700", fontSize: 14 },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  storeName: { color: colors.textMuted, fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  amount: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  date: { color: colors.textMuted, fontSize: 11 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 80,
    fontSize: 16,
  },
});
