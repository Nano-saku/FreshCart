import { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useCartStore } from "../../src/stores/cartStore";
import { useAuthStore } from "../../src/stores/authStore";
import { router } from "expo-router";
import {
  ChevronLeft, MapPin, FileText, CreditCard,
  Truck, CheckCircle2, Phone,
} from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { logger } from "../../src/lib/logger";

type PaymentMethod = "cash_on_delivery" | "bank_transfer";

interface SavedAddress {
  id: string;
  label: string;
  full_address: string;
  phone: string | null;
  is_default: boolean;
}

const SHIPPING_METHODS = [
  { id: "standard", name: "Standard", price: 50, time: "3-5 business days" },
  { id: "same_day", name: "Same Day", price: 120, time: "Before 6pm today" },
  { id: "pick_date", name: "Scheduled", price: 150, time: "Choose your delivery" },
];

const CURRENCY = "₱";

export default function CheckoutScreen() {
  const { items, total, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [placedOrderId, setPlacedOrderId] = useState<string | null>(null);

  const shipping = SHIPPING_METHODS.find((s) => s.id === selectedShipping);
  const deliveryFee = shipping?.price ?? 50;
  const subtotal = total();
  const grandTotal = subtotal + deliveryFee;

  // Guard: validate cart is single-store before allowing checkout
  const storeIds = [...new Set(
    items.map((i) => (i as any).store_id).filter(Boolean)
  )];
  const isMultiStore = storeIds.length > 1;

  useEffect(() => {
    if (step !== 2 || !user) return;
    supabase
      .from("delivery_addresses")
      .select("id, label, full_address, phone, is_default")
      .eq("customer_id", user.id)
      .order("is_default", { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setSavedAddresses(list);
        if (!address && list.length > 0) {
          const def = list.find((a) => a.is_default) ?? list[0];
          setSelectedAddressId(def.id);
          setAddress(def.full_address);
          setShowManualInput(false);
        } else if (!address) {
          setShowManualInput(true);
        }
      });
  }, [step, user]);

  const handleOrder = async () => {
    if (!address.trim()) return Alert.alert("Required", "Please enter a delivery address.");
    if (items.length === 0) return Alert.alert("Error", "Your cart is empty.");
    if (!user) return Alert.alert("Sign In Required", "Please sign in to place an order.");
    if (isMultiStore) {
      return Alert.alert(
        "Multiple Stores",
        "Your cart has items from different stores. Please keep items from one store per order.",
      );
    }

    setLoading(true);
    try {
      // Get store_id from the first cart item's store_product
      const { data: sp, error: spErr } = await supabase
        .from("store_products")
        .select("store_id")
        .eq("id", items[0].store_product_id)
        .single();

      if (spErr || !sp) throw new Error("Could not resolve store.");

      // Insert order
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          store_id: sp.store_id,
          status: "pending",
          total_amount: grandTotal,
          delivery_address: address.trim(),
          payment_method: paymentMethod,
          notes: notes.trim() || null,
        })
        .select()
        .single();

      if (orderErr || !order) throw new Error(orderErr?.message ?? "Order creation failed.");

      // Insert order items
      const { error: itemsErr } = await supabase.from("order_items").insert(
        items.map((item) => ({
          order_id: order.id,
          store_product_id: item.store_product_id,
          quantity: item.quantity,
          unit_price: item.price,
        }))
      );

      if (itemsErr) throw new Error(itemsErr.message);

      // Decrement stock for each item atomically
      await Promise.all(
        items.map((item) =>
          supabase.rpc("decrement_stock", {
            p_store_product_id: item.store_product_id,
            p_quantity: item.quantity,
          })
        )
      );

      await clearCart();
      setPlacedOrderId(order.id);
      setStep(4);
    } catch (err: any) {
      logger.error("Checkout error:", err);
      Alert.alert("Order Failed", err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (step === 4) {
    return (
      <AppScreen>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: theme.primary + "15" }]}>
            <CheckCircle2 size={64} color={theme.primary} />
          </View>
          <Text style={[styles.successTitle, { color: theme.textPrimary }]}>Order Placed!</Text>
          <Text style={[styles.successSub, { color: theme.textSecondary }]}>
            Your order has been placed successfully. The seller will confirm it shortly.
          </Text>
          {placedOrderId && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              onPress={() => router.replace(`/(customer)/order/${placedOrderId}`)}
            >
              <Text style={styles.primaryBtnText}>Track Your Order</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={() => router.replace("/(customer)")}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity style={[styles.backBtn, { backgroundColor: theme.background, borderColor: theme.border }]} onPress={() => (step === 1 ? router.back() : setStep(step - 1))}>
              <ChevronLeft size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Checkout</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Multi-store warning */}
          {isMultiStore && (
            <View style={[styles.warningBox, { backgroundColor: theme.warning + "15", borderColor: theme.warning + "40" }]}>
              <Text style={[styles.warningText, { color: theme.warning }]}>
                ⚠️ Your cart has items from multiple stores. Please remove items so all items are from the same store before checking out.
              </Text>
            </View>
          )}

          {/* Progress */}
          <View style={styles.progressRow}>
            {["Shipping", "Address", "Payment"].map((label, i) => (
              <View key={label} style={styles.progressItem}>
                <View style={[styles.progressDot, { borderColor: theme.border, backgroundColor: theme.background }, i < step && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  <Text style={[styles.progressNum, { color: theme.textMuted }, i < step && { color: "#fff" }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.progressLabel, { color: theme.textMuted }, i < step && { color: theme.primary, fontWeight: "700" }]}>{label}</Text>
                {i < 2 && <View style={[styles.progressLine, { backgroundColor: theme.border }, i < step - 1 && { backgroundColor: theme.primary }]} />}
              </View>
            ))}
          </View>

          {/* Step 1: Shipping */}
          {step === 1 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Shipping Method</Text>
              {SHIPPING_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[styles.shippingCard, { backgroundColor: theme.surface, borderColor: theme.border }, selectedShipping === method.id && { borderColor: theme.primary, backgroundColor: theme.primary + "05" }]}
                  onPress={() => setSelectedShipping(method.id)}
                >
                  <View style={styles.shippingLeft}>
                    <Truck size={22} color={selectedShipping === method.id ? theme.primary : theme.textMuted} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.shippingName, { color: theme.textPrimary }, selectedShipping === method.id && { color: theme.primary }]}>{method.name}</Text>
                      <Text style={[styles.shippingTime, { color: theme.textSecondary }]}>{method.time}</Text>
                    </View>
                  </View>
                  <Text style={[styles.shippingPrice, { color: theme.textPrimary }, selectedShipping === method.id && { color: theme.primary }]}>
                    {CURRENCY}{method.price.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }, isMultiStore && { opacity: 0.5 }]}
                onPress={() => setStep(2)}
                disabled={isMultiStore}
              >
                <Text style={styles.primaryBtnText}>Next</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Delivery Address</Text>
              {savedAddresses.length > 0 && !showManualInput && (
                <>
                  {savedAddresses.map((addr) => {
                    const active = selectedAddressId === addr.id;
                    return (
                      <TouchableOpacity
                        key={addr.id}
                        style={[styles.savedAddrCard, { backgroundColor: theme.surface, borderColor: theme.border }, active && { borderColor: theme.primary, backgroundColor: theme.primary + "06" }]}
                        onPress={() => { setSelectedAddressId(addr.id); setAddress(addr.full_address); }}
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
                          <View style={[styles.radio, { borderColor: active ? theme.primary : theme.border }]}>
                            {active && <View style={[styles.radioFill, { backgroundColor: theme.primary }]} />}
                          </View>
                        </View>
                        <Text style={[styles.savedAddrText, { color: theme.textPrimary }]} numberOfLines={2}>{addr.full_address}</Text>
                        {addr.phone && (
                          <View style={styles.savedAddrPhone}>
                            <Phone size={12} color={theme.textMuted} />
                            <Text style={[styles.savedAddrPhoneText, { color: theme.textSecondary }]}>{addr.phone}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity style={styles.toggleBtn} onPress={() => { setSelectedAddressId(null); setAddress(""); setShowManualInput(true); }}>
                    <Text style={[styles.toggleBtnText, { color: theme.primary }]}>+ Enter a different address</Text>
                  </TouchableOpacity>
                </>
              )}

              {(savedAddresses.length === 0 || showManualInput) && (
                <>
                  {savedAddresses.length > 0 && (
                    <TouchableOpacity style={styles.toggleBtn} onPress={() => {
                      setShowManualInput(false);
                      const def = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0];
                      setSelectedAddressId(def.id);
                      setAddress(def.full_address);
                    }}>
                      <Text style={[styles.toggleBtnText, { color: theme.primary }]}>← Use a saved address</Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.inputHeader}>
                      <MapPin size={18} color={theme.primary} />
                      <Text style={[styles.inputTitle, { color: theme.textPrimary }]}>Enter your address</Text>
                    </View>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
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

              <View style={[styles.inputCard, { backgroundColor: theme.surface }]}>
                <View style={styles.inputHeader}>
                  <FileText size={18} color={theme.primary} />
                  <Text style={[styles.inputTitle, { color: theme.textPrimary }]}>Special notes (optional)</Text>
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.textPrimary }]}
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
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={() => setStep(1)}>
                  <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.primary }, !address.trim() && { opacity: 0.5 }]}
                  onPress={() => setStep(3)}
                  disabled={!address.trim()}
                >
                  <Text style={styles.primaryBtnText}>Next</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: Payment + Summary */}
          {step === 3 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Payment Method</Text>
              <TouchableOpacity
                style={[styles.paymentCard, { backgroundColor: theme.surface }, paymentMethod === "cash_on_delivery" && { borderColor: theme.primary, borderWidth: 2 }]}
                onPress={() => setPaymentMethod("cash_on_delivery")}
              >
                <View style={styles.paymentOption}>
                  <View style={[styles.paymentIcon, { backgroundColor: theme.primary + "10" }]}>
                    <CreditCard size={22} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentTitle, { color: theme.textPrimary }]}>Cash on Delivery</Text>
                    <Text style={[styles.paymentSub, { color: theme.textSecondary }]}>Pay when you receive</Text>
                  </View>
                  <View style={[styles.radioCircle, { borderColor: paymentMethod === "cash_on_delivery" ? theme.primary : theme.border }]}>
                    {paymentMethod === "cash_on_delivery" && <View style={[styles.radioFill, { backgroundColor: theme.primary }]} />}
                  </View>
                </View>
              </TouchableOpacity>

              <View style={[styles.paymentCard, { backgroundColor: theme.surface, opacity: 0.45 }]}>
                <View style={styles.paymentOption}>
                  <View style={[styles.paymentIcon, { backgroundColor: theme.border }]}>
                    <CreditCard size={22} color={theme.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.paymentTitle, { color: theme.textMuted }]}>Bank / E-Wallet</Text>
                    <Text style={[styles.paymentSub, { color: theme.textMuted }]}>Coming soon</Text>
                  </View>
                </View>
              </View>

              <Text style={[styles.sectionLabel, { color: theme.textPrimary }]}>Order Summary</Text>
              <View style={[styles.summaryCard, { backgroundColor: theme.surface }]}>
                {items.map((item) => (
                  <View key={item.id} style={styles.summaryItem}>
                    <Text style={[styles.summaryItemName, { color: theme.textSecondary }]} numberOfLines={1}>
                      {item.product.name} ×{item.quantity}
                    </Text>
                    <Text style={[styles.summaryItemPrice, { color: theme.textPrimary }]}>
                      {CURRENCY}{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.divider, { borderTopColor: theme.divider }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>{CURRENCY}{subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Delivery ({shipping?.name})</Text>
                  <Text style={[styles.summaryVal, { color: theme.textPrimary }]}>{CURRENCY}{deliveryFee.toFixed(2)}</Text>
                </View>
                <View style={[styles.divider, { borderTopColor: theme.divider }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.totalLabel, { color: theme.textPrimary }]}>Total</Text>
                  <Text style={[styles.totalVal, { color: theme.primary }]}>{CURRENCY}{grandTotal.toFixed(2)}</Text>
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={() => setStep(2)}>
                  <Text style={[styles.secondaryBtnText, { color: theme.textSecondary }]}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: theme.primary }, (loading || items.length === 0) && { opacity: 0.6 }]}
                  onPress={handleOrder}
                  disabled={loading || items.length === 0}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Place Order</Text>}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  warningBox: { borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1 },
  warningText: { fontSize: 13, lineHeight: 20 },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 28, paddingHorizontal: 8 },
  progressItem: { flexDirection: "row", alignItems: "center", flex: 1 },
  progressDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  progressNum: { fontSize: 12, fontWeight: "700" },
  progressLabel: { fontSize: 11, marginLeft: 6, fontWeight: "500" },
  progressLine: { flex: 1, height: 2, marginHorizontal: 8 },
  sectionLabel: { fontSize: 18, fontWeight: "700", marginBottom: 16, marginTop: 8 },
  shippingCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 2 },
  shippingLeft: { flexDirection: "row", alignItems: "center" },
  shippingName: { fontSize: 15, fontWeight: "600" },
  shippingTime: { fontSize: 12, marginTop: 2 },
  shippingPrice: { fontSize: 16, fontWeight: "700" },
  inputCard: { borderRadius: 16, padding: 18, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  inputHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  inputTitle: { fontSize: 14, fontWeight: "600" },
  input: { borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, minHeight: 80 },
  paymentCard: { borderRadius: 16, padding: 16, marginBottom: 12, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  paymentOption: { flexDirection: "row", alignItems: "center", gap: 14 },
  paymentIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  paymentTitle: { fontSize: 15, fontWeight: "600" },
  paymentSub: { fontSize: 13, marginTop: 2 },
  radioCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  summaryCard: { borderRadius: 16, padding: 18, marginBottom: 20, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  summaryItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryItemName: { fontSize: 13, flex: 1 },
  summaryItemPrice: { fontSize: 13, fontWeight: "600" },
  divider: { borderTopWidth: 1, marginVertical: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  summaryLabel: { fontSize: 14 },
  summaryVal: { fontSize: 14, fontWeight: "600" },
  totalLabel: { fontWeight: "700", fontSize: 16 },
  totalVal: { fontWeight: "800", fontSize: 18 },
  btnRow: { flexDirection: "row", gap: 12, marginBottom: 30 },
  primaryBtn: { flex: 1, borderRadius: 16, padding: 18, alignItems: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: { flex: 1, borderRadius: 16, padding: 18, alignItems: "center", borderWidth: 1 },
  secondaryBtnText: { fontWeight: "600", fontSize: 16 },
  successContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16, paddingHorizontal: 24 },
  successIcon: { width: 120, height: 120, borderRadius: 60, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  successTitle: { fontSize: 28, fontWeight: "800" },
  successSub: { fontSize: 15, textAlign: "center", marginBottom: 24 },
  savedAddrCard: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  savedAddrRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  savedAddrChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  savedAddrLabel: { fontSize: 11, fontWeight: "700" },
  defaultBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  defaultBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  radio: { marginLeft: "auto", width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  savedAddrText: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
  savedAddrPhone: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  savedAddrPhoneText: { fontSize: 12 },
  toggleBtn: { paddingVertical: 10, alignItems: "center", marginBottom: 8 },
  toggleBtnText: { fontSize: 13, fontWeight: "600" },
});