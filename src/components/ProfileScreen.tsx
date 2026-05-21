import {
  View, Text, ScrollView, TouchableOpacity,
  Modal, Alert, Switch, StyleSheet, ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "../stores/authStore";
import { AppScreen } from "./AppScreen";
import { useTheme } from "../contexts/ThemeContext";
import {
  LogOut, User, Shield, ChevronRight,
  Settings, Bell, MapPin, CreditCard, Moon, Sun,
  ShoppingBag, BarChart3, Users, Package, DollarSign,
  TrendingUp, Star, Truck, ClipboardList, Store,
  Eye, MessageCircle, Gift, Archive, Tag, LogIn, UserPlus
} from "lucide-react-native";
import { useMemo } from 'react';

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme, themeMode } = useTheme();
  const { user, profile, signOut, softSignOut, biometricEnabled, setBiometricEnabled } = useAuthStore();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [biometricToggle, setBiometricToggle] = useState(biometricEnabled);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setBiometricToggle(biometricEnabled);
  }, [biometricEnabled]);

  const handleBiometricToggle = async (value: boolean) => {
    try {
      setBiometricToggle(value);
      await setBiometricEnabled(value);
      Alert.alert(
        "Success",
        value
          ? "Biometric authentication enabled. You can now use fingerprint to log in."
          : "Biometric authentication disabled.",
      );
    } catch {
      setBiometricToggle(!value);
      Alert.alert("Error", "Failed to update biometric settings");
    }
  };

  const handleSoftLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    try {
      await softSignOut();
    } catch {
      Alert.alert("Error", "Failed to log out");
      setIsLoggingOut(false);
    }
  };

  const handleFullLogout = async () => {
    setShowLogoutModal(false);
    setIsLoggingOut(true);
    try {
      await signOut();
    } catch {
      Alert.alert("Error", "Failed to log out");
      setIsLoggingOut(false);
    }
  };

  const getRoleBadgeStyle = () => {
    switch (profile?.role) {
      case "admin":
        return { backgroundColor: theme.error + "15", borderColor: theme.error + "40", color: theme.error };
      case "seller":
        return { backgroundColor: theme.warning + "15", borderColor: theme.warning + "40", color: theme.warning };
      default:
        return { backgroundColor: theme.primary + "15", borderColor: theme.primary + "40", color: theme.primary };
    }
  };

  const roleStyle = getRoleBadgeStyle();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (!user) {
    return (
      <AppScreen>
        <View style={styles.guestContainer}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + "15" }]}>
            <User size={48} color={theme.primary} />
          </View>
          <Text style={[styles.guestTitle, { color: theme.textPrimary }]}>Welcome to FreshCart</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            Sign in to track orders, save addresses, and get personalized recommendations.
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
            <LogIn size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")} style={[styles.secondaryBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <UserPlus size={20} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Create Account</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(customer)")} style={styles.browseLink}>
            <Text style={[styles.browseLinkText, { color: theme.textMuted }]}>Continue browsing as guest →</Text>
          </TouchableOpacity>
        </View>
      </AppScreen>
    );
  }

  // Common menu items for all roles
  const commonMenuItems = [
    {
      icon: Bell,
      label: "Notifications",
      onPress: () => Alert.alert("Coming Soon", "Notifications will be available in a future update."),
      roles: ["customer", "seller", "admin"],
    },
    {
      icon: Settings,
      label: "Settings",
      onPress: () => router.push("/profile/settings"),
      roles: ["customer", "seller", "admin"],
    },
  ];

  // Customer-specific menu items
  const customerMenuItems = [
    {
      icon: MapPin,
      label: "Delivery Addresses",
      onPress: () => router.push("/profile/addresses"),
      roles: ["customer"],
    },
    {
      icon: CreditCard,
      label: "Payment Methods",
      onPress: () => router.push("/profile/payment-methods"),
      roles: ["customer"],
    },
    {
      icon: Gift,
      label: "Offers & Coupons",
      onPress: () => Alert.alert("Coming Soon", "Offers & Coupons will be available in a future update."),
      roles: ["customer"],
    },
  ];

  // Admin-specific menu items
  const adminMenuItems = [
    {
      icon: BarChart3,
      label: "Platform Analytics",
      onPress: () => Alert.alert("Coming Soon", "Platform Analytics is not available at the moment"),
      roles: ["admin"],
    },
    {
      icon: Eye,
      label: "Audit Logs",
      onPress: () => Alert.alert("Coming Soon", "Audit Logs is not available at the moment"),
      roles: ["admin"],
    },
    {
      icon: ShoppingBag,
      label: "All Orders",
      onPress: () => router.push("/orders"),
      roles: ["admin"],
    },
    {
      icon: Tag,
      label: "Platform Coupons",
      onPress: () => Alert.alert("Coming Soon", "Platform Coupons is not available at the moment"),
      roles: ["admin"],
    },
    {
      icon: MessageCircle,
      label: "Support Tickets",
      onPress: () => Alert.alert("Coming Soon", "Support Tickets is not available at the moment"),
      roles: ["admin"],
    },
  ];

  // Combine all menu items based on user role
  const allMenuItems = [
    ...(profile?.role === "customer" ? customerMenuItems : []),
    ...(profile?.role === "admin" ? adminMenuItems : []),
    ...commonMenuItems,
  ];

  const getRoleTitle = () => {
    switch (profile?.role) {
      case "admin":
        return "Administrator";
      case "seller":
        return "Seller Dashboard";
      default:
        return "Customer Profile";
    }
  };

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <User size={40} color={theme.primary} />
          </View>
          <Text style={styles.name}>{profile?.full_name || "User"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.badge, { backgroundColor: roleStyle.backgroundColor, borderColor: roleStyle.borderColor }]}>
            <Text style={[styles.badgeText, { color: roleStyle.color }]}>
              {profile?.role === "admin" ? "Administrator" : profile?.role === "seller" ? "Seller" : "Customer"}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>{getRoleTitle()}</Text>
        <View style={styles.menuSection}>
          {allMenuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: theme.primary + "10" }]}>
                <item.icon size={20} color={theme.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <ChevronRight size={20} color={theme.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + "10" }]}>
              <Shield size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Biometric Login</Text>
              <Text style={styles.cardSubtitle}>Use fingerprint to sign in quickly</Text>
            </View>
            <Switch
              value={biometricToggle}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={biometricToggle ? theme.surface : theme.textMuted}
            />
          </View>
        </View>

        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <View style={styles.cardInner}>
            <View style={[styles.iconCircle, { backgroundColor: theme.primary + "10" }]}>
              {isDark ? <Moon size={20} color={theme.primary} /> : <Sun size={20} color={theme.primary} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Dark Mode</Text>
              <Text style={styles.cardSubtitle}>
                {themeMode === "auto" ? "Following system settings" : isDark ? "Dark theme active" : "Light theme active"}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={isDark ? theme.surface : theme.textMuted}
            />
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          onPress={() => setShowLogoutModal(true)}
          disabled={isLoggingOut}
          activeOpacity={0.8}
          style={styles.logoutCard}
        >
          <View style={styles.cardInner}>
            <View style={[styles.iconCircle, { backgroundColor: theme.error + "10" }]}>
              <LogOut size={20} color={theme.error} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.error, flex: 1 }]}>
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </Text>
            {!isLoggingOut && <ChevronRight size={20} color={theme.error} />}
          </View>
        </TouchableOpacity>

        <Text style={styles.version}>FreshCart v1.0.0</Text>
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade" onRequestClose={() => setShowLogoutModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalInner}>
              <View style={styles.modalHeader}>
                <View style={[styles.modalIcon, { backgroundColor: theme.warning + "15" }]}>
                  <LogOut size={28} color={theme.warning} />
                </View>
                <Text style={styles.modalTitle}>Choose Logout Option</Text>
                <Text style={styles.modalSubtitle}>
                  Would you like to keep biometric access for quick login, or fully log out?
                </Text>
              </View>

              {biometricToggle && (
                <TouchableOpacity
                  onPress={handleSoftLogout}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                  activeOpacity={0.8}
                >
                  <Shield size={22} color="#fff" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.btnTitle}>Keep Biometric Access</Text>
                    <Text style={styles.btnSubtitle}>Quick login with fingerprint next time</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleFullLogout}
                style={[styles.actionBtn, { backgroundColor: theme.error }]}
                activeOpacity={0.8}
              >
                <LogOut size={22} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.btnTitle}>Full Logout</Text>
                  <Text style={styles.btnSubtitle}>Clear all credentials and sessions</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowLogoutModal(false)}
                style={[styles.cancelBtn, { borderColor: theme.border }]}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppScreen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  guestContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 16, marginTop: 40 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  guestTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  guestSubtitle: { fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 8 },
  primaryBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, marginTop: 8 },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 16, borderWidth: 1 },
  secondaryBtnText: { fontSize: 16, fontWeight: "700" },
  browseLink: { marginTop: 8 },
  browseLinkText: { fontSize: 14 },
  scrollContent: { paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 32, paddingTop: 20 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: theme.primary + "15", alignItems: "center", justifyContent: "center", marginBottom: 16, borderWidth: 3, borderColor: theme.primary + "30" },
  name: { color: theme.textPrimary, fontSize: 24, fontWeight: "700", marginBottom: 4 },
  email: { color: theme.textSecondary, fontSize: 16, marginBottom: 12 },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1 },
  menuSection: { marginBottom: 24 },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, backgroundColor: theme.surface, marginBottom: 1 },
  menuIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 14 },
  menuLabel: { flex: 1, color: theme.textPrimary, fontSize: 16, fontWeight: "500" },
  sectionTitle: { color: theme.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, marginLeft: 16, marginTop: 8 },
  card: { borderRadius: 16, backgroundColor: theme.surface, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, marginHorizontal: 16, marginBottom: 12 },
  logoutCard: { borderRadius: 16, backgroundColor: theme.surface, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.error + "20" },
  cardInner: { padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  cardTitle: { color: theme.textPrimary, fontSize: 16, fontWeight: "600" },
  cardSubtitle: { color: theme.textSecondary, fontSize: 14, marginTop: 2 },
  version: { color: theme.textMuted, fontSize: 12, textAlign: "center", marginTop: 32 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { borderRadius: 24, backgroundColor: theme.surface, width: "100%", maxWidth: 360, shadowColor: theme.shadowColorStrong, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24, elevation: 10 },
  modalInner: { padding: 24, gap: 4 },
  modalHeader: { alignItems: "center", marginBottom: 20 },
  modalIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { color: theme.textPrimary, fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  modalSubtitle: { color: theme.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 20 },
  actionBtn: { borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  btnTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 2 },
  cancelBtn: { backgroundColor: theme.surfaceVariant, borderRadius: 16, padding: 16, alignItems: "center", borderWidth: 1 },
  cancelText: { color: theme.textSecondary, fontSize: 16, fontWeight: "600" },
  // New styles for stats grid
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  statCard: { flex: 1, minWidth: "45%", backgroundColor: theme.surface, borderRadius: 16, padding: 16, alignItems: "center", shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
  statValue: { color: theme.textPrimary, fontSize: 20, fontWeight: "700", marginTop: 8 },
  statLabel: { color: theme.textSecondary, fontSize: 12, marginTop: 4 },
});