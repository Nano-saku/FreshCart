import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { ShoppingBag, Package, Store, TrendingUp } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";

export default function AdminDashboard() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [stats, setStats] = useState({
    orders: 0,
    products: 0,
    stores: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: orders },
        { count: products },
        { count: stores },
        { data: revenue },
        { data: recent },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("stores").select("*", { count: "exact", head: true }),
        supabase
          .from("orders")
          .select("total_amount")
          .eq("status", "delivered"),
        supabase
          .from("orders")
          .select("*, store:stores(name), customer:profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      const totalRevenue =
        revenue?.reduce(
          (sum: number, o: any) => sum + (o.total_amount ?? 0),
          0,
        ) ?? 0;
      setStats({
        orders: orders ?? 0,
        products: products ?? 0,
        stores: stores ?? 0,
        revenue: totalRevenue,
      });
      setRecentOrders(recent ?? []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      icon: <ShoppingBag size={22} color={theme.accent} />,
      label: "Total orders",
      val: stats.orders,
    },
    {
      icon: <Package size={22} color={theme.accent} />,
      label: "Products",
      val: stats.products,
    },
    {
      icon: <Store size={22} color={theme.accent} />,
      label: "Stores",
      val: stats.stores,
    },
    {
      icon: <TrendingUp size={22} color={theme.accent} />,
      label: "Revenue",
      val: `₱${stats.revenue.toFixed(0)}`,
    },
  ];

  return (
    <AppScreen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text style={styles.title}>Admin dashboard</Text>
        {loading ? (
          <ActivityIndicator color={theme.textPrimary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map(({ icon, label, val }) => (
                <BlurView
                  key={label}
                  intensity={30}
                  tint="light"
                  style={styles.statCard}
                >
                  <View style={styles.statInner}>
                    {icon}
                    <Text style={styles.statVal}>{val}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                </BlurView>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Recent orders</Text>
            {recentOrders.map((order) => (
              <BlurView
                key={order.id}
                intensity={30}
                tint="light"
                style={[styles.orderCard, { marginBottom: 10 }]}
              >
                <View style={styles.orderInner}>
                  <View>
                    <Text style={styles.orderCustomer}>
                      {order.customer?.full_name}
                    </Text>
                    <Text style={styles.orderStore}>{order.store?.name}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.orderAmount}>
                      ₱{order.total_amount?.toFixed(2)}
                    </Text>
                    <View style={[styles.statusBadge]}>
                      <Text style={styles.statusText}>
                        {order.status?.replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>
                </View>
              </BlurView>
            ))}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: "47%",
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.shadowColorStrong,
  },
  statInner: { backgroundColor: theme.surface, padding: 18, gap: 6 },
  statVal: { color: theme.textMuted, fontSize: 24, fontWeight: "800" },
  statLabel: { color: theme.textMuted, fontSize: 12 },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  orderCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.shadowColorStrong,
  },
  orderInner: {
    backgroundColor: theme.surface,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderCustomer: { color: theme.textPrimary, fontWeight: "600", fontSize: 14 },
  orderStore: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
  orderAmount: { color: theme.accent, fontWeight: "700", fontSize: 14 },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "rgba(168,224,99,0.15)",
    borderWidth: 1,
    borderColor: "rgba(168,224,99,0.3)",
  },
  statusText: {
    color: theme.accent,
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
