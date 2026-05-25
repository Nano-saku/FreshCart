import {
  View, Text, Switch, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, FlatList, Animated,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { AppScreen } from "../../src/components/AppScreen";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useNotificationPrefs } from "../../src/hooks/useNotificationPrefs";
import { useNotificationStore } from "../../src/stores/notificationStore";
import {
  ChevronLeft, Bell, Tag, Package, BellOff,
  Inbox, Settings, Trash2, CheckCheck, Circle,
  ShoppingBag, Users, Store, Info,
} from "lucide-react-native";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";

// ─── Notification type config ────────────────────────────────────────────────
const TYPE_CONFIG = {
  new_order: { label: "New Order", Icon: ShoppingBag, color: "#10B981" },
  order_status: { label: "Order Update", Icon: Package, color: "#3B82F6" },
  new_customer: { label: "New Customer", Icon: Users, color: "#8B5CF6" },
  new_store: { label: "New Store", Icon: Store, color: "#F59E0B" },
  general: { label: "General", Icon: Info, color: "#6B7280" },
} as const;

const PREF_ITEMS = [
  {
    key: "orderUpdates" as const,
    icon: Package,
    title: "Order Updates",
    subtitle: "Confirmed, out for delivery, delivered",
  },
  {
    key: "promotions" as const,
    icon: Tag,
    title: "Promotions & Deals",
    subtitle: "Sales, discounts, and special offers",
  },
  {
    key: "newArrivals" as const,
    icon: Bell,
    title: "New Arrivals",
    subtitle: "New products from stores you've ordered from",
  },
];

