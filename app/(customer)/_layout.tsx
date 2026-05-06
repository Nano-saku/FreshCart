import { Tabs } from "expo-router";
import { StyleSheet, View, TouchableOpacity, Text } from "react-native";
import {
  Home,
  Search,
  ShoppingCart,
  ClipboardList,
  User,
} from "lucide-react-native";
import { colors } from "../../src/constants/colors";
import { useCartStore } from "../../src/stores/cartStore";
import { useRouter } from "expo-router";

export default function CustomerLayout() {
  const items = useCartStore((s) => s.items);
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarBackground: () => null,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          elevation: 0,
          borderTopWidth: 0,
          height: 60,
          paddingBottom: 20,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabWrapper, focused && styles.tabWrapperFocused]}>
              <Home size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.tabLabel}>Home</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabWrapper, focused && styles.tabWrapperFocused]}>
              <Search size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.tabLabel}>Search</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabWrapper, focused && styles.tabWrapperFocused]}>
              <User size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.tabLabel}>Me</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabWrapper, focused && styles.tabWrapperFocused]}>
              <ClipboardList size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.tabLabel}>Orders</Text>}
            </View>
          ),
        }}
      />
      
<Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabWrapper, focused && styles.tabWrapperFocused]}>
              <View style={{ position: "relative" }}>
                <ShoppingCart size={22} color={focused ? "#fff" : color} />
                {items.length > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {items.length > 9 ? "9+" : items.length}
                    </Text>
                  </View>
                )}
              </View>
              {focused && <Text style={styles.tabLabel}>Cart</Text>}
            </View>
          ),
        }}
      />
      {/* Hidden screens */}
      <Tabs.Screen name="checkout" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="product/[id]" options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  tabWrapperFocused: {
    backgroundColor: colors.accent,
    width: 80,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  tabLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    backgroundColor: colors.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#000",
  },
  badgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "700",
  },
});