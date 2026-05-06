import { Tabs } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import {
  LayoutDashboard,
  Package,
  ListOrdered,
  User,
  Home,
} from "lucide-react-native";

import { colors } from "../../src/constants/colors";

export default function SellerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTitle: "",
        tabBarShowLabel: false,
        tabBarBackground: () => (null),
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          elevation: 0,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileWrapper, focused && styles.profileWrapperFocused]}>
              <Home size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.profileLabel}>Home</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileWrapper, focused && styles.profileWrapperFocused]}>
              <Package size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.profileLabel}>Products</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileWrapper, focused && styles.profileWrapperFocused]}>
              <ListOrdered size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.profileLabel}>Orders</Text>}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileWrapper, focused && styles.profileWrapperFocused]}>
              <User size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.profileLabel}>Me</Text>}
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  profileWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  profileWrapperFocused: {
    backgroundColor: colors.accent,
    width: 85,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  profileLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
