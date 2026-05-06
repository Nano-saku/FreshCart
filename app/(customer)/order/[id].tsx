import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { GreenScreen } from "../../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../../src/lib/supabase";
import { colors } from "../../../src/constants/colors";
import { ChevronLeft, CheckCircle2, Circle, Clock } from "lucide-react-native";

const STEPS = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];
const STEP_LABELS: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Order confirmed",
  preparing: "Preparing your order",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    const { data } = await supabase
      .from("orders")
      .select(
        "*, store:stores(name), order_items(*, store_product:store_products(price, product:products(name, unit)))",
      )
      .eq("id", id)
      .single();
    setOrder(data);
    setLoading(false);
  };

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
        (payload) =>
          setOrder((prev: any) => ({ ...prev, status: payload.new.status })),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  if (loading)
    return (
      <GreenScreen>
        <ActivityIndicator color="#fff" style={{ flex: 1 }} />
      </GreenScreen>
    );

  const currentStep = STEPS.indexOf(order?.status);

  return (
    <GreenScreen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
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
        <Text style={styles.orderId}>#{id?.slice(0, 8).toUpperCase()}</Text>
        <Text style={styles.storeName}>{order?.store?.name}</Text>

        {/* Steps */}
        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 20 }]}
        >
          <View style={styles.cardInner}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {order?.status?.replace(/_/g, " ")}
              </Text>
            </View>
            {STEPS.map((step, i) => {
              const done = i < currentStep;
              const active = i === currentStep;
              const isLast = i === STEPS.length - 1;
              return (
                <View key={step} style={styles.stepRow}>
                  <View style={styles.stepCol}>
                    {done ? (
                      <CheckCircle2
                        size={22}
                        color={colors.accent}
                        fill={colors.primary}
                      />
                    ) : active ? (
                      <View style={styles.activeDot}>
                        <View style={styles.innerDot} />
                      </View>
                    ) : (
                      <Circle size={22} color="rgba(255,255,255,0.25)" />
                    )}
                    {!isLast && (
                      <View
                        style={[
                          styles.line,
                          {
                            backgroundColor: done
                              ? "rgba(168,224,99,0.5)"
                              : "rgba(255,255,255,0.12)",
                          },
                        ]}
                      />
                    )}
                  </View>
                  <View
                    style={[styles.stepInfo, isLast && { paddingBottom: 0 }]}
                  >
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: done
                            ? colors.accent
                            : active
                              ? "#fff"
                              : "rgba(255,255,255,0.35)",
                        },
                      ]}
                    >
                      {STEP_LABELS[step]}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </BlurView>

        {/* Order items */}
        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 12 }]}
        >
          <View style={styles.cardInner}>
            <Text style={styles.sectionTitle}>Items ordered</Text>
            {order?.order_items?.map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemName}>
                  {item.store_product?.product?.name}
                </Text>
                <Text style={styles.itemQty}>x{item.quantity}</Text>
                <Text style={styles.itemPrice}>
                  ₱{(item.unit_price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.itemRow}>
              <Text
                style={[styles.itemName, { color: "#fff", fontWeight: "700" }]}
              >
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

        {/* Delivery address */}
        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 12 }]}
        >
          <View style={styles.cardInner}>
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <Text
              style={{ color: colors.textMuted, fontSize: 13, lineHeight: 20 }}
            >
              {order?.delivery_address}
            </Text>
          </View>
        </BlurView>
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
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(168,224,99,0.2)",
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.35)",
    marginBottom: 18,
  },
  statusText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 13,
    textTransform: "capitalize",
  },
  stepRow: { flexDirection: "row", gap: 14 },
  stepCol: { alignItems: "center" },
  line: { width: 2, flex: 1, minHeight: 20, marginTop: 2 },
  activeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(168,224,99,0.5)",
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  stepInfo: { paddingBottom: 20, flex: 1, justifyContent: "center" },
  stepLabel: { fontSize: 13, fontWeight: "600" },
  sectionTitle: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  itemName: { color: colors.textMuted, fontSize: 13, flex: 1 },
  itemQty: { color: colors.textMuted, fontSize: 13, marginHorizontal: 8 },
  itemPrice: { color: "#fff", fontSize: 13 },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    marginVertical: 10,
  },
});
