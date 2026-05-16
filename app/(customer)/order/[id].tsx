import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { AppScreen } from "../../../src/components/AppScreen";
import { supabase } from "../../../src/lib/supabase";
import { colors } from "../../../src/constants/colors";
import { useTheme } from "../../../src/contexts/ThemeContext";
import { logger } from "../../../src/lib/logger";
import {
  OrderStatusSteps,
  OrderStatusBadge,
} from "../../../src/components/OrderStatus";
import {
  ChevronLeft,
  Package,
  MapPin,
  FileText,
  Phone,
  Truck,
  Clock,
} from "lucide-react-native";

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `*, store:stores(name, address), order_items(*, store_product:store_products(price, product:products(name, unit, image_url)))`,
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      logger.error("Fetch order error:", err);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrder();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchOrder();

    const channel = supabase
      .channel(`order-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          setOrder((prev: any) => ({ ...prev, status: payload.new.status }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

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
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Track Order</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Order ID & Store */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>#{id?.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.storeName}>{order?.store?.name}</Text>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <OrderStatusBadge status={order?.status} size="md" />
            <View style={styles.dateBadge}>
              <Clock size={14} color={theme.primary} />
              <Text style={styles.statusDate}>
                {new Date(order?.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
          </View>
          <OrderStatusSteps status={order?.status} />
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Package size={20} color={theme.primary} />
            <Text style={styles.cardTitle}>Items Ordered</Text>
          </View>

          {order?.order_items?.map((item: any) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemDot} />
              <Text style={styles.itemName}>
                {item.store_product?.product?.name}
              </Text>
              <View style={styles.itemRight}>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  ${(item.unit_price * item.quantity).toFixed(2)}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.itemRow}>
            <Text
              style={[
                styles.itemName,
                { color: theme.textPrimary, fontWeight: "700" },
              ]}
            >
              Total
            </Text>
            <Text style={styles.totalPrice}>
              ${order?.total_amount?.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={20} color={theme.primary} />
            <Text style={styles.cardTitle}>Delivery Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{order?.delivery_address}</Text>
          </View>

          {order?.notes && (
            <View style={styles.infoRow}>
              <FileText size={16} color={theme.textMuted} />
              <Text style={[styles.infoValue, { marginLeft: 8 }]}>
                {order.notes}
              </Text>
            </View>
          )}
        </View>

        {/* Store Contact */}
        {order?.store?.phone && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Phone size={20} color={theme.primary} />
              <Text style={styles.cardTitle}>Store Contact</Text>
            </View>
            <TouchableOpacity style={styles.phoneRow}>
              <Phone size={16} color={theme.primary} />
              <Text style={styles.phoneText}>{order.store.phone}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map Placeholder */}
        <View style={styles.mapCard}>
          <View style={styles.mapPlaceholder}>
            <Truck size={40} color={theme.primary} />
            <Text style={styles.mapText}>Order is on the way!</Text>
            <Text style={styles.mapSub}>Estimated arrival: 22:55</Text>
          </View>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../../src/constants/colors").lightTheme) => StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  orderHeader: {
    marginBottom: 20,
  },
  orderId: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "800",
  },
  storeName: {
    color: theme.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.primary + "10",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDate: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: "600",
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  cardTitle: {
    color: theme.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.primary,
    marginRight: 10,
  },
  itemName: {
    color: theme.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemQty: {
    color: theme.textMuted,
    fontSize: 13,
  },
  itemPrice: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    minWidth: 60,
    textAlign: "right",
  },
  totalPrice: {
    color: theme.primary,
    fontSize: 18,
    fontWeight: "800",
    minWidth: 60,
    textAlign: "right",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: theme.divider,
    marginVertical: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    color: theme.textMuted,
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    color: theme.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.primary + "10",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.primary + "20",
  },
  phoneText: {
    color: theme.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  mapCard: {
    backgroundColor: theme.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 30,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
    height: 200,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: "dashed",
  },
  mapText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  mapSub: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  backBtn: {
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backBtnText: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
});
