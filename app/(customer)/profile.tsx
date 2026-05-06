import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { useAuthStore } from "../../src/stores/authStore";
import { colors } from "../../src/constants/colors";
import { router } from "expo-router";
import { LogOut, User, Phone, ShieldCheck, Mail, Package, ChevronRight } from "lucide-react-native";


const BIOMETRIC_KEY = "biometric_enabled";
const REFRESH_TOKEN_KEY = "refresh_token";
export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();

  const menuItems = [
    {
      icon: <Package size={18} color={colors.accent} />,
      label: "My Orders",
      onPress: () => router.push("/(customer)/orders"),
      showArrow: true,
    },
    {
      icon: <User size={18} color={colors.accent} />,
      label: "Full name",
      value: profile?.full_name,
    },
    {
      icon: <Mail size={18} color={colors.accent} />,
      label: "Email",
      value: profile?.email,
    },
    {
      icon: <Phone size={18} color={colors.accent} />,
      label: "Phone",
      value: profile?.phone ?? "Not set",
    },
    {
      icon: <ShieldCheck size={18} color={colors.accent} />,
      label: "Account type",
      value: profile?.role,
    },
  ];

  return (
    <GreenScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Avatar Section */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={{ fontSize: 48 }}>👤</Text>
          )}
        </View>
        <Text style={styles.name}>{profile?.full_name || "User"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{profile?.role || "customer"}</Text>
        </View>
      </View>

      {/* Info Cards */}
      <BlurView intensity={30} tint="light" style={styles.card}>
        <View style={styles.cardInner}>
          {menuItems.map(({ icon, label, value, onPress, showArrow }, index) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.infoRow,
                index < menuItems.length - 1 && styles.infoRowBorder,
              ]}
              onPress={onPress}
              disabled={!onPress}
              activeOpacity={onPress ? 0.7 : 1}
            >
              <View style={styles.iconContainer}>{icon}</View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                {value && <Text style={styles.infoVal}>{value}</Text>}
              </View>
              {showArrow && <ChevronRight size={16} color={colors.textMuted} />}
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <LogOut size={18} color="#ef5350" />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>FreshCart v1.0</Text>
    </GreenScreen>
  );
}

const styles = StyleSheet.create({
  header: { padding: 20, paddingBottom: 0 },
  title: { color: "#fff", fontSize: 24, fontWeight: "700" },
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
  avatarImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  name: { color: "#fff", fontSize: 20, fontWeight: "700" },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(168,224,99,0.2)",
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.35)",
  },
  roleText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
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
    padding: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.accent + "15",
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
    fontSize: 12,
  },
});