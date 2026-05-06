import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Modal,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { ShieldCheck, ArrowRight, User, Store } from "lucide-react-native";

type UserRole = "customer" | "seller";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);

  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);

  const handleRegister = async () => {
    if (!fullName || !email || !password || !phone) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, phone, role },
      },
    });

    if (error || !data.user) {
      Alert.alert("Registration Failed", error?.message || "Unknown error");
      setLoading(false);
      return;
    }

    // 2. Create profile immediately (before email verification)
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: data.user.id,
        email: email,
        full_name: fullName,
        phone: phone,
        role: role,
        email_verified: false,
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("Profile insert error:", profileError);
      Alert.alert("Error", "Account created but profile setup failed. Please try again.");
      setLoading(false);
      return;
    }

    setLoading(false);
    setShowVerify(true);
    startResendTimer();
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    setVerifyLoading(true);

    // 1. Verify OTP
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: verifyCode,
      type: "signup",
    });

    if (error) {
      setVerifyLoading(false);
      Alert.alert("Invalid Code", error.message);
      return;
    }

    // 2. Get verified user
    const { data: { user } } = await supabase.auth.getUser();

    // 3. Update email_verified flag (profile already exists)
    if (user) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", user.id);

      if (updateError) {
        console.error("Profile update error:", updateError);
      }
    }

    setVerifyLoading(false);
    await supabase.auth.signOut();
    setShowVerify(false);

    Alert.alert(
      "Email Verified! 🎉",
      "Your account is ready. Please sign in.",
      [{ text: "Sign In", onPress: () => router.replace("/(auth)/login") }]
    );
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    startResendTimer();
    Alert.alert("Code Resent", "Check your email for the new code");
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const roleOptions: { value: UserRole; label: string; icon: any; desc: string }[] = [
    { value: "customer", label: "Customer", icon: User, desc: "Browse and shop" },
    { value: "seller", label: "Seller", icon: Store, desc: "Manage your store" },
  ];

  return (
    <LinearGradient
      colors={colors.gradientColors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Join FreshCart today</Text>

        <BlurView intensity={40} tint="light" style={styles.card}>
          <View style={styles.cardInner}>

            <Text style={styles.label}>Account Type</Text>
            <View style={styles.roleButtons}>
              {roleOptions.map(({ value, label, icon: Icon, desc }) => {
                const isSelected = role === value;
                return (
                  <TouchableOpacity
                    key={value}
                    style={[styles.roleButton, isSelected && styles.roleButtonActive]}
                    onPress={() => setRole(value)}
                  >
                    <Icon size={20} color={isSelected ? colors.accent : colors.textMuted} />
                    <Text style={[styles.roleLabel, isSelected && styles.roleLabelActive]}>
                      {label}
                    </Text>
                    <Text style={styles.roleDesc}>{desc}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {[
              { label: "Full name", value: fullName, setter: setFullName, placeholder: "Juan dela Cruz" },
              { label: "Email", value: email, setter: setEmail, placeholder: "you@email.com", keyboard: "email-address" as any },
              { label: "Phone", value: phone, setter: setPhone, placeholder: "09XXXXXXXXX", keyboard: "phone-pad" as any },
              { label: "Password", value: password, setter: setPassword, placeholder: "••••••••", secure: true },
            ].map(({ label, value, setter, placeholder, keyboard, secure }) => (
              <View key={label}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={keyboard}
                  secureTextEntry={secure}
                  autoCapitalize="none"
                />
              </View>
            ))}

            <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.replace("/login")} style={styles.link}>
              <Text style={styles.linkText}>
                Already have an account? <Text style={{ color: colors.blue }}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </ScrollView>

      {/* Verification Modal */}
      <Modal visible={showVerify} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={60} tint="dark" style={styles.modalCard}>
            <View style={styles.modalInner}>
              <View style={styles.verifyIcon}>
                <ShieldCheck size={32} color={colors.accent} />
              </View>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <Text style={styles.modalSubtitle}>
                We sent a 6-digit code to{"\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              <View style={styles.codeInputBox}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor={colors.textMuted}
                  value={verifyCode}
                  onChangeText={(t) => setVerifyCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[styles.verifyBtn, verifyLoading && { opacity: 0.7 }]}
                onPress={handleVerify}
                disabled={verifyLoading}
              >
                {verifyLoading
                  ? <ActivityIndicator color="#000" />
                  : <><Text style={styles.verifyBtnText}>Verify Email</Text><ArrowRight size={16} color="#000" /></>
                }
              </TouchableOpacity>

              <TouchableOpacity onPress={handleResend} disabled={resendTimer > 0} style={{ marginTop: 16 }}>
                <Text style={[styles.resendText, resendTimer > 0 && { color: colors.textMuted }]}>
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Didn't receive it? Resend"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => { setShowVerify(false); setVerifyCode(""); }} style={{ marginTop: 12 }}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 },
  logo: { fontSize: 52, textAlign: "center", marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: 28, marginTop: 4 },
  card: { borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.glassBorder },
  cardInner: { backgroundColor: colors.glass, padding: 24 },
  roleButtons: { flexDirection: "row", gap: 8, marginBottom: 8 },
  roleButton: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12,
    padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
  },
  roleButtonActive: { backgroundColor: colors.accent + "20", borderColor: colors.accent + "50" },
  roleLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 6 },
  roleLabelActive: { color: colors.accent },
  roleDesc: { color: colors.textMuted, fontSize: 10, marginTop: 2, opacity: 0.7 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 14,
    color: "#fff", fontSize: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  btn: {
    backgroundColor: colors.primary, borderRadius: 14, padding: 16,
    alignItems: "center", marginTop: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { color: colors.textMuted, fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { width: "100%", maxWidth: 340, borderRadius: 24, overflow: "hidden", borderWidth: 1, borderColor: colors.glassBorder },
  modalInner: { backgroundColor: colors.glass, padding: 28, alignItems: "center" },
  verifyIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.accent + "20", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  modalTitle: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 8 },
  modalSubtitle: { color: colors.textMuted, fontSize: 14, textAlign: "center", marginBottom: 24 },
  emailHighlight: { color: colors.accent, fontWeight: "600" },
  codeInputBox: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", paddingHorizontal: 20, paddingVertical: 14, width: "100%", marginBottom: 20 },
  codeInput: { color: "#fff", fontSize: 24, fontWeight: "700", textAlign: "center", letterSpacing: 8 },
  verifyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, width: "100%" },
  verifyBtnText: { color: "#000", fontSize: 16, fontWeight: "700" },
  resendText: { color: colors.accent, fontSize: 14, fontWeight: "500" },
  cancelText: { color: "#6B7280", fontSize: 14 },
});