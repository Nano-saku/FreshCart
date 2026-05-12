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
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { Plus, Pencil, Trash2 } from "lucide-react-native";
import { ImagePickerButton } from "../../src/components/ImagePickerButton";

export default function AdminProductsScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    unit: "piece",
    category_id: "",
    image_url: "",
  });

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*, category:categories(name)")
      .order("name");

    if (error) {
      console.error("Fetch products error:", error);
      Alert.alert("Error", "Failed to load products");
    } else {
      setProducts(data ?? []);
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(data ?? []);
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const openAdd = () => {
    setEditProduct(null);
    setForm({
      name: "",
      description: "",
      unit: "piece",
      category_id: "",
      image_url: "",
    });
    setModalVisible(true);
  };

  const openEdit = (p: any) => {
    setEditProduct(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      unit: p.unit || "piece",
      category_id: p.category_id || "",
      image_url: p.image_url || "",
    });
    setModalVisible(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      return Alert.alert("Error", "Product name is required");
    }

    setSaving(true);
    const productData = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      unit: form.unit.trim() || "piece",
      category_id: form.category_id || null,
      image_url: form.image_url.trim() || null,
    };

    try {
      if (editProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editProduct.id);

        if (error) throw error;
        Alert.alert("Success", "Product updated");
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
        Alert.alert("Success", "Product created");
      }

      setModalVisible(false);
      fetchProducts();
    } catch (error: any) {
      console.error("Save product error:", error);
      Alert.alert("Error", error.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (id: string) =>
    Alert.alert("Delete product", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", id);
          if (error) {
            Alert.alert("Error", "Failed to delete product");
          } else {
            fetchProducts();
          }
        },
      },
    ]);

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Products</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Plus size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#000000" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
          renderItem={({ item }) => (
            <BlurView intensity={30} tint="light" style={styles.card}>
              <View style={styles.cardInner}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {item.category?.name || "No category"} • {item.unit}
                  </Text>
                  {item.description ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => openEdit(item)}
                    style={styles.iconBtn}
                  >
                    <Pencil size={16} color={colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => deleteProduct(item.id)}
                    style={styles.iconBtn}
                  >
                    <Trash2 size={16} color="#ef5350" />
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No products yet. Tap + to add one.</Text>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalCard}>
            <View style={styles.modalInner}>
              <Text style={styles.modalTitle}>
                {editProduct ? "Edit product" : "Add product"}
              </Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
                placeholder="Product name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.categoryList}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      form.category_id === cat.id && styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setForm((f) => ({ ...f, category_id: cat.id }))
                    }
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        form.category_id === cat.id &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    form.category_id === "" && styles.categoryChipActive,
                  ]}
                  onPress={() => setForm((f) => ({ ...f, category_id: "" }))}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      form.category_id === "" && styles.categoryChipTextActive,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={styles.input}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                placeholder="Description"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                value={form.unit}
                onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))}
                placeholder="piece / kg / pack / liter"
                placeholderTextColor={colors.textMuted}
              />

              <ImagePickerButton
                currentImage={form.image_url}
                onImageSelected={(url) =>
                  setForm((f) => ({ ...f, image_url: url || "" }))
                }
                bucket="products"
                path="product-images"
                label="Product Image"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                  onPress={save}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={{ color: "#000000", fontWeight: "700" }}>
                      Save
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

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 8,
  },
  title: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardInner: {
    backgroundColor: colors.surface,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  productName: { color: "#000000", fontWeight: "600", fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  empty: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 80,
    fontSize: 15,
  },
  actions: { flexDirection: "row", gap: 10 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.surface,
  },
  modalInner: { backgroundColor: "rgba(26,74,26,0.85)", padding: 24, gap: 4 },
  modalTitle: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#000000",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },
  categoryChipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#000000",
    fontWeight: "700",
  },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.shadowColor,
    alignItems: "center",
  },
  saveBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
});
