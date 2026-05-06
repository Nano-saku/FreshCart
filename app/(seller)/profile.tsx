import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Switch } from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { colors } from "../../src/constants/colors";
import { ImagePickerButton } from "../../src/components/ImagePickerButton";

export default function SellerProfile() {
  const { profile, signOut } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    logo_url: "",
    is_active: true,
  });

  useEffect(() => {
    if (profile?.id) {
      fetchStore();
    }
  }, [profile]);

  const fetchStore = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", profile?.id)
      .single();

    if (data) {
      setStoreId(data.id);
      setForm({
        name: data.name || "",
        description: data.description || "",
        address: data.address || "",
        latitude: data.latitude?.toString() || "",
        longitude: data.longitude?.toString() || "",
        logo_url: data.logo_url || "",
        is_active: data.is_active ?? true,
      });
    }
    setLoading(false);
  };

  const saveStore = async () => {
    if (!form.name.trim()) {
      return Alert.alert("Error", "Store name is required");
    }

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
      logo_url: form.logo_url || null,
      is_active: form.is_active,
      owner_id: profile?.id,
    };

    try {
      if (storeId) {
        const { error } = await supabase.from("stores").update(storeData).eq("id", storeId);
        if (error) throw error;
        Alert.alert("Success", "Store profile updated!");
      } else {
        const { error, data } = await supabase.from("stores").insert(storeData).select().single();
        if (error) throw error;
        setStoreId(data.id);
        Alert.alert("Success", "Store created successfully!");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <GreenScreen>
        <ActivityIndicator color="#fff" style={{ marginTop: 60 }} />
      </GreenScreen>
    );
  }

  return (
    <GreenScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Store Profile</Text>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>

        <BlurView intensity={30} tint="light" style={styles.card}>
          <Text style={styles.sectionTitle}>
            {storeId ? "Edit Store Details" : "Create Your Store"}
          </Text>

          <Text style={styles.label}>Store Name *</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. FreshMart CDO"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={form.address}
            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
            placeholder="e.g. Divisoria, CDO"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Tell customers about your store..."
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={form.latitude}
                onChangeText={(v) => setForm((f) => ({ ...f, latitude: v }))}
                placeholder="e.g. 8.4764"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={form.longitude}
                onChangeText={(v) => setForm((f) => ({ ...f, longitude: v }))}
                placeholder="e.g. 124.6453"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <ImagePickerButton
              currentImage={form.logo_url}
              onImageSelected={(url) => setForm((f) => ({ ...f, logo_url: url || "" }))}
              bucket="stores"
              path="store-logos"
              label="Store Logo"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Store is open</Text>
            <Switch
              value={form.is_active}
              onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              trackColor={{ false: "rgba(255,255,255,0.15)", true: colors.primary }}
              thumbColor={form.is_active ? colors.accent : "rgba(255,255,255,0.5)"}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveStore}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>{storeId ? "Save Changes" : "Create Store"}</Text>
            )}
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  logoutBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  logoutText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  card: {
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  sectionTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 20,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    padding: 16,
    color: "#fff",
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  row: {
    flexDirection: "row",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 24,
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});
