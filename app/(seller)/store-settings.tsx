import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { useTheme } from "../../src/contexts/ThemeContext";
import { LocationPicker } from "../../src/components/LocationPicker";
import { Store, MapPin, Save, ChevronLeft, Camera } from "lucide-react-native";
import { router, useFocusEffect } from "expo-router";
import { useImageUpload } from "../../src/hooks/useImageUpload";
import { useMemo } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { GeocodingService } from "../../src/services/geocoding";

export default function StoreSettings() {
  const { profile } = useAuthStore();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    description: "",
    address: "",
    logo_url: "",
    is_active: true,
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const { uploadImage, uploading } = useImageUpload("images");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const fetchStore = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", profile?.id)
      .single();

    if (data) {
      setStore(data);
      setForm({
        name: data.name || "",
        description: data.description || "",
        address: data.address || "",
        logo_url: data.logo_url || "",
        is_active: data.is_active ?? true,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchStore();
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchStore();
      }
    }, [profile])
  );

  const handleImagePick = async () => {
    Alert.alert("Upload Logo", "Choose image source", [
      { text: "Camera", onPress: () => processImagePick("camera") },
      { text: "Gallery", onPress: () => processImagePick("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const processImagePick = async (source: "camera" | "gallery") => {
    const url = await uploadImage(source, "stores");
    if (url) {
      setForm((prev) => ({ ...prev, logo_url: url }));
    }
  };

  // Geocode the manually typed address and fill lat/lng
  const geocodeTypedAddress = async () => {
    if (!form.address.trim()) return;
    setIsGeocoding(true);
    try {
      const coords = await GeocodingService.addressToCoordinates(form.address);
      if (coords) {
        setForm((f) => ({
          ...f,
          latitude: coords.latitude,
          longitude: coords.longitude,
        }));
        Alert.alert("Location Found", `Coordinates set:
${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`);
      } else {
        Alert.alert("Not Found", "Could not find coordinates for that address. Try being more specific, or use the map picker.");
      }
    } catch (err) {
      Alert.alert("Error", "Geocoding failed. Please check your connection.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Store name is required");
    if (!form.address.trim()) return Alert.alert("Error", "Store address is required");

    setSaving(true);
    try {
      if (store?.id) {
        const { error } = await supabase
          .from("stores")
          .update({
            name: form.name.trim(),
            description: form.description.trim(),
            address: form.address.trim(),
            logo_url: form.logo_url,
            is_active: form.is_active,
            latitude: form.latitude,
            longitude: form.longitude,
          })
          .eq("id", store.id);
        if (error) throw error;
        Alert.alert("Success", "Store updated successfully");
      } else {
        const { error } = await supabase.from("stores").insert({
          owner_id: profile?.id,
          name: form.name.trim(),
          description: form.description.trim(),
          address: form.address.trim(),
          logo_url: form.logo_url,
          is_active: form.is_active,
          latitude: form.latitude,
          longitude: form.longitude,
        });
        if (error) throw error;
        Alert.alert("Success", "Store created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["seller-store", profile?.id] });
      queryClient.invalidateQueries({ queryKey: ["store-products"] });

      router.back();
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{store ? "Store Settings" : "Create Store"}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Logo picker */}
          <TouchableOpacity style={styles.imagePickerContainer} onPress={handleImagePick} disabled={uploading}>
            {form.logo_url ? (
              <Image source={{ uri: form.logo_url }} style={styles.storeImage} />
            ) : (
              <View style={styles.iconContainer}>
                <Store size={48} color={theme.primary} />
              </View>
            )}
            <View style={styles.editIconContainer}>
              {uploading ? (
                <ActivityIndicator color={theme.surface} size="small" />
              ) : (
                <Camera size={20} color={theme.surface} />
              )}
            </View>
          </TouchableOpacity>

          <Text style={styles.label}>Store Name *</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
            placeholder="E.g., Fresh Fruits Corner"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            placeholder="Tell customers about your store..."
            placeholderTextColor={theme.textMuted}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Store Address *</Text>

          {/* Map Picker Button */}
          <TouchableOpacity
            style={[styles.mapPickerBtn, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}
            onPress={() => setShowMapPicker(true)}
          >
            <MapPin size={18} color={theme.primary} />
            <Text style={[styles.mapPickerText, { color: theme.primary }]}>
              {form.latitude ? '📍 Location Selected - Tap to Change' : 'Pick Store Location on Map'}
            </Text>
          </TouchableOpacity>

          {/* Address input + inline geocode button */}
          <View style={styles.addressContainer}>
            <MapPin size={20} color={theme.textMuted} style={styles.addressIcon} />
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={form.address}
              onChangeText={(v) => setForm({ ...form, address: v })}
              placeholder="Full store address"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* Geocode button — only shown when address typed but no coords yet, or to re-geocode */}
          {form.address.trim().length > 5 && (
            <TouchableOpacity
              style={[
                styles.geocodeBtn,
                {
                  backgroundColor: form.latitude
                    ? theme.primary + "10"
                    : theme.primary,
                  borderColor: theme.primary,
                },
              ]}
              onPress={geocodeTypedAddress}
              disabled={isGeocoding}
            >
              {isGeocoding ? (
                <ActivityIndicator size="small" color={form.latitude ? theme.primary : "#fff"} />
              ) : (
                <Text
                  style={[
                    styles.geocodeBtnText,
                    { color: form.latitude ? theme.primary : "#fff" },
                  ]}
                >
                  {form.latitude
                    ? `📍 Coords set (${form.latitude?.toFixed(4)}, ${form.longitude?.toFixed(4)}) — Refresh`
                    : "📍 Get Coordinates from Address"}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {store && (
            <TouchableOpacity
              style={styles.statusToggle}
              onPress={() => setForm({ ...form, is_active: !form.is_active })}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: form.is_active ? theme.primary : theme.textMuted },
                ]}
              />
              <Text style={styles.statusText}>
                {form.is_active ? "Store is Active & Visible" : "Store is Hidden (Inactive)"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.surface} />
            ) : (
              <>
                <Save size={20} color={theme.surface} />
                <Text style={styles.saveBtnText}>
                  {store ? "Save Changes" : "Create Store"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide">
        <LocationPicker
          initialLatitude={form.latitude || undefined}
          initialLongitude={form.longitude || undefined}
          onLocationSelect={(location) => {
            setForm((f) => ({
              ...f,
              address: location.address,
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

const createStyles = (theme: any) => StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.textPrimary,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  imagePickerContainer: {
    alignSelf: "center",
    marginBottom: 24,
    position: "relative",
  },
  storeImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: theme.primary + "30",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: theme.border,
  },
  editIconContainer: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: theme.surface,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: theme.surfaceVariant,
    borderRadius: 16,
    padding: 16,
    color: theme.textPrimary,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  mapPickerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  addressIcon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
    top: 16,
  },
  addressInput: {
    flex: 1,
    paddingLeft: 48,
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 24,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  statusText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  geocodeBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    flexDirection: "row",
    gap: 8,
  },
  geocodeBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  saveBtnText: {
    color: theme.surface,
    fontSize: 18,
    fontWeight: "700",
  },
});