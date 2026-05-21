import { useState, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Switch,
} from "react-native";
import { router } from "expo-router";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { logger } from "../../src/lib/logger"
import { GeocodingService } from "../../src/services/geocoding";
import { LocationPicker } from '../../src/components/LocationPicker';
import { useTheme } from "../../src/contexts/ThemeContext";
import {
  ChevronLeft, MapPin, Phone, Plus, Trash2,
  Edit3, CheckCircle2, Home, Briefcase, MoreHorizontal,
} from "lucide-react-native";
import { useMemo } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────
type AddressLabel = "Home" | "Work" | "Other";

interface DeliveryAddress {
  id: string;
  customer_id: string;
  label: AddressLabel;
  full_address: string;
  phone: string | null;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

interface AddressFormData {
  label: AddressLabel;
  full_address: string;
  phone: string;
  is_default: boolean;
  latitude: number | null;
  longitude: number | null;
}

const LABELS: AddressLabel[] = ["Home", "Work", "Other"];

const LABEL_ICON = {
  Home: Home,
  Work: Briefcase,
  Other: MoreHorizontal,
};

const emptyForm = (): AddressFormData => ({
  label: "Home",
  full_address: "",
  phone: "",
  is_default: false,
  latitude: null,
  longitude: null,
});

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function AddressesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user } = useAuthStore();

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<DeliveryAddress | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm());
  const [showMapPicker, setShowMapPicker] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("delivery_addresses")
      .select("*")
      .eq("customer_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) logger.error("Fetch addresses error:", error);
    else setAddresses(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAddresses(); }, [fetchAddresses]);

  // ── Open modal ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (addr: DeliveryAddress) => {
    setEditTarget(addr);
    setForm({
      label: addr.label,
      full_address: addr.full_address,
      phone: addr.phone || "",
      is_default: addr.is_default,
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    });
    setShowModal(true);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.full_address.trim()) {
      Alert.alert("Required", "Please enter a delivery address.");
      return;
    }
    if (!user) return;
    setSaving(true);

    try {
      let coords = null;

      // If coordinates already set from map picker, use those
      if (form.latitude && form.longitude) {
        coords = { latitude: form.latitude, longitude: form.longitude };
      } else {
        // Otherwise geocode the address
        coords = await GeocodingService.addressToCoordinates(form.full_address.trim());
      }

      const payload = {
        label: form.label,
        full_address: form.full_address.trim(),
        phone: form.phone.trim() || null,
        is_default: form.is_default,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
      };

      if (form.is_default) {
        await supabase
          .from("delivery_addresses")
          .update({ is_default: false })
          .eq("customer_id", user.id);
      }

      if (editTarget) {
        const { error } = await supabase
          .from("delivery_addresses")
          .update(payload)
          .eq("id", editTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("delivery_addresses")
          .insert({ ...payload, customer_id: user.id });
        if (error) throw error;
      }

      setShowModal(false);
      await fetchAddresses();
    } catch (err) {
      logger.error("Save address error:", err);
      Alert.alert("Error", "Failed to save address. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Set default ───────────────────────────────────────────────────────────
  const handleSetDefault = async (addr: DeliveryAddress) => {
    if (addr.is_default || !user) return;
    try {
      await supabase
        .from("delivery_addresses")
        .update({ is_default: false })
        .eq("customer_id", user.id);
      await supabase
        .from("delivery_addresses")
        .update({ is_default: true })
        .eq("id", addr.id);
      await fetchAddresses();
    } catch (err) {
      Alert.alert("Error", "Failed to set default address.");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = (addr: DeliveryAddress) => {
    Alert.alert(
      "Delete Address",
      `Remove "${addr.label}" address?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("delivery_addresses")
              .delete()
              .eq("id", addr.id);
            if (error) Alert.alert("Error", "Failed to delete address.");
            else fetchAddresses();
          },
        },
      ]
    );
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AppScreen>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery Addresses</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={openAdd}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "12" }]}>
            <MapPin size={48} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>No saved addresses</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Add a delivery address so checkout is quicker next time.
          </Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={openAdd}>
            <Plus size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Add Address</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
          {addresses.map((addr) => {
            const LabelIcon = LABEL_ICON[addr.label] || MoreHorizontal;
            return (
              <View key={addr.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: addr.is_default ? theme.primary + "50" : theme.border }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.labelChip, { backgroundColor: theme.primary + "12" }]}>
                    <LabelIcon size={14} color={theme.primary} />
                    <Text style={[styles.labelText, { color: theme.primary }]}>{addr.label}</Text>
                  </View>
                  {addr.is_default && (
                    <View style={[styles.defaultBadge, { backgroundColor: theme.primary }]}>
                      <CheckCircle2 size={12} color="#fff" />
                      <Text style={styles.defaultBadgeText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.addressText, { color: theme.textPrimary }]} numberOfLines={3}>
                  {addr.full_address}
                </Text>
                {addr.phone ? (
                  <View style={styles.phoneRow}>
                    <Phone size={13} color={theme.textMuted} />
                    <Text style={[styles.phoneText, { color: theme.textSecondary }]}>{addr.phone}</Text>
                  </View>
                ) : null}
                <View style={[styles.cardActions, { borderTopColor: theme.divider }]}>
                  {!addr.is_default && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleSetDefault(addr)}>
                      <CheckCircle2 size={15} color={theme.primary} />
                      <Text style={[styles.actionText, { color: theme.primary }]}>Set default</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(addr)}>
                    <Edit3 size={15} color={theme.textSecondary} />
                    <Text style={[styles.actionText, { color: theme.textSecondary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(addr)}>
                    <Trash2 size={15} color={theme.error} />
                    <Text style={[styles.actionText, { color: theme.error }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* ── Add / Edit Modal ──────────────────────────────────────────────── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalKav}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
              <View style={[styles.modalHandle, { backgroundColor: theme.border }]} />

              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
                {editTarget ? "Edit Address" : "New Address"}
              </Text>

              {/* Label picker */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Label</Text>
              <View style={styles.labelRow}>
                {LABELS.map((lbl) => {
                  const Icon = LABEL_ICON[lbl];
                  const active = form.label === lbl;
                  return (
                    <TouchableOpacity
                      key={lbl}
                      style={[styles.labelOption, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary + "10" : theme.background }]}
                      onPress={() => setForm((f) => ({ ...f, label: lbl }))}
                    >
                      <Icon size={16} color={active ? theme.primary : theme.textMuted} />
                      <Text style={[styles.labelOptionText, { color: active ? theme.primary : theme.textMuted }]}>{lbl}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Map Picker Button */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Full Address</Text>
              <TouchableOpacity
                style={[styles.mapPickerBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
                onPress={() => setShowMapPicker(true)}
              >
                <MapPin size={18} color={theme.primary} />
                <Text style={[styles.mapPickerText, { color: theme.primary }]}>
                  {form.latitude ? '📍 Location Selected - Tap to Change' : 'Pick Location on Map'}
                </Text>
              </TouchableOpacity>

              {/* Address input */}
              <TextInput
                style={[styles.input, styles.inputMulti, { color: theme.textPrimary, backgroundColor: theme.background, borderColor: theme.border }]}
                value={form.full_address}
                onChangeText={(t) => setForm((f) => ({ ...f, full_address: t }))}
                placeholder="Or type address manually"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Phone input */}
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Phone Number (optional)</Text>
              <View style={[styles.phoneInputRow, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Phone size={16} color={theme.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.phoneInput, { color: theme.textPrimary }]}
                  value={form.phone}
                  onChangeText={(t) => setForm((f) => ({ ...f, phone: t }))}
                  placeholder="+63 900 000 0000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Set as default toggle */}
              <View style={styles.toggleRow}>
                <Text style={[styles.toggleLabel, { color: theme.textPrimary }]}>Set as default address</Text>
                <Switch
                  value={form.is_default}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_default: v }))}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={form.is_default ? theme.surface : theme.textMuted}
                />
              </View>

              {/* Buttons */}
              <View style={styles.modalBtns}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }, saving && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide">
        <LocationPicker
          initialLatitude={form.latitude || undefined}
          initialLongitude={form.longitude || undefined}
          onLocationSelect={(location) => {
            setForm((f) => ({
              ...f,
              full_address: location.address,
              latitude: location.latitude,
              longitude: location.longitude,
            }));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />
      </Modal>
    </AppScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 12,
      borderWidth: 1, borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: "center", justifyContent: "center",
    },
    title: {
      fontSize: 20, fontWeight: "700", color: theme.textPrimary,
    },
    addBtn: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: "center", justifyContent: "center",
    },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyContainer: {
      flex: 1, alignItems: "center", justifyContent: "center",
      paddingHorizontal: 24, gap: 16,
    },
    emptyIcon: {
      width: 100, height: 100, borderRadius: 50,
      alignItems: "center", justifyContent: "center", marginBottom: 8,
    },
    emptyTitle: { fontSize: 22, fontWeight: "700" },
    emptySubtitle: {
      fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 8,
    },
    primaryBtn: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14,
    },
    primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    listContent: { paddingBottom: 8 },
    card: {
      borderRadius: 16, borderWidth: 1.5,
      marginBottom: 14, overflow: "hidden",
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1, shadowRadius: 6, elevation: 2,
    },
    cardHeader: {
      flexDirection: "row", alignItems: "center", gap: 8,
      paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    },
    labelChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
    },
    labelText: { fontSize: 12, fontWeight: "600" },
    defaultBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    },
    defaultBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
    addressText: {
      fontSize: 14, lineHeight: 21, fontWeight: "500",
      paddingHorizontal: 16, paddingBottom: 8,
    },
    phoneRow: {
      flexDirection: "row", alignItems: "center", gap: 6,
      paddingHorizontal: 16, paddingBottom: 12,
    },
    phoneText: { fontSize: 13 },
    cardActions: {
      flexDirection: "row", borderTopWidth: 1,
      paddingVertical: 10, paddingHorizontal: 8,
    },
    actionBtn: {
      flex: 1, flexDirection: "row", alignItems: "center",
      justifyContent: "center", gap: 5, paddingVertical: 4,
    },
    actionText: { fontSize: 13, fontWeight: "600" },
    modalOverlay: {
      flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    modalKav: { justifyContent: "flex-end" },
    modalSheet: {
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 24, paddingBottom: 36,
      shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15, shadowRadius: 16, elevation: 10,
    },
    modalHandle: {
      width: 40, height: 4, borderRadius: 2,
      alignSelf: "center", marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20 },
    fieldLabel: {
      fontSize: 12, fontWeight: "600", textTransform: "uppercase",
      letterSpacing: 0.8, marginBottom: 8,
    },
    labelRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
    labelOption: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
    },
    labelOptionText: { fontSize: 13, fontWeight: "600" },
    input: {
      borderRadius: 12, borderWidth: 1, padding: 14,
      fontSize: 14, marginBottom: 16,
    },
    inputMulti: { minHeight: 84, textAlignVertical: "top" },
    phoneInputRow: {
      flexDirection: "row", alignItems: "center",
      borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
      marginBottom: 16,
    },
    phoneInput: { flex: 1, paddingVertical: 14, fontSize: 14 },
    toggleRow: {
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", marginBottom: 24,
      paddingVertical: 4,
    },
    toggleLabel: { fontSize: 15, fontWeight: "500" },
    modalBtns: { flexDirection: "row", gap: 12 },
    cancelBtn: {
      flex: 1, paddingVertical: 15, borderRadius: 14,
      alignItems: "center", borderWidth: 1,
    },
    cancelBtnText: { fontSize: 15, fontWeight: "600" },
    saveBtn: {
      flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: "center",
    },
    saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    mapPickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 12,
    },
    mapPickerText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });