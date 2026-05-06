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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { useCartStore } from "../../src/stores/cartStore";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { ChevronLeft, MapPin, FileText, CreditCard } from "lucide-react-native";

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCartStore();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOrder = async () => {
    if (!address.trim())
      return Alert.alert("Error", "Please enter your delivery address");

    if (items.length === 0)
      return Alert.alert("Error", "Your cart is empty");

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "Please sign in to place an order");
        setLoading(false);
        return;
      }

      // Get store_id from first cart item
      const storeId = items[0]?.store_product_id;

      // Fetch actual store_id from store_products
      const { data: storeProduct } = await supabase
        .from("store_products")
        .select("store_id")
        .eq("id", storeId)
        .single();

      const actualStoreId = storeProduct?.store_id;

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          store_id: actualStoreId,
          status: "pending",
          total_amount: total() + 50,
          delivery_address: address.trim(),
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (error || !order) {
        console.error("Order error:", error);
        Alert.alert("Error", "Failed to place order. Please try again.");
        setLoading(false);
        return;
      }

      // Insert order items
      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((item) => ({
          order_id: order.id,
          store_product_id: item.store_product_id,
          quantity: item.quantity,
          unit_price: item.price,
        }))
      );

      if (itemsError) {
        console.error("Order items error:", itemsError);
        Alert.alert("Warning", "Order placed but items may be incomplete.");
      }

      await clearCart();
      setLoading(false);

      Alert.alert(
        "Order placed! 🎉",
        "Your order has been received successfully.",
        [
          {
            text: "Track order",
            onPress: () => router.replace("/(customer)/orders"),
          },
          {
            text: "Continue shopping",
            onPress: () => router.replace("/(customer)"),
          },
        ]
      );
    } catch (err) {
      console.error("Checkout error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <GreenScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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

          {/* Delivery Address */}
          <BlurView intensity={30} tint="light" style={styles.card}>
            <View style={styles.cardInner}>
              <View style={styles.sectionHeader}>
                <MapPin size={18} color={colors.accent} />
                <Text style={styles.sectionTitle}>Delivery address</Text>
              </View>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your full delivery address"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={[styles.sectionHeader, { marginTop: 16 }]}>
                <FileText size={18} color={colors.accent} />
                <Text style={styles.sectionTitle}>Special notes</Text>
              </View>
              <TextInput
                style={styles.input}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special instructions? (optional)"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>
          </BlurView>

          {/* Order Summary */}
          <BlurView
            intensity={30}
            tint="light"
            style={[styles.card, { marginTop: 12 }]}
          >
            <View style={styles.cardInner}>
              <View style={styles.sectionHeader}>
                <CreditCard size={18} color={colors.accent} />
                <Text style={styles.sectionTitle}>Order summary</Text>
              </View>

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
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryVal}>₱{total().toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery fee</Text>
                <Text style={styles.summaryVal}>₱50.00</Text>
              </View>

              <View style={styles.divider} />

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

          {/* Payment Method Note */}
          <BlurView
            intensity={20}
            tint="light"
            style={[styles.card, { marginTop: 12 }]}
          >
            <View style={styles.cardInner}>
              <Text style={styles.noteText}>
                💰 Payment will be collected upon delivery (Cash on Delivery)
              </Text>
            </View>
          </BlurView>

          <TouchableOpacity
            style={[styles.placeBtn, loading && styles.placeBtnDisabled]}
            onPress={handleOrder}
            disabled={loading || items.length === 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.placeBtnText}>Place order</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    minHeight: 80,
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
  noteText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
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
  placeBtnDisabled: {
    opacity: 0.6,
  },
  placeBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});