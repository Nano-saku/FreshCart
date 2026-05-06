import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import { StyleSheet, View } from "react-native";
import {
  Home,
  Search,
  ShoppingCart,
  ClipboardList,
  User,
} from "lucide-react-native";
import { colors } from "../../src/constants/colors";
import { useCartStore } from "../../src/stores/cartStore";

export default function CustomerLayout() {
  const items = useCartStore((s) => s.items);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView
            intensity={50}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Search size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} />,
          tabBarBadge: items.length > 0 ? items.length : undefined,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color }) => <ClipboardList size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.15)",
    backgroundColor: "transparent",
    elevation: 0,
  },
});
