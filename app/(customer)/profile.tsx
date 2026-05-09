import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { useAuthStore } from "../../src/stores/authStore";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { ImagePickerButton } from "../../src/components/ImagePickerButton";
import {
  LogOut,
  User,
  Phone,
  ShieldCheck,
  Mail,
  Package,
  ChevronRight,
  Fingerprint,
  Pencil,
  Save,
  X,
  Lock,
} from "lucide-react-native";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_UNLOCKED_KEY = "biometric_unlocked";

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, session, setProfile, setSession } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });

  useEffect(() => {
    checkBiometricAvailability();
    loadBiometricPreference();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    } catch (e) {
      setBiometricAvailable(false);
    }
  };

  const loadBiometricPreference = async () => {
    try {
      const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(val === "true");
    } catch (e) {
      setBiometricEnabled(false);
    }
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      // Verify with biometrics before enabling
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify your identity to enable fingerprint login",
        fallbackLabel: "Use password",
        cancelLabel: "Cancel",
      });
      if (!result.success) {
        Alert.alert("Failed", "Biometric verification failed. Fingerprint login not enabled.");
        return;
      }
      // Store the refresh token so biometric login can restore session
      const refreshToken = session?.refresh_token;
      if (refreshToken) {
        await SecureStore.setItemAsync("refresh_token", refreshToken);
      }
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(value));
    setBiometricEnabled(value);
    Alert.alert(
      value ? "Fingerprint enabled" : "Fingerprint disabled",
      value
        ? "You can now use fingerprint to unlock the app."
        : "Fingerprint login has been turned off."
    );
  };

  const openEditProfile = () => {
    setEditForm({
      full_name: profile?.full_name || "",
      phone: profile?.phone || "",
      avatar_url: profile?.avatar_url || "",
    });
    setEditModalVisible(true);
  };

  const saveProfile = async () => {
    if (!editForm.full_name.trim()) {
      return Alert.alert("Error", "Name is required");
    }
    setSavingProfile(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim() || null,
          avatar_url: editForm.avatar_url.trim() || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({
        ...profile,
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        avatar_url: editForm.avatar_url.trim() || null,
      } as any);

      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated!");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSoftLogout = async () => {
    await SecureStore.deleteItemAsync(BIOMETRIC_UNLOCKED_KEY);
    setSession(null);
    setProfile(null);
    setLogoutModalVisible(false);
    router.replace("/(auth)/login");
  };

  const handleFullLogout = async () => {
    await supabase.auth.signOut();
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_UNLOCKED_KEY);
    await SecureStore.deleteItemAsync("refresh_token");
    setSession(null);
    setProfile(null);
    setLogoutModalVisible(false);
    router.replace("/(auth)/login");
  };

  return (
    <GreenScreen>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>My Profile</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={openEditProfile}
          >
            <Pencil size={16} color={colors.accent} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarInitial}>
                {(profile?.full_name || "U").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.name}>{profile?.full_name || "User"}</Text>
          <Text style={styles.emailText}>{profile?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {profile?.role?.toUpperCase() || "CUSTOMER"}
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <Text style={styles.sectionLabel}>Account</Text>
        <BlurView intensity={30} tint="light" style={styles.card}>
          <View style={styles.cardInner}>
            {[
              {
                icon: <Package size={18} color={colors.accent} />,
                label: "My Orders",
                value: "View history",
                onPress: () => router.push("/(customer)/orders"),
                showArrow: true,
              },
              {
                icon: <User size={18} color={colors.accent} />,
                label: "Full name",
                value: profile?.full_name || "Not set",
              },
              {
                icon: <Mail size={18} color={colors.accent} />,
                label: "Email",
                value: profile?.email || "Not set",
              },
              {
                icon: <Phone size={18} color={colors.accent} />,
                label: "Phone",
                value: profile?.phone || "Not set",
              },
              {
                icon: <ShieldCheck size={18} color={colors.accent} />,
                label: "Account type",
                value: profile?.role || "customer",
              },
            ].map(({ icon, label, value, onPress, showArrow }, index, arr) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.infoRow,
                  index < arr.length - 1 && styles.infoRowBorder,
                ]}
                onPress={onPress}
                disabled={!onPress}
                activeOpacity={onPress ? 0.7 : 1}
              >
                <View style={styles.iconContainer}>{icon}</View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.infoLabel}>{label}</Text>
                  <Text style={styles.infoVal}>{value}</Text>
                </View>
                {showArrow && (
                  <ChevronRight size={16} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </BlurView>

        {/* Security Settings */}
        <Text style={styles.sectionLabel}>Security</Text>
        <BlurView intensity={30} tint="light" style={styles.card}>
          <View style={styles.cardInner}>
            <View style={styles.infoRow}>
              <View style={styles.iconContainer}>
                <Fingerprint size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>Fingerprint Login</Text>
                <Text style={styles.infoVal}>
                  {biometricAvailable
                    ? biometricEnabled
                      ? "Enabled"
                      : "Disabled"
                    : "Not available on this device"}
                </Text>
              </View>
              {biometricAvailable && (
                <Switch
                  value={biometricEnabled}
                  onValueChange={toggleBiometric}
                  trackColor={{ false: "#374151", true: colors.accent + "60" }}
                  thumbColor={biometricEnabled ? colors.accent : "#9CA3AF"}
                />
              )}
            </View>
          </View>
        </BlurView>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() => setLogoutModalVisible(true)}
        >
          <LogOut size={18} color="#ef5350" />
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FreshCart v1.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.closeBtn}
              >
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={editForm.full_name}
                onChangeText={(v) =>
                  setEditForm((f) => ({ ...f, full_name: v }))
                }
                placeholder="Your full name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                onChangeText={(v) => setEditForm((f) => ({ ...f, phone: v }))}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={styles.label}>Profile Picture</Text>
              <ImagePickerButton
                currentImage={editForm.avatar_url}
                onImageSelected={(url) =>
                  setEditForm((f) => ({ ...f, avatar_url: url || "" }))
                }
                bucket="avatars"
                path="user-avatars"
                label="Profile Picture"
              />

              <TouchableOpacity
                style={[styles.saveBtn, savingProfile && { opacity: 0.6 }]}
                onPress={saveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View
                    style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                  >
                    <Save size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal visible={logoutModalVisible} transparent animationType="fade">
        <View style={styles.logoutOverlay}>
          <View style={styles.logoutCard}>
            <View style={styles.logoutCardHeader}>
              <Text style={styles.logoutTitle}>Sign Out</Text>
              <TouchableOpacity onPress={() => setLogoutModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.logoutSubtitle}>
              Choose how you want to sign out
            </Text>

            <TouchableOpacity
              style={styles.softLogoutBtn}
              onPress={handleSoftLogout}
            >
              <Fingerprint size={22} color={colors.accent} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.softLogoutText}>Soft Logout</Text>
                <Text style={styles.logoutDesc}>
                  Keep session for fingerprint login next time
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fullLogoutBtn}
              onPress={handleFullLogout}
            >
              <Lock size={22} color="#ef5350" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.fullLogoutText}>Full Logout</Text>
                <Text style={styles.logoutDesc}>
                  Remove all saved data, require password next time
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 0,
  },
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(168,224,99,0.15)",
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.3)",
  },
  editBtnText: { color: colors.accent, fontSize: 13, fontWeight: "600" },
  avatarContainer: { alignItems: "center", paddingVertical: 28 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.glassBorder,
    marginBottom: 12,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%", resizeMode: "cover" },
  avatarInitial: { fontSize: 36, fontWeight: "700", color: "#fff" },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  emailText: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(168,224,99,0.2)",
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.35)",
  },
  roleText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 20,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: { backgroundColor: colors.glass, padding: 6 },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.accent + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 2 },
  infoVal: { color: "#fff", fontSize: 14, fontWeight: "500" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 24,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "rgba(239,83,80,0.15)",
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
  },
  signOutText: { color: "#ef5350", fontWeight: "700", fontSize: 15 },
  version: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 32,
    fontSize: 12,
  },
  // Edit modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalCard: {
    backgroundColor: "#1a4a1a",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "85%",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: { padding: 20 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  saveBtn: {
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    marginBottom: 12,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  // Logout modal
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoutCard: {
    backgroundColor: "#1a2e1a",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  logoutCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logoutTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  logoutSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginBottom: 20,
  },
  softLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(168,224,99,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.3)",
    marginBottom: 12,
  },
  softLogoutText: { color: colors.accent, fontSize: 15, fontWeight: "600" },
  fullLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "rgba(239,83,80,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
  },
  fullLogoutText: { color: "#ef5350", fontSize: 15, fontWeight: "600" },
  logoutDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
