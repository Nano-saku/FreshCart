import { useState, useEffect } from "react";
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
import { useAuthStore } from "../../src/stores/authStore";
import { router } from "expo-router";
import {
  ChevronLeft,
  MapPin,
  FileText,
  CreditCard,
  Truck,
  CheckCircle2,
  Phone,
} from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";

type PaymentMethod = "cash_on_delivery" | "bank_transfer";

interface SavedAddress {
  id: string;
  label: string;
  full_address: string;
  phone: string | null;
  is_default: boolean;
}

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
  const { user } = useAuthStore();
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: shipping, 2: address, 3: payment, 4: success
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const shipping = SHIPPING_METHODS.find((s) => s.id === selectedShipping);
  const deliveryFee = shipping?.price || 5.0;
  const grandTotal = total() + deliveryFee;

  // Fetch saved addresses when stepping into step 2
  useEffect(() => {
    if (step !== 2 || !user) return;
    supabase
      .from("delivery_addresses")
      .select("id, label, full_address, phone, is_default")
      .eq("customer_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = data || [];
        setSavedAddresses(list);
        // Auto-select default if address not yet chosen
        if (!address && list.length > 0) {
          const def = list.find((a) => a.is_default) || list[0];
          setSelectedAddressId(def.id);
          setAddress(def.full_address);
          setShowManualInput(false);
        } else if (!address) {
          setShowManualInput(true);
        }
      });
  }, [step, user]);

  const handleOrder = async () => {
    if (!address.trim())
      return Alert.alert("Error", "Please enter your delivery address");
    if (items.length === 0) return Alert.alert("Error", "Your cart is empty");
    if (!user) {
      Alert.alert("Error", "Please sign in to place an order");
      return;
    }

    setLoading(true);
    try {
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
          payment_method: paymentMethod,
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

      if (itemsError) console.error("Order items error:", itemsError);

      await clearCart();
      setLoading(false);
      setStep(4);
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
            <CheckCircle2 size={64} color={theme.primary} />
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
              <ChevronLeft size={20} color={theme.textPrimary} />
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
                          ? theme.primary
                          : theme.textMuted
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

              {/* Saved address cards */}
              {savedAddresses.length > 0 && !showManualInput && (
                <>
                  {savedAddresses.map((addr) => {
                    const active = selectedAddressId === addr.id;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[
                          styles.savedAddrCard,
                          active && { borderColor: theme.primary, backgroundColor: theme.primary + "06" },
                        ]}
                        onPress={() => {
                          setSelectedAddressId(addr.id);
                          setAddress(addr.full_address);
                        }}
                      >
                        <View style={styles.savedAddrRow}>
                          <View style={[styles.savedAddrChip, { backgroundColor: theme.primary + "12" }]}>
                            <MapPin size={12} color={theme.primary} />
                            <Text style={[styles.savedAddrLabel, { color: theme.primary }]}>{addr.label}</Text>
                          </View>
                          {addr.is_default && (
                            <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
                              <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                          )}
                          <View style={[styles.radio, active && { borderColor: theme.primary }]}>
                            {active && <View style={[styles.radioFill, { backgroundColor: theme.primary }]} />}
                          </View>
                        </View>
                        <Text style={[styles.savedAddrText, { color: theme.textPrimary }]} numberOfLines={2}>
                          {addr.full_address}
                        </Text>
                        {addr.phone ? (
                          <View style={styles.savedAddrPhone}>
                            <Phone size={12} color={theme.textMuted} />
                            <Text style={[styles.savedAddrPhoneText, { color: theme.textSecondary }]}>{addr.phone}</Text>
                          </View>
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={styles.enterDiffBtn}
                    onPress={() => { setSelectedAddressId(null); setAddress(""); setShowManualInput(true); }}
                  >
                    <Text style={[styles.enterDiffText, { color: theme.primary }]}>+ Enter a different address</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Manual input — shown when no saved addresses, or user opts in */}
              {(savedAddresses.length === 0 || showManualInput) && (
                <>
                  {savedAddresses.length > 0 && (
                    <TouchableOpacity
                      style={styles.enterDiffBtn}
                      onPress={() => { setShowManualInput(false); const def = savedAddresses.find((a) => a.is_default) || savedAddresses[0]; setSelectedAddressId(def.id); setAddress(def.full_address); }}
                    >
                      <Text style={[styles.enterDiffText, { color: theme.primary }]}>← Use a saved address</Text>
                    </TouchableOpacity>
                  )}
                  <View style={styles.inputCard}>
                    <View style={styles.inputHeader}>
                      <MapPin size={18} color={theme.primary} />
                      <Text style={styles.inputTitle}>Enter your address</Text>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={address}
                      onChangeText={setAddress}
                      placeholder="House no., Street, Barangay, City"
                      placeholderTextColor={theme.textMuted}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </>
              )}

              <View style={styles.inputCard}>
                <View style={styles.inputHeader}>
                  <FileText size={18} color={theme.primary} />
                  <Text style={styles.inputTitle}>Special notes (optional)</Text>
                </View>
                <TextInput
                  style={styles.input}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any special instructions?"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(3)}>
                  <Text style={styles.primaryBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Payment & Summary */}
          {step === 3 && (
            <>
              <Text style={styles.sectionLabel}>Payment Method</Text>
              {/* Cash on Delivery */}
              <TouchableOpacity
                style={[styles.paymentCard, paymentMethod === "cash_on_delivery" && { borderColor: theme.primary, borderWidth: 2 }]}
                onPress={() => setPaymentMethod("cash_on_delivery")}
                activeOpacity={0.8}
              >
                <View style={styles.paymentOption}>
                  <View style={[styles.paymentIcon, { backgroundColor: theme.primary + "10" }]}>
                    <CreditCard size={22} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentTitle}>Cash on Delivery</Text>
                    <Text style={styles.paymentSub}>Pay when you receive</Text>
                  </View>
                  <View style={[styles.radioActive, paymentMethod === "cash_on_delivery" && { borderColor: theme.primary }]}>
                    {paymentMethod === "cash_on_delivery" && <View style={styles.radioInner} />}
                  </View>
                </View>
              </TouchableOpacity>
              {/* Bank/E-bank — Coming Soon */}
              <View style={[styles.paymentCard, { opacity: 0.45 }]}>
                <View style={styles.paymentOption}>
                  <View style={[styles.paymentIcon, { backgroundColor: theme.textMuted + "15" }]}>
                    <CreditCard size={22} color={theme.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentTitle, { color: theme.textMuted }]}>Bank / E-Wallet</Text>
                    <Text style={styles.paymentSub}>Coming soon</Text>
                  </View>
                  <View style={[styles.radioActive, { borderColor: theme.border }]} />
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
                    <ActivityIndicator color={theme.textPrimary} />
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

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) =>  StyleSheet.create({
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
    backgroundColor: theme.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    color: theme.textPrimary,
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
    backgroundColor: theme.background,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressDotActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  progressNum: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.textMuted,
  },
  progressNumActive: {
    color: theme.textMuted,
  },
  progressLabel: {
    fontSize: 11,
    color: theme.textMuted,
    marginLeft: 6,
    fontWeight: "500",
  },
  progressLabelActive: {
    color: theme.primary,
    fontWeight: "700",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: theme.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: theme.primary,
  },
  sectionLabel: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
    marginTop: 8,
  },
  shippingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.border,
  },
  shippingCardActive: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + "05",
  },
  shippingLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  shippingName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  shippingNameActive: {
    color: theme.primary,
  },
  shippingTime: {
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  shippingPrice: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  shippingPriceActive: {
    color: theme.primary,
  },
  inputCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    shadowColor: theme.shadowColor,
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
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  input: {
    backgroundColor: theme.background,
    borderRadius: 12,
    padding: 14,
    color: theme.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: theme.border,
    minHeight: 80,
  },
  paymentCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: theme.shadowColor,
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
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  paymentSub: {
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  radioActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.primary,
  },
  summaryCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: theme.shadowColor,
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
    color: theme.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  summaryItemPrice: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: theme.divider,
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  summaryVal: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  totalLabel: {
    color: theme.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  totalVal: {
    color: theme.primary,
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
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: theme.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  secondaryBtnText: {
    color: theme.textSecondary,
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
    backgroundColor: theme.primary + "10",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: "800",
  },
  successSub: {
    color: theme.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 24,
  },
  // ── Saved address picker (step 2) ───────────────────────────────────────
  savedAddrCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
    padding: 14,
    marginBottom: 10,
  },
  savedAddrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  savedAddrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  savedAddrLabel: { fontSize: 11, fontWeight: "700" },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  defaultBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  radio: {
    marginLeft: "auto",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioFill: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  savedAddrText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
  savedAddrPhone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  savedAddrPhoneText: { fontSize: 12 },
  enterDiffBtn: { paddingVertical: 10, alignItems: "center", marginBottom: 8 },
  enterDiffText: { fontSize: 13, fontWeight: "600" },
});
