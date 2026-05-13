import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Switch,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { Plus, Pencil, Trash2, Store } from "lucide-react-native";
import { ImagePickerButton } from "../../src/components/ImagePickerButton";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function AdminStoresScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [stores, setStores] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editStore, setEditStore] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    logo_url: "",
    is_active: true,
  });

  const fetchStores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stores")
      .select("*, owner:profiles(full_name)")
      .order("name");

    if (error) {
      console.error("Fetch stores error:", error);
      Alert.alert("Error", "Failed to load stores");
    } else {
      setStores(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStores();
  }, []);


  const openEdit = (s: any) => {
    setEditStore(s);
    setForm({
      name: s.name || "",
      description: s.description || "",
      address: s.address || "",
      latitude: s.latitude?.toString() || "",
      longitude: s.longitude?.toString() || "",
      logo_url: s.logo_url || "",
      is_active: s.is_active ?? true,
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      return Alert.alert("Error", "Store name is required");
    }

    // Validate lat/lng if provided
    const lat = form.latitude ? parseFloat(form.latitude) : null;
    const lng = form.longitude ? parseFloat(form.longitude) : null;

    if (form.latitude && (isNaN(lat!) || lat! < -90 || lat! > 90)) {
      return Alert.alert("Error", "Latitude must be between -90 and 90");
    }
    if (form.longitude && (isNaN(lng!) || lng! < -180 || lng! > 180)) {
      return Alert.alert("Error", "Longitude must be between -180 and 180");
    }

    setSaving(true);

    const storeData = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      address: form.address.trim() || null,
      latitude: lat,
      longitude: lng,
      is_active: form.is_active,
    };

    try {
      if (editStore) {
        const { error } = await supabase
          .from("stores")
          .update(storeData)
          .eq("id", editStore.id);

        if (error) throw error;
        Alert.alert("Success", "Store updated");
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          throw new Error("Not authenticated");
        }

        const { error } = await supabase
          .from("stores")
          .insert({ ...storeData, owner_id: user.id });

        if (error) throw error;
        Alert.alert("Success", "Store created");
      }

      setModalVisible(false);
      fetchStores();
    } catch (error: any) {
      console.error("Save store error:", error);
      Alert.alert("Error", error.message || "Failed to save store");
    } finally {
      setSaving(false);
    }
  };

  const deleteStore = (id: string) =>
    Alert.alert(
      "Delete store",
      "This will remove the store and all its products. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error } = await supabase
              .from("stores")
              .delete()
              .eq("id", id);
            if (error) {
              Alert.alert("Error", "Failed to delete store");
            } else {
              fetchStores();
            }
          },
        },
      ],
    );

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("stores")
      .update({ is_active: !current })
      .eq("id", id);

    if (error) {
      Alert.alert("Error", "Failed to update status");
    } else {
      setStores((prev) =>
        prev.map((s) => (s.id === id ? { ...s, is_active: !current } : s)),
      );
    }
  };

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Stores</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.textPrimary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={stores}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <BlurView intensity={30} tint="light" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={styles.iconBox}>
                  <Store size={24} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.row}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        {
                          backgroundColor: item.is_active
                            ? "rgba(168,224,99,0.2)"
                            : "rgba(239,83,80,0.15)",
                          borderColor: item.is_active
                            ? "rgba(168,224,99,0.35)"
                            : "rgba(239,83,80,0.3)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: item.is_active ? theme.accent : "#ef5350" },
                        ]}
                      >
                        {item.is_active ? "Active" : "Inactive"}
                      </Text>
                    </View>
                  </View>
                  {item.address ? (
                    <Text style={styles.meta}>📍 {item.address}</Text>
                  ) : null}
                  {item.latitude || item.longitude ? (
                    <Text style={styles.meta}>
                      🌐 {item.latitude?.toFixed(6)},{" "}
                      {item.longitude?.toFixed(6)}
                    </Text>
                  ) : null}
                  {item.description ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                  <Text style={styles.owner}>
                    Owner: {item.owner?.full_name ?? "Unassigned"}
                  </Text>

                  <View style={styles.actions}>
                    <Switch
                      value={item.is_active}
                      onValueChange={() =>
                        toggleActive(item.id, item.is_active)
                      }
                      trackColor={{
                        false: "rgba(255,255,255,0.15)",
                        true: theme.primary,
                      }}
                      thumbColor={
                        item.is_active ? theme.accent : "rgba(255,255,255,0.5)"
                      }
                    />
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openEdit(item)}
                    >
                      <Pencil size={15} color={theme.accent} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => deleteStore(item.id)}
                    >
                      <Trash2 size={15} color="#ef5350" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </BlurView>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No stores yet. Tap + to add one.</Text>
          }
        />
      )}

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalCard}>
            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>
                {editStore ? "Edit store" : "Add store"}
              </Text>

              {[
                {
                  label: "Store name *",
                  key: "name",
                  placeholder: "e.g. FreshMart CDO",
                  keyboard: "default",
                },
                {
                  label: "Address",
                  key: "address",
                  placeholder: "e.g. Divisoria, CDO",
                  keyboard: "default",
                },
                {
                  label: "Latitude",
                  key: "latitude",
                  placeholder: "e.g. 8.4764",
                  keyboard: "numeric",
                },
                {
                  label: "Longitude",
                  key: "longitude",
                  placeholder: "e.g. 124.6453",
                  keyboard: "numeric",
                },
                {
                  label: "Description",
                  key: "description",
                  placeholder: "Short description",
                  keyboard: "default",
                },
              ].map(({ label, key, placeholder, keyboard }) => (
                <View key={key}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    style={styles.input}
                    value={(form as any)[key]}
                    onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textMuted}
                    keyboardType={keyboard as any}
                  />
                </View>
              ))}
              {/* Add this after the Longitude input */}
              <ImagePickerButton
                currentImage={form.logo_url}
                onImageSelected={(url) =>
                  setForm((f) => ({ ...f, logo_url: url || "" }))
                }
                bucket="stores"
                path="store-logos"
                label="Store Logo"
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Store is active</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, is_active: v }))
                  }
                  trackColor={{
                    false: "rgba(255,255,255,0.15)",
                    true: theme.primary,
                  }}
                  thumbColor={
                    form.is_active ? theme.accent : "rgba(255,255,255,0.5)"
                  }
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={{ color: theme.textMuted, fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={save}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.textPrimary} size="small" />
                  ) : (
                    <Text style={{ color: theme.textPrimary, fontWeight: "700" }}>
                      {editStore ? "Update" : "Save"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 8,
  },
  title: { color: theme.textPrimary, fontSize: 24, fontWeight: "700" },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardInner: {
    backgroundColor: theme.surface,
    padding: 16,
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  storeName: { color: theme.textPrimary, fontWeight: "700", fontSize: 15 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },
  meta: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  owner: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 80,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.shadowColor,
  },
  modalInner: { backgroundColor: "rgba(26,74,26,0.9)", padding: 24, gap: 2 },
  modalTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  label: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: theme.textPrimary,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
  },
});
