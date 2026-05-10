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
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useCartStore } from "../../src/stores/cartStore";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import {
  ChevronLeft,
  MapPin,
  FileText,
  CreditCard,
  Truck,
  CheckCircle2,
} from "lucide-react-native";

const SHIPPING_METHODS = [
  { id: "standard", name: "Standard", price: 5.0, time: "3-5 business days" },
  { id: "same_day", name: "Same Day", price: 12.0, time: "Before 6pm" },
  {
    id: "pick_date",
    name: "Pick a Date",
    price: 15.0,
    time: "Choose your delivery",
  },
];

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCartStore();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: shipping, 2: address, 3: payment, 4: success

  const shipping = SHIPPING_METHODS.find((s) => s.id === selectedShipping);
  const deliveryFee = shipping?.price || 5.0;
  const grandTotal = total() + deliveryFee;

  const handleOrder = async () => {
    if (!address.trim())
      return Alert.alert("Error", "Please enter your delivery address");
    if (items.length === 0) return Alert.alert("Error", "Your cart is empty");

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

      const storeId = items[0]?.store_product_id;
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
          total_amount: grandTotal,
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

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((item) => ({
          order_id: order.id,
          store_product_id: item.store_product_id,
          quantity: item.quantity,
          unit_price: item.price,
        })),
      );

      if (itemsError) {
        console.error("Order items error:", itemsError);
      }

      await clearCart();
      setLoading(false);
      setStep(4); // Show success
    } catch (err) {
      console.error("Checkout error:", err);
      Alert.alert("Error", "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // Success screen
  if (step === 4) {
    return (
      <AppScreen>
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <CheckCircle2 size={64} color={colors.primary} />
          </View>
          <Text style={styles.successTitle}>Gotcha!</Text>
          <Text style={styles.successSub}>
            Your order has been placed successfully
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace("/(customer)/orders")}
          >
            <Text style={styles.primaryBtnText}>Track your order</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace("/(customer)")}
          >
            <Text style={styles.secondaryBtnText}>Back to home</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.back()}
            >
              <ChevronLeft size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Checkout</Text>
            <View style={{ width: 38 }} />
          </View>

          {/* Progress Steps */}
          <View style={styles.progressRow}>
            {["Shipping", "Address", "Payment"].map((label, i) => (
              <View key={label} style={styles.progressItem}>
                <View
                  style={[
                    styles.progressDot,
                    i < step && styles.progressDotActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.progressNum,
                      i < step && styles.progressNumActive,
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.progressLabel,
                    i < step && styles.progressLabelActive,
                  ]}
                >
                  {label}
                </Text>
                {i < 2 && (
                  <View
                    style={[
                      styles.progressLine,
                      i < step - 1 && styles.progressLineActive,
                    ]}
                  />
                )}
              </View>
            ))}
          </View>

          {/* Shipping Method */}
          {step === 1 && (
            <>
              <Text style={styles.sectionLabel}>Shipping Method</Text>
              {SHIPPING_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.shippingCard,
                    selectedShipping === method.id && styles.shippingCardActive,
                  ]}
                  onPress={() => setSelectedShipping(method.id)}
                >
                  <View style={styles.shippingLeft}>
                    <Truck
                      size={22}
                      color={
                        selectedShipping === method.id
                          ? colors.primary
                          : colors.textMuted
                      }
                    />
                    <View style={{ marginLeft: 12 }}>
                      <Text
                        style={[
                          styles.shippingName,
                          selectedShipping === method.id &&
                            styles.shippingNameActive,
                        ]}
                      >
                        {method.name}
                      </Text>
                      <Text style={styles.shippingTime}>{method.time}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.shippingPrice,
                      selectedShipping === method.id &&
                        styles.shippingPriceActive,
                    ]}
                  >
                    ${method.price.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setStep(2)}
              >
                <Text style={styles.primaryBtnText}>Next</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Address */}
          {step === 2 && (
            <>
              <Text style={styles.sectionLabel}>Delivery Address</Text>
              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <MapPin size={18} color={colors.primary} />
                  <Text style={styles.inputTitle}>Enter your address</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Full delivery address"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <FileText size={18} color={colors.primary} />
                  <Text style={styles.inputTitle}>
                    Special notes (optional)
                  </Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any special instructions?"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setStep(3)}
                >
                  <Text style={styles.primaryBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Payment & Summary */}
          {step === 3 && (
            <>
              <Text style={styles.sectionLabel}>Payment Method</Text>
              <View style={styles.paymentCard}>
                <View style={styles.paymentOption}>
                  <View
                    style={[
                      styles.paymentIcon,
                      { backgroundColor: colors.primary + "10" },
                    ]}
                  >
                    <CreditCard size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                    <Text style={styles.paymentSub}>Pay when you receive</Text>
                  </View>
                  <View style={styles.radioActive}>
                    <View style={styles.radioInner} />
                  </View>
                </View>
              </View>

              <Text style={styles.sectionLabel}>Order Summary</Text>
              <View style={styles.summaryCard}>
                {items.map((item) => (
                  <View key={item.id} style={styles.summaryItem}>
                    <Text style={styles.summaryItemName}>
                      {item.product.name} x{item.quantity}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      ${(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryVal}>${total().toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Delivery ({shipping?.name})
                  </Text>
                  <Text style={styles.summaryVal}>
                    ${deliveryFee.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalVal}>${grandTotal.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    loading && styles.primaryBtnDisabled,
                  ]}
                  onPress={handleOrder}
                  disabled={loading || items.length === 0}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textLight} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Place order</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  progressItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  progressNum: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
  },
  progressNumActive: {
    color: colors.textLight,
  },
  progressLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginLeft: 6,
    fontWeight: "500",
  },
  progressLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: colors.primary,
  },
  sectionLabel: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 8,
  },
  shippingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.border,
  },
  shippingCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "05",
  },
  shippingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  shippingName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  shippingNameActive: {
    color: colors.primary,
  },
  shippingTime: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  shippingPrice: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  shippingPriceActive: {
    color: colors.primary,
  },
  inputCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    color: colors.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 80,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  paymentSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  radioActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  summaryItemName: {
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  summaryItemPrice: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  summaryVal: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  totalLabel: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  totalVal: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 18,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 30,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: colors.textLight,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 16,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 24,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  successSub: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
});
