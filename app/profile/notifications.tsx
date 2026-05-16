import {
  View, Text, Switch, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { AppScreen } from "../../src/components/AppScreen";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useNotificationPrefs } from "../../src/hooks/useNotificationPrefs";
import { ChevronLeft, Bell, Tag, Package, BellOff } from "lucide-react-native";

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

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { prefs, loading, updatePref } = useNotificationPrefs();
  const styles = createStyles(theme);

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Master toggle */}
            <View style={[styles.card, styles.masterCard]}>
              <View style={[styles.iconCircle, {
                backgroundColor: prefs.pushEnabled ? theme.primary + "15" : theme.border,
              }]}>
                {prefs.pushEnabled
                  ? <Bell size={22} color={theme.primary} />
                  : <BellOff size={22} color={theme.textMuted} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.masterTitle}>Push Notifications</Text>
                <Text style={styles.masterSub}>
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

            <Text style={styles.sectionLabel}>Notification Types</Text>
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
                        <Text style={[styles.prefTitle, !prefs.pushEnabled && { color: theme.textMuted }]}>
                          {item.title}
                        </Text>
                        <Text style={styles.prefSub}>{item.subtitle}</Text>
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

            <Text style={styles.note}>
              Make sure FreshCart is allowed to send notifications in your device's Settings app.
            </Text>
          </>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
    title: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
    card: { backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2, marginBottom: 20 },
    masterCard: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16, paddingHorizontal: 16 },
    iconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    masterTitle: { fontSize: 16, fontWeight: "600", color: theme.textPrimary, marginBottom: 2 },
    masterSub: { fontSize: 13, color: theme.textSecondary },
    sectionLabel: { color: theme.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    prefRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
    prefIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    prefTitle: { fontSize: 15, fontWeight: "500", color: theme.textPrimary, marginBottom: 2 },
    prefSub: { fontSize: 12, color: theme.textSecondary },
    divider: { height: 1, marginLeft: 50 },
    note: { color: theme.textMuted, fontSize: 12, lineHeight: 18, textAlign: "center", paddingHorizontal: 8 },
  });