// ─── Relative time helper ─────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotifRow({
  item,
  theme,
  onRead,
  onDelete,
}: {
  item: ReturnType<typeof useNotificationStore.getState>["notifications"][0];
  theme: any;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const config = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.general;
  const { Icon, color, label } = config;
  const scale = useRef(new Animated.Value(1)).current;

  const handleDelete = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => onDelete(item.id));
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => !item.read && onRead(item.id)}
        style={[
          styles_row.row,
          {
            backgroundColor: item.read ? theme.surface : theme.primary + "08",
            borderColor: item.read ? theme.border : theme.primary + "20",
          },
        ]}
      >
        {/* Unread dot */}
        {!item.read && (
          <View style={[styles_row.unreadDot, { backgroundColor: color }]} />
        )}

        {/* Icon */}
        <View style={[styles_row.iconCircle, { backgroundColor: color + "15" }]}>
          <Icon size={20} color={color} />
        </View>

        {/* Content */}
        <View style={styles_row.content}>
          <View style={styles_row.headerRow}>
            <Text
              style={[
                styles_row.typeLabel,
                { color },
              ]}
            >
              {label}
            </Text>
            <Text style={[styles_row.time, { color: theme.textMuted }]}>
              {timeAgo(item.created_at)}
            </Text>
          </View>
          <Text
            style={[
              styles_row.title,
              { color: theme.textPrimary, fontWeight: item.read ? "500" : "700" },
            ]}
            numberOfLines={1}
          >
            {item.title}
          </Text>
          <Text
            style={[styles_row.message, { color: theme.textSecondary }]}
            numberOfLines={2}
          >
            {item.message}
          </Text>
        </View>

        {/* Delete */}
        <TouchableOpacity
          onPress={handleDelete}
          style={[styles_row.deleteBtn, { backgroundColor: theme.error + "10" }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={theme.error} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles_row = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    flexShrink: 0,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1, gap: 3 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  typeLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  time: { fontSize: 11 },
  title: { fontSize: 14 },
  message: { fontSize: 13, lineHeight: 18 },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
type Tab = "inbox" | "settings";

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { prefs, loading: prefsLoading, updatePref } = useNotificationPrefs();
  const {
    notifications,
    loading: notifsLoading,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount === 0) return;
    Alert.alert(
      "Mark All as Read",
      "Mark all notifications as read?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Mark All", onPress: markAllAsRead },
      ],
    );
  }, [unreadCount, markAllAsRead]);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert(
        "Delete Notification",
        "Remove this notification?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteNotification(id) },
        ],
      );
    },
    [deleteNotification],
  );

  return (
    <AppScreen>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Notifications</Text>
        {activeTab === "inbox" && unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllBtn}>
            <CheckCheck size={18} color={theme.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
        {(["inbox", "settings"] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabBtn,
                isActive && { backgroundColor: theme.surface, shadowColor: theme.shadowColor },
              ]}
              activeOpacity={0.8}
            >
              {tab === "inbox" ? (
                <Inbox size={16} color={isActive ? theme.primary : theme.textMuted} />
              ) : (
                <Settings size={16} color={isActive ? theme.primary : theme.textMuted} />
              )}
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.primary : theme.textMuted, fontWeight: isActive ? "700" : "500" },
                ]}
              >
                {tab === "inbox" ? "Inbox" : "Settings"}
              </Text>
              {tab === "inbox" && unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── INBOX TAB ── */}
      {activeTab === "inbox" && (
        notifsLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={theme.primary} size="large" />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>Loading notifications…</Text>
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primary + "10" }]}>
              <Bell size={40} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>All Caught Up!</Text>
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              You have no notifications yet. We'll let you know when something important happens.
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <NotifRow
                item={item}
                theme={theme}
                onRead={markAsRead}
                onDelete={handleDelete}
              />
            )}
            ListHeaderComponent={
              <Text style={[styles.listHeader, { color: theme.textMuted }]}>
                {unreadCount > 0
                  ? `${unreadCount} unread · ${notifications.length} total`
                  : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
              </Text>
            }
          />
        )
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === "settings" && (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.settingsContent}>
          {prefsLoading ? (
            <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* Master toggle */}
              <View style={[styles.card, styles.masterCard]}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: prefs.pushEnabled ? theme.primary + "15" : theme.border },
                  ]}
                >
                  {prefs.pushEnabled
                    ? <Bell size={22} color={theme.primary} />
                    : <BellOff size={22} color={theme.textMuted} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.masterTitle, { color: theme.textPrimary }]}>Push Notifications</Text>
                  <Text style={[styles.masterSub, { color: theme.textSecondary }]}>
                    {prefs.pushEnabled ? "Notifications are enabled" : "All notifications muted"}
                  </Text>
                </View>
                <Switch
                  value={prefs.pushEnabled}
                  onValueChange={(v) => updatePref("pushEnabled", v)}
                  trackColor={{ false: theme.border, true: theme.primary }}
                  thumbColor={prefs.pushEnabled ? theme.surface : theme.textMuted}
                />
              </View>

              <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Notification Types</Text>
              <View style={[styles.card, !prefs.pushEnabled && { opacity: 0.5 }]}>
                {PREF_ITEMS.map((item, index) => {
                  const Icon = item.icon;
                  const isLast = index === PREF_ITEMS.length - 1;
                  return (
                    <View key={item.key}>
                      <View style={styles.prefRow}>
                        <View style={[styles.prefIcon, { backgroundColor: theme.primary + "10" }]}>
                          <Icon size={18} color={prefs.pushEnabled ? theme.primary : theme.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.prefTitle, { color: !prefs.pushEnabled ? theme.textMuted : theme.textPrimary }]}>
                            {item.title}
                          </Text>
                          <Text style={[styles.prefSub, { color: theme.textSecondary }]}>{item.subtitle}</Text>
                        </View>
                        <Switch
                          value={prefs[item.key] && prefs.pushEnabled}
                          onValueChange={(v) => updatePref(item.key, v)}
                          disabled={!prefs.pushEnabled}
                          trackColor={{ false: theme.border, true: theme.primary }}
                          thumbColor={prefs[item.key] && prefs.pushEnabled ? theme.surface : theme.textMuted}
                        />
                      </View>
                      {!isLast && <View style={[styles.divider, { backgroundColor: theme.divider }]} />}
                    </View>
                  );
                })}
              </View>

              <Text style={[styles.note, { color: theme.textMuted }]}>
                Make sure FreshCart is allowed to send notifications in your device's Settings app.
              </Text>
            </>
          )}
        </ScrollView>
      )}
    </AppScreen>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.border,
    },
    screenTitle: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
    markAllBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.primary + "15",
      alignItems: "center",
      justifyContent: "center",
    },
    // Tab Bar
    tabBar: {
      flexDirection: "row",
      borderRadius: 14,
      padding: 4,
      marginBottom: 20,
      borderWidth: 1,
    },
    tabBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    tabLabel: { fontSize: 14 },
    badge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
    },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    // Inbox
    listContent: { paddingBottom: 40 },
    listHeader: { fontSize: 12, fontWeight: "600", marginBottom: 12 },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 12 },
    emptyIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
    emptyTitle: { fontSize: 20, fontWeight: "700" },
    emptyText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
    // Settings
    settingsContent: { paddingBottom: 40 },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: theme.shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 6,
      elevation: 2,
      marginBottom: 20,
    },
    masterCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingVertical: 16,
    },
    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    masterTitle: { fontSize: 16, fontWeight: "600", marginBottom: 2 },
    masterSub: { fontSize: 13 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 10,
      marginLeft: 4,
    },
    prefRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
    prefIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    prefTitle: { fontSize: 15, fontWeight: "500", marginBottom: 2 },
    prefSub: { fontSize: 12 },
    divider: { height: 1, marginLeft: 50 },
    note: { fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
  });