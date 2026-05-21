import { Tabs } from "expo-router";
import { LayoutDashboard, Package, Store, Users, ClipboardList, User, View } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { ActivityIndicator, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { useAuthStore } from "../../src/stores/authStore";

export default function AdminLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, profile, fetchProfile } = useAuthStore();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    verifyAdminAccess();
  }, []);

  const verifyAdminAccess = async () => {
    if (!user) {
      router.replace("/(auth)/login");
      return;
    }

    // Re-fetch profile from server to ensure role hasn't changed
    const freshProfile = await fetchProfile(user.id);

    if (!freshProfile || freshProfile.role !== "admin") {
      Alert.alert("Access Denied", "You do not have admin privileges.");
      router.replace("/(customer)");
      return;
    }

    setVerified(true);
  };

  if (!verified) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard", tabBarIcon: ({ color, size }) => <LayoutDashboard size={size || 24} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ href: null }} />
      <Tabs.Screen name="products" options={{ title: "Products", tabBarIcon: ({ color, size }) => <Package size={size || 24} color={color} /> }} />
      <Tabs.Screen name="stores" options={{ title: "Stores", tabBarIcon: ({ color, size }) => <Store size={size || 24} color={color} /> }} />
      <Tabs.Screen name="users" options={{ title: "Users", tabBarIcon: ({ color, size }) => <Users size={size || 24} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => <User size={size || 24} color={color} /> }} />
    </Tabs>
  );
}