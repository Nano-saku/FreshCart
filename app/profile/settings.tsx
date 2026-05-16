import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Linking,
} from "react-native";
import { router } from "expo-router";
import { AppScreen } from "../../src/components/AppScreen";
import { useTheme } from "../../src/contexts/ThemeContext";
import { useAuthStore } from "../../src/stores/authStore";
import { supabase } from "../../src/lib/supabase";
import { ChevronLeft, ChevronRight, Globe, Info, HelpCircle, FileText, Trash2, Shield } from "lucide-react-native";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const styles = createStyles(theme);
  const [submitting, setSubmitting] = useState(false);

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.\n\nYour request will be sent to our support team.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Deletion",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            setSubmitting(true);
            try {
              await supabase
                .from("profiles")
                .update({ deletion_requested: true })
                .eq("id", user.id);
              Alert.alert("Request Submitted", "We'll process your account deletion within 7 business days.");
            } catch {
              Alert.alert("Error", "Failed to submit request. Please contact support.");
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const SECTIONS = [
    {
      title: "App",
      items: [
        { icon: Globe, label: "Language", value: "English", onPress: () => Alert.alert("Coming Soon", "Language selection will be available in a future update.") },
        { icon: Info, label: "App Version", value: "v1.0.0", onPress: null },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: HelpCircle, label: "Help & FAQ", value: null, onPress: () => Alert.alert("Support", "For help, email support@freshcart.app") },
        { icon: FileText, label: "Terms of Service", value: null, onPress: () => Linking.openURL("https://freshcart.app/terms").catch(() => { }) },
        { icon: Shield, label: "Privacy Policy", value: null, onPress: () => Linking.openURL("https://freshcart.app/privacy").catch(() => { }) },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: Trash2, label: submitting ? "Submitting..." : "Delete Account", value: null, destructive: true, onPress: handleDeleteAccount },
      ],
    },
  ];

  return (
    <AppScreen>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ChevronLeft size={22} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {SECTIONS.map((section) => (
          <View key={section.title} style={{ marginBottom: 24 }}>
            <Text style={styles.sectionLabel}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isLast = index === section.items.length - 1;
                return (
                  <View key={item.label}>
                    <TouchableOpacity
                      style={styles.row}
                      onPress={item.onPress ?? undefined}
                      disabled={!item.onPress || submitting}
                      activeOpacity={item.onPress ? 0.7 : 1}
                    >
                      <View style={[styles.iconCircle, {
                        backgroundColor: (item as any).destructive ? theme.error + "10" : theme.primary + "10",
                      }]}>
                        <Icon size={18} color={(item as any).destructive ? theme.error : theme.primary} />
                      </View>
                      <Text style={[styles.rowLabel, (item as any).destructive && { color: theme.error }]}>
                        {item.label}
                      </Text>
                      {item.value
                        ? <Text style={styles.rowValue}>{item.value}</Text>
                        : item.onPress
                          ? <ChevronRight size={18} color={(item as any).destructive ? theme.error : theme.textMuted} />
                          : null}
                    </TouchableOpacity>
                    {!isLast && <View style={[styles.divider, { backgroundColor: theme.divider }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.border },
    title: { fontSize: 20, fontWeight: "700", color: theme.textPrimary },
    sectionLabel: { color: theme.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    card: { backgroundColor: theme.surface, borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.border, shadowColor: theme.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6, elevation: 2 },
    row: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 16 },
    iconCircle: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    rowLabel: { flex: 1, fontSize: 15, fontWeight: "500", color: theme.textPrimary },
    rowValue: { fontSize: 14, color: theme.textMuted },
    divider: { height: 1, marginLeft: 50 },
  });