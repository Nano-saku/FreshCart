import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GreenScreen } from "../../src/components/GreenScreen";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { colors } from "../../src/constants/colors";
import {
  LogOut,
  User,
  Mail,
  Shield,
  Store,
  ChevronRight,
  Bell,
  Moon,
  Phone,
  Save,
  X,
  Fingerprint,
  Lock,
} from "lucide-react-native";
import { ImagePickerButton } from "../../src/components/ImagePickerButton";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_UNLOCKED_KEY = "biometric_unlocked";

export default function AdminProfile() {
  const router = useRouter();
  const { profile, session, setProfile, setSession } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: "",
    phone: "",
    avatar_url: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    loadSettings();
    checkBiometricAvailability();
    loadBiometricPreference();
  }, []);

  const loadSettings = async () => {
    try {
      const dm = await AsyncStorage.getItem("darkMode");
      if (dm !== null) setDarkMode(JSON.parse(dm));
      const notif = await AsyncStorage.getItem("notifications");
      if (notif !== null) setNotifications(JSON.parse(notif));
    } catch (e) {}
  };

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
    } catch (e) {}
  };

  const toggleBiometric = async (value: boolean) => {
    if (value) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Verify your identity to enable fingerprint login",
        fallbackLabel: "Use password",
        cancelLabel: "Cancel",
      });
      if (!result.success) {
        Alert.alert("Failed", "Biometric verification failed.");
        return;
      }
      const refreshToken = session?.refresh_token;
      if (refreshToken) {
        await SecureStore.setItemAsync("refresh_token", refreshToken);
      }
    }
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(value));
    setBiometricEnabled(value);
  };

  const toggleDarkMode = async (value: boolean) => {
    setDarkMode(value);
    await AsyncStorage.setItem("darkMode", JSON.stringify(value));
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem("notifications", JSON.stringify(value));
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
    if (!editForm.full_name.trim())
      return Alert.alert("Error", "Name is required");
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
      Alert.alert("Success", "Profile updated");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update profile");
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

  const menuItems = [
    {
      icon: <User size={20} color={colors.accent} />,
      label: "Edit Profile",
      value: profile?.full_name || "Not set",
      onPress: openEditProfile,
    },
    {
      icon: <Mail size={20} color={colors.accent} />,
      label: "Email",
      value: session?.user?.email || "N/A",
      onPress: null,
    },
    {
      icon: <Shield size={20} color={colors.accent} />,
      label: "Role",
      value: profile?.role || "admin",
      onPress: null,
    },
    ...(profile?.role === "seller"
      ? [
          {
            icon: <Store size={20} color={colors.accent} />,
            label: "My Store",
            value: "Manage",
            onPress: () => router.push("/(admin)/stores"),
          },
        ]
      : []),
  ];

  const settingsItems = [
    {
      icon: <Bell size={20} color={colors.accent} />,
      label: "Notifications",
      toggle: true,
      value: notifications,
      onToggle: toggleNotifications,
    },
    {
      icon: <Moon size={20} color={colors.accent} />,
      label: "Dark Mode",
      toggle: true,
      value: darkMode,
      onToggle: toggleDarkMode,
    },
    ...(biometricAvailable
      ? [
          {
            icon: <Fingerprint size={20} color={colors.accent} />,
            label: "Fingerprint Login",
            toggle: true,
            value: biometricEnabled,
            onToggle: toggleBiometric,
          },
        ]
      : []),
  ];

  return (
    <GreenScreen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20, paddingBottom: 8 }}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatarSection}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: getRoleColor(profile?.role) + "20" },
            ]}
          >
            <Text
              style={[
                styles.avatarText,
                { color: getRoleColor(profile?.role) },
              ]}
            >
              {(profile?.full_name || "A").charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || "Admin User"}</Text>
          <Text style={styles.email}>{session?.user?.email}</Text>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(profile?.role) + "20" },
            ]}
          >
            <Text
              style={[styles.roleText, { color: getRoleColor(profile?.role) }]}
            >
              {profile?.role?.toUpperCase() || "ADMIN"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Account</Text>
        {menuItems.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuItem}
            onPress={item.onPress || undefined}
            disabled={!item.onPress}
          >
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>{item.icon}</View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <View style={styles.menuRight}>
              <Text style={styles.menuValue} numberOfLines={1}>
                {item.value}
              </Text>
              {item.onPress && <ChevronRight size={16} color="#6B7280" />}
            </View>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Settings</Text>
        {settingsItems.map((item, i) => (
          <View key={i} style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <View style={styles.iconBox}>{item.icon}</View>
              <Text style={styles.menuLabel}>{item.label}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: "#374151", true: colors.accent + "60" }}
              thumbColor={item.value ? colors.accent : "#9CA3AF"}
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => setLogoutModalVisible(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ef5350" />
          ) : (
            <>
              <LogOut size={20} color="#ef5350" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.version}>FreshCart Admin v1.0.0</Text>
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
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Save size={18} color="#fff" />
                    <Text
                      style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                    >
                      Save Changes
                    </Text>
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
            <View style={styles.logoutHeader}>
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
                  Remove all data, require password next time
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </GreenScreen>
  );
}

function getRoleColor(role?: string) {
  switch (role) {
    case "admin":
      return "#EF4444";
    case "seller":
      return "#F59E0B";
    default:
      return colors.accent;
  }
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
  avatarSection: { alignItems: "center", marginVertical: 20 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: "700" },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  email: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleText: { fontSize: 11, fontWeight: "700" },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  menuLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  menuLabel: { color: "#fff", fontSize: 15, fontWeight: "500" },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  menuValue: { color: colors.textMuted, fontSize: 14, maxWidth: 120 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginHorizontal: 16,
    marginTop: 32,
    paddingVertical: 16,
    backgroundColor: "rgba(239,83,80,0.15)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(239,83,80,0.3)",
  },
  logoutText: { color: "#ef5350", fontSize: 16, fontWeight: "700" },
  version: {
    color: "#4B5563",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 32,
    fontSize: 12,
  },
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
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
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
  logoutHeader: {
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
