import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
  ScrollView,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Clock, CheckCircle, XCircle, Truck } from "lucide-react-native";
import { logger } from "../../src/lib/logger"

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "#F77F00", icon: Clock },
  confirmed: { label: "Confirmed", color: "#4361EE", icon: CheckCircle },
  preparing: { label: "Preparing", color: "#7B2D8B", icon: Package },
  out_for_delivery: { label: "Out for Delivery", color: "#2196F3", icon: Truck },
  delivered: { label: "Delivered", color: "#52B788", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "#E63946", icon: XCircle },
};

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const FILTER_TABS = ["all", "pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"];

export default function AdminOrdersScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState("all");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-all-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, store:stores(name), customer:profiles(full_name, phone), order_items(id)")
        .order("created_at", { ascending: false });
      logger.log(data);
      if (error) throw logger.error;
      return data ?? [];
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => Alert.alert("Error", err.message),
  });

  const handleStatusUpdate = (orderId: string, next: string) => {
    Alert.alert(
      "Update Order Status",
      `Mark as "${next.replace(/_/g, " ")}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => updateStatus({ orderId, status: next }) },
      ]
    );
  };

  const handleCancel = (orderId: string) => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: () => updateStatus({ orderId, status: "cancelled" }),
        },
      ]
    );
  };

  const filtered = activeFilter === "all"
    ? orders
    : orders.filter((o: any) => o.status === activeFilter);

  return (
    <AppScreen noPadding>
      <View style={styles.header}>
        <Text style={[styles.heading, { color: theme.textPrimary }]}>All Orders</Text>
        <Text style={[styles.sub, { color: theme.textMuted }]}>{filtered.length} order{filtered.length !== 1 ? "s" : ""}</Text>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 12 }}
        style={{ flexGrow: 0 }}
      >
        {FILTER_TABS.map((item) => {
          const active = activeFilter === item;
          const cfg = STATUS_CONFIG[item];
          return (
            <TouchableOpacity
              key={item}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? (cfg?.color ?? theme.primary) : theme.surface,
                  borderColor: active ? (cfg?.color ?? theme.primary) : theme.border,
                  elevation: active ? 3 : 0,
                  shadowColor: active ? (cfg?.color ?? theme.primary) : "transparent",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4,
                }
              ]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.tabText, { color: active ? "#fff" : theme.textSecondary }]}>
                {item === "all" ? "All" : (cfg?.label ?? item)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Package size={40} color={theme.textMuted} />
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>No orders found</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => {
            const cfg = STATUS_CONFIG[item.status] ?? { label: item.status, color: theme.textMuted, icon: Package };
            const StatusIcon = cfg.icon;
            const next = NEXT_STATUS[item.status];
            const canCancel = ["pending", "confirmed"].includes(item.status);

            return (
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.cardTop}>
                  <Text style={[styles.orderId, { color: theme.textPrimary }]}>
                    #{item.id.slice(0, 8).toUpperCase()}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + "15", borderColor: cfg.color + "40" }]}>
                    <StatusIcon size={12} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                <Text style={[styles.customer, { color: theme.textPrimary }]}>
                  {item.customer?.full_name ?? "Unknown Customer"}
                </Text>
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {item.store?.name} • {item.order_items?.length ?? 0} items • ₱{item.total_amount?.toFixed(2)}
                </Text>
                {item.customer?.phone && (
                  <Text style={[styles.meta, { color: theme.textMuted }]}>📞 {item.customer.phone}</Text>
                )}
                <Text style={[styles.meta, { color: theme.textMuted }]}>
                  {new Date(item.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </Text>

                <View style={styles.actions}>
                  {next && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                      onPress={() => handleStatusUpdate(item.id, next)}
                      disabled={updating}
                    >
                      <Text style={styles.actionBtnText}>→ {next.replace(/_/g, " ")}</Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.error + "15", borderWidth: 1, borderColor: theme.error + "40" }]}
                      onPress={() => handleCancel(item.id)}
                      disabled={updating}
                    >
                      <Text style={[styles.actionBtnText, { color: theme.error }]}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: { padding: 20, paddingBottom: 12 },
  heading: { fontSize: 24, fontWeight: "700" },
  sub: { fontSize: 13, marginTop: 2 },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 4 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  orderId: { fontSize: 14, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "600" },
  customer: { fontSize: 14, fontWeight: "600" },
  meta: { fontSize: 12 },
  actions: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  actionBtnText: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 15 },
});