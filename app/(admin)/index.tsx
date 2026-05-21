import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { AppScreen } from "../../src/components/AppScreen";
import { supabase } from "../../src/lib/supabase";
import { ShoppingBag, Package, Store, TrendingUp, Users } from "lucide-react-native";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useNotifications } from "../../src/contexts/NotificationContext";
import NotificationBell from "../../src/components/NotificationBell";
import { router } from "expo-router";
import { useMemo } from 'react';

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { unreadCount, sendAdminNotification } = useNotifications();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [stats, setStats] = useState({
    orders: 0,
    products: 0,
    stores: 0,
    revenue: 0,
    users: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [
        { count: orders },
        { count: products },
        { count: stores },
        { count: users },
        { data: revenue },
        { data: recent },
        { data: lowStock },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("stores").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
        supabase
          .from("orders")
          .select("total_amount")
          .eq("status", "delivered"),
        supabase
          .from("orders")
          .select("*, store:stores(name), customer:profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("store_products")
          .select("*, product:products(name), store:stores(name)")
          .lte("stock_qty", 5)
          .gt("stock_qty", 0)
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
        users: users ?? 0,
      });
      setRecentOrders(recent ?? []);
      setLowStockProducts(lowStock ?? []);

      // Send admin notification for low stock products
      if (lowStock && lowStock.length > 0) {
        await sendAdminNotification(
          'system',
          'Low Stock Alert ⚠️',
          `${lowStock.length} products are running low on stock`,
          { type: 'low_stock_alert' }
        );
      }

      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      icon: <ShoppingBag size={22} color={theme.accent} />,
      label: "Total Orders",
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
      icon: <Users size={22} color={theme.accent} />,
      label: "Customers",
      val: stats.users,
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
        <View style={styles.header}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <NotificationBell
            onPress={() => router.push("/(admin)/notifications")}
            size={24}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.textPrimary} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map(({ icon, label, val }) => (
                <View key={label} style={styles.statCard}>
                  <View style={styles.statInner}>
                    {icon}
                    <Text style={styles.statVal}>{val}</Text>
                    <Text style={styles.statLabel}>{label}</Text>
                  </View>
                </View>
              ))}
            </View>

            {lowStockProducts.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>⚠️ Low Stock Products</Text>
                {lowStockProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.lowStockCard}
                    onPress={() => router.push(`/(admin)/products`)}
                  >
                    <View style={styles.lowStockInfo}>
                      <Text style={styles.lowStockName}>
                        {product.product?.name}
                      </Text>
                      <Text style={styles.lowStockStore}>
                        {product.store?.name}
                      </Text>
                    </View>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockText}>
                        {product.stock_qty} left
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

            <Text style={styles.sectionTitle}>Recent Orders</Text>
            {recentOrders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/(admin)/orders`)}
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
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>
                        {order.status?.replace(/_/g, " ")}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
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
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  statInner: { padding: 18, gap: 6 },
  statVal: { color: theme.textPrimary, fontSize: 24, fontWeight: "800" },
  statLabel: { color: theme.textMuted, fontSize: 12 },
  sectionTitle: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    marginTop: 10,
  },
  lowStockCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
  },
  lowStockInfo: {
    flex: 1,
  },
  lowStockName: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  lowStockStore: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  stockBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  stockText: {
    color: '#E65100',
    fontSize: 12,
    fontWeight: '600',
  },
  orderCard: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 8,
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