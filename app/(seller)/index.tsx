import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { BlurView } from "expo-blur";
import { Store, Package, ListOrdered, TrendingUp, Settings } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { router, useFocusEffect } from "expo-router";
import { useMemo } from 'react';

export default function SellerDashboard() {
  const { profile } = useAuthStore();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [store, setStore] = useState<any>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrders: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStoreData = async () => {
    setLoading(true);
    // 1. Get the seller's store
    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", profile?.id)
      .single();

    if (storeData) {
      setStore(storeData);

      // 2. Get store products count
      const { count: productCount } = await supabase
        .from("store_products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", storeData.id);

      // 3. Get active orders and total sales
      const { data: orders } = await supabase
        .from("orders")
        .select("status, total_amount")
        .eq("store_id", storeData.id);

      const activeOrders =
        orders?.filter((o) => !["delivered", "cancelled"].includes(o.status))
          .length || 0;
      const totalSales =
        orders
          ?.filter((o) => o.status === "delivered")
          .reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        totalProducts: productCount || 0,
        activeOrders,
        totalSales,
      });
    } else {
      setStore(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (profile?.id) {
      fetchStoreData();
    }
  }, [profile]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (profile?.id) {
        fetchStoreData();
      }
    }, [profile])
  );

  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator color={theme.textPrimary} style={{ marginTop: 60 }} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {profile?.full_name}</Text>
          <Text style={styles.title}>Seller Dashboard</Text>
        </View>

        {!store ? (
          <View style={styles.noStoreCard}>
            <Store
              size={40}
              color={theme.accent}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.noStoreTitle}>No Store Found</Text>
            <Text style={styles.noStoreText}>
              You need to set up a store profile before you can start selling.
            </Text>
            <TouchableOpacity
              style={styles.createStoreBtn}
              onPress={() => router.push("/(seller)/store-settings")}
            >
              <Text style={styles.createStoreBtnText}>Create Store</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.storeHeader}>
              <View style={styles.storeIcon}>
                <Store size={24} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeStatus}>
                  {store.is_active ? "🟢 Active" : "🔴 Inactive"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.settingsBtn}
                onPress={() => router.push("/(seller)/store-settings")}
              >
                <Settings size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <TrendingUp size={24} color={theme.accent} />
                <Text style={styles.statValue}>
                  ₱{stats.totalSales.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Total Sales</Text>
              </View>

              <View style={styles.statCard}>
                <ListOrdered size={24} color="#FFD700" />
                <Text style={styles.statValue}>{stats.activeOrders}</Text>
                <Text style={styles.statLabel}>Active Orders</Text>
              </View>

              <View style={styles.statCard}>
                <Package size={24} color="#64B5F6" />
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
                <Text style={styles.statLabel}>My Products</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    color: theme.textMuted,
    fontSize: 16,
    marginBottom: 4,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 28,
    fontWeight: "700",
  },
  noStoreCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 20,
    backgroundColor: theme.surface,
  },
  noStoreTitle: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  noStoreText: {
    color: theme.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  content: {
    gap: 20,
  },
  storeHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 16,
    backgroundColor: theme.surface,
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  storeName: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
  },
  storeStatus: {
    color: theme.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: theme.surface,
  },
  statValue: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: theme.textMuted,
    fontSize: 13,
  },
  createStoreBtn: {
    marginTop: 20,
    backgroundColor: theme.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  createStoreBtnText: {
    color: theme.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.surfaceVariant,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
});