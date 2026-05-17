import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { AppScreen } from "../../src/components/AppScreen";
import { useTheme } from "../../src/contexts/ThemeContext";
import { ChevronLeft, Banknote, CreditCard, Clock } from "lucide-react-native";
import { useMemo } from 'react';

const METHODS = [
  {
    id: "cod",
    icon: Banknote,
    title: "Cash on Delivery",
    subtitle: "Pay in cash when your order arrives at your door",
    available: true,
  },
  {
    id: "bank",
    icon: CreditCard,
    title: "Bank / E-Wallet Transfer",
    subtitle: "GCash, Maya, BPI, UnionBank — coming soon",
    available: false,
  },
];

export default function PaymentMethodsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Payment Methods</Text>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.subtitle}>
          Payment method is selected at checkout. More options coming soon.
        </Text>

        {METHODS.map((method) => {
          const Icon = method.icon;
          return (
            <View
              key={method.id}
              style={[styles.card, method.available ? styles.cardActive : styles.cardDisabled]}
            >
              <View style={[styles.iconCircle, {
                backgroundColor: method.available ? theme.primary + "15" : theme.border,
              }]}>
                <Icon size={22} color={method.available ? theme.primary : theme.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={[styles.methodTitle, !method.available && { color: theme.textMuted }]}>
                    {method.title}
                  </Text>
                  {method.available && (
                    <View style={[styles.badge, { backgroundColor: theme.primary + "15" }]}>
                      <Text style={[styles.badgeText, { color: theme.primary }]}>Active</Text>
                    </View>
                  )}
                  {!method.available && (
                    <View style={[styles.badge, { backgroundColor: theme.border }]}>
                      <Clock size={10} color={theme.textMuted} />
                      <Text style={[styles.badgeText, { color: theme.textMuted }]}>Soon</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.methodSub, !method.available && { color: theme.textMuted }]}>
                  {method.subtitle}
                </Text>
              </View>
            </View>
          );
        })}

        <View style={[styles.infoBox, { backgroundColor: theme.primary + "10" }]}>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            💡 You'll always be shown available payment options when placing an order at checkout.
          </Text>
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
    title: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
    subtitle: { color: theme.textSecondary, fontSize: 14, marginBottom: 24, lineHeight: 20 },
    card: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.surface, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1.5 },
    cardActive: { borderColor: theme.primary + "40", shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
    cardDisabled: { borderColor: theme.border, opacity: 0.7 },
    iconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
    methodTitle: { fontSize: 15, fontWeight: "600", color: theme.textPrimary },
    methodSub: { fontSize: 13, color: theme.textSecondary, lineHeight: 18 },
    badge: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    infoBox: { borderRadius: 14, padding: 16, marginTop: 8 },
    infoText: { fontSize: 13, lineHeight: 20 },
  });