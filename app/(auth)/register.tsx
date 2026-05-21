import { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useMemo } from 'react';
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { useTheme } from "../../src/contexts/ThemeContext";
import { validate } from "../../src/lib/validate";
import { checkRateLimit } from "../../src/lib/rateLimiter";
import {
  ShieldCheck,
  ArrowRight,
  User,
  Store,
  Mail,
  Phone,
  Lock,
} from "lucide-react-native";

type UserRole = "customer" | "seller";

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);
  const isProcessing = useRef(false);

  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleRegister = async () => {
    // Guard against double-taps
    if (isProcessing.current) return;
    isProcessing.current = true;

    if (!fullName || !email || !password || !phone) {
      Alert.alert("Error", "Please fill in all fields");
      isProcessing.current = false;  // Reset guard
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      isProcessing.current = false;  // Reset guard
      return;
    }
    const { allowed, remainingMs } = await checkRateLimit('register:' + email, 3, 30 * 60_000);
    if (!allowed) {
      const mins = Math.ceil(remainingMs / 60_000);
      Alert.alert("Too many attempts", `Please try again in ${mins} minute(s).`);
      isProcessing.current = false;  // Reset guard
      return;
    }

    setLoading(true);
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
      isProcessing.current = false;  // Reset guard
      return;
    }

    setLoading(false);
    setShowVerify(true);
    startResendTimer();
    isProcessing.current = false;  // Reset guard
  };

  const handleVerify = async () => {
    if (!validate.fullName(fullName))
      return Alert.alert("Error", "Name must be 2–80 characters.");
    if (!validate.email(email))
      return Alert.alert("Error", "Enter a valid email address.");
    if (!validate.phone(phone))
      return Alert.alert("Error", "Enter a valid PH mobile number (09XXXXXXXXX).");
    if (!validate.password(password))
      return Alert.alert("Error", "Password must be 8–128 characters.");
    if (!validate.code(verifyCode)) {
      Alert.alert("Error", "Please enter the 6-digit code");
      return;
    }

    setVerifyLoading(true);
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ email_verified: true })
        .eq("id", user.id);
    }

    setVerifyLoading(false);
    await supabase.auth.signOut();
    setShowVerify(false);

    Alert.alert(
      "Email Verified! 🎉",
      "Your account is ready. Please sign in.",
      [{ text: "Sign In", onPress: () => router.replace("/(auth)/login") }],
    );
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    const { error } = await supabase.auth.resend({ type: "signup", email });
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
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const roleOptions: {
    value: UserRole;
    label: string;
    icon: any;
    desc: string;
  }[] = [
      {
        value: "customer",
        label: "Customer",
        icon: User,
        desc: "Browse and shop",
      },
      {
        value: "seller",
        label: "Seller",
        icon: Store,
        desc: "Manage your store",
      },
    ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.inner}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/freshcarticon.png")} style={{ width: 240, height: 240, marginBottom: -60, marginTop: -100 }} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join FreshCart today</Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Role Selection */}
          <Text style={styles.label}>Account Type</Text>
          <View style={styles.roleButtons}>
            {roleOptions.map(({ value, label, icon: Icon, desc }) => {
              const isSelected = role === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.roleButton,
                    isSelected && styles.roleButtonActive,
                  ]}
                  onPress={() => setRole(value)}
                >
                  <Icon
                    size={22}
                    color={isSelected ? theme.primary : theme.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleLabel,
                      isSelected && styles.roleLabelActive,
                    ]}
                  >
                    {label}
                  </Text>
                  <Text style={styles.roleDesc}>{desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form Fields */}
          {[
            {
              label: "Full name",
              value: fullName,
              setter: setFullName,
              placeholder: "Juan dela Cruz",
              icon: User,
            },
            {
              label: "Email",
              value: email,
              setter: setEmail,
              placeholder: "your@email.com",
              keyboard: "email-address" as any,
              icon: Mail,
            },
            {
              label: "Phone",
              value: phone,
              setter: setPhone,
              placeholder: "09XXXXXXXXX",
              keyboard: "phone-pad" as any,
              icon: Phone,
              Capitalize: false,
            },
            {
              label: "Password",
              value: password,
              setter: setPassword,
              placeholder: "••••••••",
              secure: true,
              icon: Lock,
            },
          ].map(
            ({
              label,
              value,
              setter,
              placeholder,
              keyboard,
              secure,
              icon: Icon,
            }) => (
              <View key={label} style={styles.inputGroup}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputContainer}>
                  <Icon size={18} color={theme.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor={theme.textMuted}
                    keyboardType={keyboard}
                    secureTextEntry={secure}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            ),
          )}

          <TouchableOpacity
            style={[styles.createBtn, (loading || isProcessing.current) && styles.createBtnDisabled]}
            onPress={handleRegister}
            disabled={loading || isProcessing.current}
          >
            {loading ? (
              <ActivityIndicator color={theme.textPrimary} />
            ) : (
              <>
                <Text style={styles.createBtnText}>Create account</Text>
                <ArrowRight size={18} color={theme.textSecondary} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.replace("/login")}
            style={styles.link}
          >
            <Text style={styles.linkText}>
              Already have an account?{" "}
              <Text style={styles.linkHighlight}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Verification Modal */}
      <Modal visible={showVerify} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalInner}>
              <View style={styles.verifyIcon}>
                <ShieldCheck size={32} color={theme.primary} />
              </View>
              <Text style={styles.modalTitle}>Verify Your Email</Text>
              <Text style={styles.modalSubtitle}>
                We sent a 6-digit code to{""}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              <View style={styles.codeInputBox}>
                <TextInput
                  style={styles.codeInput}
                  placeholder="000000"
                  placeholderTextColor={theme.textMuted}
                  value={verifyCode}
                  onChangeText={(t) =>
                    setVerifyCode(t.replace(/[^0-9]/g, "").slice(0, 6))
                  }
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
                {verifyLoading ? (
                  <ActivityIndicator color={theme.textPrimary} />
                ) : (
                  <>
                    <Text style={styles.verifyBtnText}>Verify Email</Text>
                    <ArrowRight size={16} color={theme.textPrimary} />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleResend}
                disabled={resendTimer > 0}
                style={{ marginTop: 16 }}
              >
                <Text
                  style={[
                    styles.resendText,
                    resendTimer > 0 && { color: theme.textMuted },
                  ]}
                >
                  {resendTimer > 0
                    ? `Resend code in ${resendTimer}s`
                    : "Didn't receive it? Resend"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowVerify(false);
                  setVerifyCode("");
                }}
                style={{ marginTop: 12 }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  inner: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: theme.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: theme.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  label: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 4,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  roleButton: {
    flex: 1,
    backgroundColor: theme.background,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.border,
    gap: 6,
  },
  roleButtonActive: {
    backgroundColor: theme.primary + "10",
    borderColor: theme.primary,
  },
  roleLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 4,
  },
  roleLabelActive: {
    color: theme.primary,
    fontWeight: "700",
  },
  roleDesc: {
    color: theme.textMuted,
    fontSize: 11,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: theme.textPrimary,
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnDisabled: {
    opacity: 0.6,
  },
  createBtnText: {
    color: theme.textPrimary,
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  linkHighlight: {
    color: theme.primary,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    backgroundColor: theme.surface,
    shadowColor: theme.shadowColorStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  modalInner: {
    padding: 28,
    alignItems: "center",
  },
  verifyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: theme.primary + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalSubtitle: {
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  emailHighlight: {
    color: theme.primary,
    fontWeight: "600",
  },
  codeInputBox: {
    backgroundColor: theme.background,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.border,
    paddingHorizontal: 20,
    paddingVertical: 14,
    width: "100%",
    marginBottom: 20,
  },
  codeInput: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 8,
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    width: "100%",
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  verifyBtnText: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: "700",
  },
  resendText: {
    color: theme.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  cancelText: {
    color: theme.textMuted,
    fontSize: 14,
  },
});
