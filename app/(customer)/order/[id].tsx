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
import { GreenScreen } from "../../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../../src/lib/supabase";
import { colors } from "../../../src/constants/colors";
import { OrderStatusSteps, OrderStatusBadge } from "../../../src/components/OrderStatus";
import { ChevronLeft, Package, MapPin, FileText, Phone } from "lucide-react-native";

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`*, store:stores(name, phone, address), order_items(*, store_product:store_products(price, product:products(name, unit, image_url)))`)
        .eq("id", id)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (err) {
      console.error("Fetch order error:", err);
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading) {
    return (
      <GreenScreen>
        <ActivityIndicator color="#fff" style={{ flex: 1 }} />
      </GreenScreen>
    );
  }

  if (!order) {
    return (
      <GreenScreen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Order not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </GreenScreen>
    );
  }

  return (
    <GreenScreen>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ChevronLeft size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Order tracking</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Order ID & Store */}
        <Text style={styles.orderId}>#{id?.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.storeName}>{order?.store?.name}</Text>

        {/* Status Steps */}
        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 20 }]}
        >
          <View style={styles.cardInner}>
            <View style={styles.statusHeader}>
              <OrderStatusBadge status={order?.status} size="md" />
              <Text style={styles.statusDate}>
                {new Date(order?.created_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Text>
            </View>
            <OrderStatusSteps status={order?.status} />
          </View>
        </BlurView>

        {/* Order Items */}
        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 12 }]}
        >
          <View style={styles.cardInner}>
            <View style={styles.sectionHeader}>
              <Package size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Items ordered</Text>
            </View>

            {order?.order_items?.map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.store_product?.product?.name}
                </Text>
                <View style={styles.itemRight}>
                  <Text style={styles.itemQty}>x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>
                    ₱{(item.unit_price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.itemRow}>
              <Text style={[styles.itemName, { color: "#fff", fontWeight: "700" }]}>
                Total
              </Text>
              <Text
                style={[
                  styles.itemPrice,
                  { color: colors.accent, fontWeight: "700", fontSize: 16 },
                ]}
              >
                ₱{order?.total_amount?.toFixed(2)}
              </Text>
            </View>
          </View>
        </BlurView>

        {/* Delivery Info */}
        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 12 }]}
        >
          <View style={styles.cardInner}>
            <View style={styles.sectionHeader}>
              <MapPin size={18} color={colors.accent} />
              <Text style={styles.sectionTitle}>Delivery details</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{order?.delivery_address}</Text>
            </View>

            {order?.notes && (
              <View style={styles.infoRow}>
                <FileText size={14} color={colors.textMuted} />
                <Text style={[styles.infoValue, { marginLeft: 8 }]}>
                  {order.notes}
                </Text>
              </View>
            )}
          </View>
        </BlurView>

        {/* Store Contact */}
        {order?.store?.phone && (
          <BlurView
            intensity={30}
            tint="light"
            style={[styles.card, { marginTop: 12 }]}
          >
            <View style={styles.cardInner}>
              <View style={styles.sectionHeader}>
                <Phone size={18} color={colors.accent} />
                <Text style={styles.sectionTitle}>Store contact</Text>
              </View>
              <TouchableOpacity style={styles.phoneRow}>
                <Text style={styles.phoneText}>{order.store.phone}</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        )}
      </ScrollView>
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  orderId: { color: "#fff", fontSize: 20, fontWeight: "700" },
  storeName: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  card: {
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: { backgroundColor: colors.glass, padding: 18 },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusDate: {
    color: colors.textMuted,
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  itemName: { color: colors.textMuted, fontSize: 13, flex: 1 },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemQty: { color: colors.textMuted, fontSize: 13 },
  itemPrice: { color: "#fff", fontSize: 13, fontWeight: "600" },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    marginVertical: 10,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  infoValue: {
    color: "#fff",
    fontSize: 13,
    lineHeight: 20,
  },
  phoneRow: {
    backgroundColor: "rgba(168,224,99,0.1)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.accent + "30",
  },
  phoneText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
  },
  backBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
});