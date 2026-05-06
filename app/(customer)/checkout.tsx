import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { useCartStore } from "../../src/stores/cartStore";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCartStore();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOrder = async () => {
    if (!address.trim())
      return Alert.alert("Error", "Please enter your delivery address");
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const storeId = items[0]?.store_product_id; // simplified: single store
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: user.id,
        store_id: storeId,
        status: "pending",
        total_amount: total() + 50,
        delivery_address: address,
        notes,
      })
      .select()
      .single();

    if (error || !order) {
      Alert.alert("Error", "Failed to place order");
      setLoading(false);
      return;
    }

    await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        store_product_id: item.store_product_id,
        quantity: item.quantity,
        unit_price: item.price,
      })),
    );

    await clearCart();
    setLoading(false);
    Alert.alert("Order placed! 🎉", "Your order has been received.", [
      {
        text: "Track order",
        onPress: () => router.replace("/(customer)/orders"),
      },
    ]);
  };

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
          <Text style={styles.title}>Checkout</Text>
          <View style={{ width: 38 }} />
        </View>

        <BlurView intensity={30} tint="light" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.sectionTitle}>Delivery address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter your full delivery address"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
            />
            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>
              Special notes
            </Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any special instructions? (optional)"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </BlurView>

        <BlurView
          intensity={30}
          tint="light"
          style={[styles.card, { marginTop: 12 }]}
        >
          <View style={styles.cardInner}>
            <Text style={styles.sectionTitle}>Order summary</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  {item.product.name} x{item.quantity}
                </Text>
                <Text style={styles.summaryVal}>
                  ₱{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={styles.summaryVal}>₱50.00</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text
                style={[
                  styles.summaryLabel,
                  { color: "#fff", fontWeight: "700", fontSize: 15 },
                ]}
              >
                Total
              </Text>
              <Text
                style={[
                  styles.summaryVal,
                  { color: colors.accent, fontWeight: "700", fontSize: 17 },
                ]}
              >
                ₱{(total() + 50).toFixed(2)}
              </Text>
            </View>
          </View>
        </BlurView>

        <TouchableOpacity
          style={styles.placeBtn}
          onPress={handleOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.placeBtnText}>Place order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
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
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: { backgroundColor: colors.glass, padding: 18 },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: { color: colors.textMuted, fontSize: 13 },
  summaryVal: { color: "#fff", fontSize: 13 },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    marginVertical: 10,
  },
  placeBtn: {
    backgroundColor: colors.primary,
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  placeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
