import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { AppScreen } from "../../../src/components/AppScreen";
import { supabase } from "../../../src/lib/supabase";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { logger } from "../../../src/lib/logger";
import { OrderStatusBadge, OrderStatusSteps } from "../../../src/components/OrderStatus";
import {
  ChevronLeft,
  Package,
  MapPin,
  FileText,
  Phone,
  Clock,
  User,
  CreditCard,
} from "lucide-react-native";

const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "out_for_delivery",
  out_for_delivery: "delivered",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function SellerOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:profiles(full_name, phone, email),
          store:stores(name, address),
          order_items(
            id,
            quantity,
            unit_price,
            store_product:store_products(
              price,
              product:products(name, unit, image_url)
            )
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      logger.error("Fetch seller order error:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  }, [id]);

  useEffect(() => {
    fetchOrder();

    // Real-time status updates
    const channel = supabase
      .channel(`seller-order-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${id}` },
        (payload) => setOrder((prev: any) => ({ ...prev, ...payload.new }))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  const handleUpdateStatus = async () => {
    const nextStatus = NEXT_STATUS[order?.status];
    if (!nextStatus) return;

    Alert.alert(
      "Update Order Status",
      `Mark this order as "${STATUS_LABELS[nextStatus]}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setUpdating(true);
            const { error } = await supabase
              .from("orders")
              .update({ status: nextStatus })
              .eq("id", id);
            if (error) {
              Alert.alert("Error", "Could not update order status.");
              logger.error("Order status update error:", error);
            } else {
              setOrder((prev: any) => ({ ...prev, status: nextStatus }));
            }
            setUpdating(false);
          },
        },
      ]
    );
  };

  const handleCancelOrder = async () => {
    if (!["pending", "confirmed"].includes(order?.status)) return;
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel this order? This cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            setUpdating(true);
            const { error } = await supabase
              .from("orders")
              .update({ status: "cancelled" })
              .eq("id", id);
            if (error) {
              Alert.alert("Error", "Could not cancel order.");
            } else {
              setOrder((prev: any) => ({ ...prev, status: "cancelled" }));
            }
            setUpdating(false);
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator color={theme.primary} style={{ flex: 1 }} />
      </AppScreen>
    );
  }

  if (!order) {
    return (
      <AppScreen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity style={styles.backBtnPill} onPress={() => router.back()}>
            <Text style={styles.backBtnPillText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  const nextStatus = NEXT_STATUS[order.status];
  const canCancel = ["pending", "confirmed"].includes(order.status);
  const itemsTotal = order.order_items?.reduce(
    (sum: number, item: any) => sum + item.unit_price * item.quantity, 0
  ) ?? 0;

  return (
    <AppScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Order Details</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Order ID & Date */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{id?.slice(0, 8).toUpperCase()}</Text>
          <View style={styles.dateBadge}>
            <Clock size={13} color={theme.primary} />
            <Text style={styles.dateText}>
              {new Date(order.created_at).toLocaleDateString("en-PH", {
                month: "short", day: "numeric", year: "numeric",
              })}{" "}
              {new Date(order.created_at).toLocaleTimeString("en-PH", {
                hour: "2-digit", minute: "2-digit",
              })}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <OrderStatusBadge status={order.status} size="md" />
          </View>
          <OrderStatusSteps status={order.status} />
        </View>

        {/* Action Buttons */}
        {(nextStatus || canCancel) && (
          <View style={styles.actionRow}>
            {nextStatus && (
              <TouchableOpacity
                style={[styles.advanceBtn, { backgroundColor: theme.primary }, updating && { opacity: 0.6 }]}
                onPress={handleUpdateStatus}
                disabled={updating}
              >
                {updating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.advanceBtnText}>
                      Mark as {STATUS_LABELS[nextStatus]}
                    </Text>
                }
              </TouchableOpacity>
            )}
            {canCancel && (
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: theme.error ?? "#ef4444" }, updating && { opacity: 0.6 }]}
                onPress={handleCancelOrder}
                disabled={updating}
              >
                <Text style={[styles.cancelBtnText, { color: theme.error ?? "#ef4444" }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Customer Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <User size={18} color={theme.primary} />
            <Text style={styles.cardTitle}>Customer</Text>
          </View>
          <Text style={styles.infoValue}>{order.customer?.full_name ?? "—"}</Text>
          {order.customer?.phone && (
            <View style={styles.phoneRow}>
              <Phone size={15} color={theme.primary} />
              <Text style={styles.phoneText}>{order.customer.phone}</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={18} color={theme.primary} />
            <Text style={styles.cardTitle}>
              Items ({order.order_items?.length ?? 0})
            </Text>
          </View>

          {order.order_items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemDot} />
              <Text style={styles.itemName} numberOfLines={1}>
                {item.store_product?.product?.name ?? "Unknown"}
              </Text>
              <View style={styles.itemRight}>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  ₱{(item.unit_price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <Text style={[styles.itemName, { color: theme.textSecondary }]}>Items subtotal</Text>
            <Text style={styles.itemPrice}>₱{itemsTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.itemRow}>
            <Text style={[styles.itemName, { color: theme.textPrimary, fontWeight: "700" }]}>
              Order Total
            </Text>
            <Text style={styles.totalPrice}>₱{order.total_amount?.toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color={theme.primary} />
            <Text style={styles.cardTitle}>Delivery Address</Text>
          </View>
          <Text style={styles.infoValue}>{order.delivery_address ?? "—"}</Text>

          {order.notes && (
            <>
              <View style={styles.divider} />
              <View style={styles.cardHeader}>
                <FileText size={16} color={theme.textMuted} />
                <Text style={[styles.cardTitle, { color: theme.textSecondary, fontSize: 14 }]}>
                  Notes
                </Text>
              </View>
              <Text style={[styles.infoValue, { color: theme.textSecondary }]}>
                {order.notes}
              </Text>
            </>
          )}
        </View>

        {/* Payment */}
        <View style={[styles.card, { marginBottom: 40 }]}>
          <View style={styles.cardHeader}>
            <CreditCard size={18} color={theme.primary} />
            <Text style={styles.cardTitle}>Payment</Text>
          </View>
          <Text style={styles.infoValue}>
            {order.payment_method === "cash_on_delivery"
              ? "Cash on Delivery"
              : order.payment_method === "bank_transfer"
              ? "Bank Transfer"
              : order.payment_method}
          </Text>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    iconBtn: {
      width: 42, height: 42, borderRadius: 14,
      backgroundColor: theme.background,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: theme.border,
    },
    title: { color: theme.textPrimary, fontSize: 18, fontWeight: "700" },
    orderHeader: { marginBottom: 16 },
    orderId: { color: theme.textPrimary, fontSize: 24, fontWeight: "800", marginBottom: 6 },
    dateBadge: {
      flexDirection: "row", alignItems: "center", gap: 6,
      alignSelf: "flex-start",
      backgroundColor: theme.primary + "12",
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
    },
    dateText: { color: theme.primary, fontSize: 12, fontWeight: "600" },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 20, padding: 20, marginBottom: 14,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1, shadowRadius: 8, elevation: 3,
    },
    cardHeader: {
      flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12,
    },
    cardTitle: { color: theme.textPrimary, fontWeight: "700", fontSize: 16 },
    actionRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
    advanceBtn: {
      flex: 1, borderRadius: 14, paddingVertical: 14,
      alignItems: "center", justifyContent: "center",
    },
    advanceBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    cancelBtn: {
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
      alignItems: "center", justifyContent: "center",
      borderWidth: 1.5,
    },
    cancelBtnText: { fontWeight: "700", fontSize: 15 },
    infoValue: { color: theme.textPrimary, fontSize: 14, lineHeight: 22 },
    phoneRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      backgroundColor: theme.primary + "10",
      padding: 12, borderRadius: 12,
      borderWidth: 1, borderColor: theme.primary + "20",
      marginTop: 10,
    },
    phoneText: { color: theme.primary, fontSize: 14, fontWeight: "600" },
    itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
    itemDot: {
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: theme.primary, marginRight: 10,
    },
    itemName: { color: theme.textSecondary, fontSize: 14, flex: 1 },
    itemRight: { flexDirection: "row", alignItems: "center", gap: 12 },
    itemQty: { color: theme.textMuted, fontSize: 13 },
    itemPrice: {
      color: theme.textPrimary, fontSize: 14, fontWeight: "600",
      minWidth: 70, textAlign: "right",
    },
    totalPrice: {
      color: theme.primary, fontSize: 17, fontWeight: "800",
      minWidth: 70, textAlign: "right",
    },
    divider: { borderTopWidth: 1, borderTopColor: theme.divider, marginVertical: 12 },
    errorContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
    errorText: { color: theme.textPrimary, fontSize: 18, fontWeight: "600" },
    backBtnPill: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
    },
    backBtnPillText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  });