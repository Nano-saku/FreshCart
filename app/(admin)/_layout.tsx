import { Tabs } from "expo-router";
import { StyleSheet, View, Text } from "react-native";
import { BlurView } from "expo-blur";
import {
  LayoutDashboard,
  Package,
  Store,
  Contact,
  User,
  Home,
} from "lucide-react-native";

import { colors } from "../../src/constants/colors";

export default function AdminLayout() {
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
          borderTopWidth: 0,           // remove top border too
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
        name="stores"
        options={{
          title: "Stores",
          tabBarIcon: ({ color, focused }) => (
      <View style={[styles.profileWrapper, focused && styles.profileWrapperFocused]}>
        <Store size={22} color={focused ? "#fff" : color} />
        {focused && <Text style={styles.profileLabel}>Stores</Text>}
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
        name="users"
        options={{
          title: "Users",
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.profileWrapper, focused && styles.profileWrapperFocused]}>
              <Contact  size={22} color={focused ? "#fff" : color} />
              {focused && <Text style={styles.profileLabel}>Users</Text>}
            </View>
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
    borderTopColor: "rgba(0, 0, 0, 0.15)",
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
    width: 80,           // expands when active
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