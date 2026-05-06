import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { useAuthStore } from "../../src/stores/authStore";

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

export default function AdminOrdersScreen() {
  const { profile } = useAuthStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!profile?.id) return;
    
    // First find the seller's store
    const { data: storeData } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", profile.id)
      .single();

    if (!storeData) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("orders")
      .select(
        "*, customer:profiles(full_name, phone), store:stores(name), order_items(id)",
      )
      .eq("store_id", storeData.id)
      .order("created_at", { ascending: false });
      
    setOrders(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [profile]);

  const updateStatus = async (id: string, newStatus: string) => {
    await supabase.from("orders").update({ status: newStatus }).eq("id", id);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o)),
    );
  };

  return (
    <GreenScreen>
      <View style={{ padding: 20, paddingBottom: 8 }}>
        <Text style={{ color: "#fff", fontSize: 24, fontWeight: "700" }}>
          Manage orders
        </Text>
      </View>
      {loading ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <BlurView intensity={30} tint="light" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.row}>
                  <Text style={styles.orderId}>
                    #{item.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <Text style={styles.amount}>
                    ₱{item.total_amount?.toFixed(2)}
                  </Text>
                </View>
                <Text style={styles.customer}>
                  {item.customer?.full_name} • {item.customer?.phone}
                </Text>
                <Text style={styles.meta}>
                  {item.store?.name} • {item.order_items?.length} items
                </Text>
                <View style={styles.row}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {item.status?.replace(/_/g, " ")}
                    </Text>
                  </View>
                  {NEXT_STATUS[item.status] && (
                    <TouchableOpacity
                      style={styles.nextBtn}
                      onPress={() =>
                        Alert.alert(
                          "Update status",
                          `Mark as ${NEXT_STATUS[item.status].replace(/_/g, " ")}?`,
                          [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Yes",
                              onPress: () =>
                                updateStatus(item.id, NEXT_STATUS[item.status]),
                            },
                          ],
                        )
                      }
                    >
                      <Text style={styles.nextBtnText}>
                        → {NEXT_STATUS[item.status].replace(/_/g, " ")}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </BlurView>
          )}
        />
      )}
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
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
  amount: { color: colors.accent, fontWeight: "700", fontSize: 14 },
  customer: { color: "#fff", fontSize: 13 },
  meta: { color: colors.textMuted, fontSize: 12 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(168,224,99,0.15)",
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.3)",
  },
  statusText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  nextBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
