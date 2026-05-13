import { Tabs } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import {
  Home,
  Search,
  ShoppingCart,
  ClipboardList,
  User,
} from "lucide-react-native";
import { colors } from "../../src/constants/colors";
import { useCartStore } from "../../src/stores/cartStore";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function CustomerLayout() {
  const items = useCartStore((s) => s.items);
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 8,
          shadowColor: theme.shadowColorStrong,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <View style={{ position: "relative" }}>
              <ShoppingCart size={size || 24} color={color} />
              {items.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {items.length > 9 ? "9+" : items.length}
                  </Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <ClipboardList size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size }) => (<User size={size || 24} color={color} />) }} />
      {/* Hidden screens */}
      <Tabs.Screen name="checkout" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="search" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="product/[id]" options={{ href: null, headerShown: false }} />
      {/* Hidden profile sub-screens */}
      <Tabs.Screen name="profile/addresses" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/notifications" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="profile/settings" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  badge: {
    position: "absolute",
    top: -8,
    right: -10,
    backgroundColor: theme.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.surface,
  },
  badgeText: {
    color: theme.textInverse,
    fontSize: 10,
    fontWeight: "700",
  },
});
