import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { colors } from "../../src/constants/colors";
import { Plus, Pencil, Trash2, PackageSearch } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function SellerProducts() {
  const { profile } = useAuthStore();
  const [store, setStore] = useState<any>(null);
  const [storeProducts, setStoreProducts] = useState<any[]>([]);
  const [globalProducts, setGlobalProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();
  const styles = createStyles(theme);

  // Modals
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    id: "", // store_product id (for edit)
    product_id: "",
    price: "",
    stock_qty: "",
    is_available: true,
  });

  useEffect(() => {
    if (profile?.id) {
      init();
    }
  }, [profile]);

  const init = async () => {
    setLoading(true);
    // Fetch store
    const { data: storeData } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", profile?.id)
      .single();

    if (storeData) {
      setStore(storeData);
      await fetchStoreProducts(storeData.id);
      await fetchGlobalProducts();
    }
    setLoading(false);
  };

  const fetchStoreProducts = async (storeId: string) => {
    const { data } = await supabase
      .from("store_products")
      .select("*, product:products(*, category:categories(name))")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    setStoreProducts(data || []);
  };

  const fetchGlobalProducts = async () => {
    const { data } = await supabase.from("products").select("*").order("name");
    setGlobalProducts(data || []);
  };

  const openAdd = () => {
    setEditMode(false);
    setForm({
      id: "",
      product_id: "",
      price: "",
      stock_qty: "0",
      is_available: true,
    });
    setModalVisible(true);
  };

  const openEdit = (item: any) => {
    setEditMode(true);
    setForm({
      id: item.id,
      product_id: item.product_id,
      price: item.price?.toString() || "",
      stock_qty: item.stock_qty?.toString() || "0",
      is_available: item.is_available ?? true,
    });
    setModalVisible(true);
  };

  const saveProduct = async () => {
    if (!form.product_id)
      return Alert.alert("Error", "Please select a product");
    if (!form.price || isNaN(Number(form.price)))
      return Alert.alert("Error", "Enter a valid price");
    if (!form.stock_qty || isNaN(Number(form.stock_qty)))
      return Alert.alert("Error", "Enter valid stock");

    setSaving(true);

    const payload = {
      store_id: store.id,
      product_id: form.product_id,
      price: parseFloat(form.price),
      stock_qty: parseInt(form.stock_qty, 10),
      is_available: form.is_available,
    };

    try {
      if (editMode) {
        const { error } = await supabase
          .from("store_products")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        Alert.alert("Success", "Product updated");
      } else {
        // Check if already exists in store
        const exists = storeProducts.find(
          (sp) => sp.product_id === form.product_id,
        );
        if (exists) throw new Error("This product is already in your store.");

        const { error } = await supabase.from("store_products").insert(payload);
        if (error) throw error;
        Alert.alert("Success", "Product added to store");
      }

      setModalVisible(false);
      await fetchStoreProducts(store.id);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (id: string) => {
    Alert.alert(
      "Remove Product",
      "Are you sure you want to remove this product from your store?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await supabase.from("store_products").delete().eq("id", id);
            fetchStoreProducts(store.id);
          },
        },
      ],
    );
  };

  if (loading)
    return (
      <AppScreen>
        <ActivityIndicator color={theme.textPrimary} style={{ marginTop: 60 }} />
      </AppScreen>
    );

  if (!store) {
    return (
      <AppScreen>
        <View style={styles.noStoreContainer}>
          <PackageSearch size={50} color={theme.accent} />
          <Text style={styles.noStoreTitle}>No Store Setup</Text>
          <Text style={styles.noStoreText}>
            Please setup your store profile first in the Profile tab before
            managing products.
          </Text>
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>My Products</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={20} color={theme.textPrimary }/>
        </TouchableOpacity>
      </View>

      <FlatList
        data={storeProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No products in your store. Tap + to add items to sell.
          </Text>
        }
        renderItem={({ item }) => (
          <BlurView intensity={30} tint="light" style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.productName}>{item.product?.name}</Text>
              <Text style={styles.productMeta}>
                {item.product?.category?.name || "Uncategorized"} •{" "}
                {item.product?.unit}
              </Text>
              <View style={styles.priceRow}>
                <Text style={styles.price}>₱{item.price?.toFixed(2)}</Text>
                <Text style={styles.stock}>Stock: {item.stock_qty}</Text>
              </View>
              {!item.is_available && (
                <Text style={styles.unavailableBadge}>Unavailable</Text>
              )}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => openEdit(item)}
              >
                <Pencil size={18} color={theme.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => deleteProduct(item.id)}
              >
                <Trash2 size={18} color="#ef5350" />
              </TouchableOpacity>
            </View>
          </BlurView>
        )}
      />

      {/* Add / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalCard}>
            <ScrollView contentContainerStyle={styles.modalInner}>
              <Text style={styles.modalTitle}>
                {editMode ? "Edit Store Product" : "Add Product to Store"}
              </Text>

              {!editMode && (
                <View>
                  <Text style={styles.label}>Select Product *</Text>
                  <View style={styles.productGrid}>
                    {globalProducts.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={[
                          styles.productChip,
                          form.product_id === p.id && styles.productChipActive,
                        ]}
                        onPress={() => setForm({ ...form, product_id: p.id })}
                      >
                        <Text
                          style={[
                            styles.productChipText,
                            form.product_id === p.id &&
                              styles.productChipTextActive,
                          ]}
                        >
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {editMode && (
                <Text style={styles.readonlyProductName}>
                  {storeProducts.find((sp) => sp.id === form.id)?.product?.name}
                </Text>
              )}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Price (₱) *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.price}
                    onChangeText={(v) => setForm({ ...form, price: v })}
                    keyboardType="numeric"
                    placeholder="0.00"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Stock Qty *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.stock_qty}
                    onChangeText={(v) => setForm({ ...form, stock_qty: v })}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.availabilityToggle}
                onPress={() =>
                  setForm({ ...form, is_available: !form.is_available })
                }
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: form.is_available
                        ? theme.accent
                        : theme.textMuted,
                    },
                  ]}
                />
                <Text style={styles.availabilityText}>
                  {form.is_available
                    ? "Product is Available"
                    : "Product is Hidden"}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={saveProduct}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={theme.textPrimary} />
                  ) : (
                    <Text style={styles.saveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.surface,
    flexDirection: "row",
    alignItems: "center",
  },
  productName: { color: theme.textPrimary, fontSize: 16, fontWeight: "700" },
  productMeta: { color: theme.textMuted, fontSize: 13, marginTop: 2 },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  price: { color: theme.accent, fontSize: 16, fontWeight: "700" },
  stock: { color: theme.textPrimary, fontSize: 13 },
  unavailableBadge: {
    color: "#ef5350",
    fontSize: 12,
    marginTop: 6,
    fontWeight: "600",
  },
  actions: { gap: 10 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: theme.textMuted,
    textAlign: "center",
    marginTop: 60,
    paddingHorizontal: 40,
  },
  noStoreContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  noStoreTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  noStoreText: { color: theme.textMuted, textAlign: "center" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: theme.surface,
    maxHeight: "80%",
  },
  modalInner: { padding: 24, backgroundColor: "rgba(26,74,26,0.95)" },
  modalTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  label: {
    color: theme.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 16,
    color: theme.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  row: { flexDirection: "row" },
  productGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  productChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  productChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.accent,
  },
  productChipText: { color: theme.textMuted, fontSize: 13, fontWeight: "600" },
  productChipTextActive: { color: theme.textPrimary },
  readonlyProductName: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  availabilityToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  availabilityText: { color: theme.textPrimary, fontSize: 15, fontWeight: "500" },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
    marginBottom: 20,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.surface,
    alignItems: "center",
  },
  cancelText: { color: theme.textMuted, fontWeight: "600", fontSize: 16 },
  saveBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.primary,
    alignItems: "center",
  },
  saveText: { color: theme.textPrimary, fontWeight: "700", fontSize: 16 },
});
