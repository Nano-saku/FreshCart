import { useEffect, useState } from "react";
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
import { colors } from "../../src/constants/colors";
import { BlurView } from "expo-blur";
import { Store, Package, ListOrdered, TrendingUp } from "lucide-react-native";

export default function SellerDashboard() {
  const { profile } = useAuthStore();
  const [store, setStore] = useState<any>(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeOrders: 0,
    totalSales: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchStoreData();
    }
  }, [profile]);

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
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <AppScreen>
        <ActivityIndicator color="#000000" style={{ marginTop: 60 }} />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {profile?.full_name}</Text>
          <Text style={styles.title}>Seller Dashboard</Text>
        </View>

        {!store ? (
          <BlurView intensity={30} tint="light" style={styles.noStoreCard}>
            <Store
              size={40}
              color={colors.accent}
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.noStoreTitle}>No Store Found</Text>
            <Text style={styles.noStoreText}>
              You need to set up a store profile before you can start selling.
            </Text>
          </BlurView>
        ) : (
          <View style={styles.content}>
            <BlurView intensity={30} tint="light" style={styles.storeHeader}>
              <View style={styles.storeIcon}>
                <Store size={24} color={colors.accent} />
              </View>
              <View>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeStatus}>
                  {store.is_active ? "🟢 Active" : "🔴 Inactive"}
                </Text>
              </View>
            </BlurView>

            <View style={styles.statsGrid}>
              <BlurView intensity={30} tint="light" style={styles.statCard}>
                <TrendingUp size={24} color={colors.accent} />
                <Text style={styles.statValue}>
                  ₱{stats.totalSales.toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Total Sales</Text>
              </BlurView>

              <BlurView intensity={30} tint="light" style={styles.statCard}>
                <ListOrdered size={24} color="#FFD700" />
                <Text style={styles.statValue}>{stats.activeOrders}</Text>
                <Text style={styles.statLabel}>Active Orders</Text>
              </BlurView>

              <BlurView intensity={30} tint="light" style={styles.statCard}>
                <Package size={24} color="#64B5F6" />
                <Text style={styles.statValue}>{stats.totalProducts}</Text>
                <Text style={styles.statLabel}>My Products</Text>
              </BlurView>
            </View>
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 16,
    marginBottom: 4,
  },
  title: {
    color: "#000000",
    fontSize: 28,
    fontWeight: "700",
  },
  noStoreCard: {
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginTop: 20,
  },
  noStoreTitle: {
    color: "#000000",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  noStoreText: {
    color: colors.textMuted,
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
    borderColor: colors.glassBorder,
    gap: 16,
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  storeName: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "700",
  },
  storeStatus: {
    color: colors.textMuted,
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
    borderColor: colors.glassBorder,
    alignItems: "flex-start",
    gap: 12,
  },
  statValue: {
    color: "#000000",
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
