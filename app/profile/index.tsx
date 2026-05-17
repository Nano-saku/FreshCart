import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "../../src/components/AppScreen";
import { useAuthStore } from "../../src/stores/authStore";
import { useTheme } from "../../src/contexts/ThemeContext";
import { User, LogIn, UserPlus } from "lucide-react-native";
import ProfileScreen from "../../src/components/ProfileScreen";
import { useMemo } from 'react';

export default function CustomerProfileScreen() {
  const { theme } = useTheme();
  const { user, loading } = useAuthStore();
  const styles = useMemo(() => createStyles(theme), [theme]);

  if (loading) {
    return (
      <AppScreen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </AppScreen>
    );
  }

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

  return <ProfileScreen />;
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
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
});
