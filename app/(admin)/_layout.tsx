import { Tabs } from "expo-router";
import { LayoutDashboard, Package, Store, Users, ClipboardList, User } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function AdminLayout() {
  const { theme } = useTheme();

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