import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { GreenScreen } from "../../src/components/GreenScreen";
import { BlurView } from "expo-blur";
import { useAuthStore } from "../../src/stores/authStore";
import { colors } from "../../src/constants/colors";
import { LogOut, User, Phone, ShieldCheck } from "lucide-react-native";

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();

  return (
    <GreenScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={{ fontSize: 48 }}>👤</Text>
        </View>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{profile?.role}</Text>
        </View>
      </View>

      <BlurView intensity={30} tint="light" style={styles.card}>
        <View style={styles.cardInner}>
          {[
            {
              icon: <User size={18} color={colors.accent} />,
              label: "Full name",
              val: profile?.full_name,
            },
            {
              icon: <Phone size={18} color={colors.accent} />,
              label: "Phone",
              val: profile?.phone ?? "Not set",
            },
            {
              icon: <ShieldCheck size={18} color={colors.accent} />,
              label: "Account type",
              val: profile?.role,
            },
          ].map(({ icon, label, val }) => (
            <View key={label} style={styles.infoRow}>
              {icon}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>{label}</Text>
                <Text style={styles.infoVal}>{val}</Text>
              </View>
            </View>
          ))}
        </View>
      </BlurView>

      <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
        <LogOut size={18} color="#ef5350" />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
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
  cardInner: { backgroundColor: colors.glass, padding: 18, gap: 16 },
  infoRow: { flexDirection: "row", alignItems: "center" },
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
});
