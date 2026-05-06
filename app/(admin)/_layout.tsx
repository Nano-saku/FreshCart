import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import {
  LayoutDashboard,
  Package,
  Store,
  ShoppingBag,
  Users,
} from "lucide-react-native";

import { colors } from "../../src/constants/colors";

export default function AdminLayout() {
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
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={22} color={color} />
          ),
        }}
      />
<Tabs.Screen
        name="stores"
        options={{
          title: "Stores",
          tabBarIcon: ({ color }) => (
            <Store size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
            tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileIconWrapper, focused && styles.profileIconFocused]}>
              <Users size={22} color={focused ? "#fff" : color} />
            </View>
          ),

        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color }) => (
            <Package size={22} color={color} />
          ),
        }}
      />

      
      <Tabs.Screen
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color }) => (
            <Users size={22} color={color} />
          ),
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
    profileIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  profileIconFocused: {
    backgroundColor: colors.primary,
    borderColor: colors.accent,
  },

});