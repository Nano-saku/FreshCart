import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Modal,
} from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";
import { useTheme } from "../../src/contexts/ThemeContext";
import { User, Lock, Fingerprint, ArrowRight, ShieldCheck } from "lucide-react-native";
import { logger } from "../../src/lib/logger";
import { checkRateLimit } from "../../src/lib/rateLimiter";
import { useMemo } from 'react';


const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_UNLOCKED_KEY = "biometric_unlocked";

export default function LoginScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { restoreSessionFromToken, justSoftLoggedOut } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const didAutoTrigger = useRef(false);
  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    if (didAutoTrigger.current) return;
    didAutoTrigger.current = true;

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const biometricFlag = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const refreshToken = await SecureStore.getItemAsync("refresh_token");


      setBiometricAvailable(hasHardware && isEnrolled);
      setBiometricEnabled(biometricFlag === "true");

      // CRITICAL: If we just soft-logged out, skip the getSession() check entirely.
      // softSignOut wipes AsyncStorage after navigating here, so getSession() might
      // still return a stale session during the brief window before the wipe completes.
      if (justSoftLoggedOut) {
        setCheckingSession(false);
        // Still auto-trigger biometric if available
        if (refreshToken && biometricFlag === "true" && hasHardware && isEnrolled) {
          await attemptBiometricRestore(refreshToken);
        }
        return;
      }

      // Normal app open — check for an active local session
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        await fetchProfileAndRoute(existingSession.user);
        return;
      }

      // No active session — auto-trigger biometric if available
      if (refreshToken && biometricFlag === "true" && hasHardware && isEnrolled) {
        setCheckingSession(false);
        await attemptBiometricRestore(refreshToken);
        return;
      }

      setCheckingSession(false);
    } catch (err) {
      logger.error("[Login] Init error:", err);
      setCheckingSession(false);
    }
  };

  const attemptBiometricRestore = async (refreshToken: string) => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Log in with fingerprint",
        fallbackLabel: "Use passcode",
        disableDeviceFallback: false,
      });

      if (!result.success) return; // cancelled — form stays visible, button still there

      setLoading(true);

      const session = await restoreSessionFromToken(refreshToken);

      if (!session) {
        setLoading(false);
        setBiometricEnabled(false);
        Alert.alert("Session Expired", "Please sign in with your email and password.");
        return;
      }

      await SecureStore.setItemAsync(BIOMETRIC_UNLOCKED_KEY, "true");
      await fetchProfileAndRoute(session.user);
    } catch (err) {
      logger.error("[Biometric] Restore error:", err);
      setLoading(false);
    }
  };

  const handleManualLogin = async () => {
    setLoading(true);
    try {
      const { allowed, remainingMs } = await checkRateLimit('login:' + email, 5, 15 * 60_000);
      if (!allowed) {
        setLoading(false);
        const mins = Math.ceil(remainingMs / 60_000);
        Alert.alert("Too many attempts", `Please try again in ${mins} minute(s).`);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setLoading(false);
        if (error.message.includes("Email not confirmed")) {
          Alert.alert(
            "Email Not Verified",
            "Your email address has not been confirmed yet. Would you like us to resend the verification code?",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Resend Code", onPress: () => handleResendVerification() },
            ]
          );
        } else {
          Alert.alert("Login failed", error.message);
        }
        return;
      }
      if (!data.session || !data.user) {
        setLoading(false);
        Alert.alert("Error", "No session created");
        return;
      }
      await fetchProfileAndRoute(data.user);
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", "Something went wrong");
    }
  };

  const handleBiometricLogin = async () => {
    const refreshToken = await SecureStore.getItemAsync("refresh_token");
    if (!refreshToken) {
      Alert.alert("Biometric Login Unavailable", "Please sign in with your email and password first.");
      return;
    }
    await attemptBiometricRestore(refreshToken);
  };
  const handleResendVerification = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your email address first.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setVerifyEmail(email);
        setShowVerify(true);
        Alert.alert(
          "Verification Sent",
          "A new verification code has been sent to your email. Please enter it below.",
        );
      }
    } catch (err) {
      Alert.alert("Error", "Failed to resend verification email.");
    } finally {
      setLoading(false);
    }
  };
  const handleVerifyFromLogin = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      Alert.alert("Error", "Please enter the 6-digit verification code.");
      return;
    }

    setVerifyLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: verifyEmail,
        token: verifyCode,
        type: "signup",
      });

      if (error) {
        Alert.alert("Invalid Code", error.message);
        setVerifyLoading(false);
        return;
      }

      // Update profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ email_verified: true })
          .eq("id", user.id);
      }

      setShowVerify(false);
      setVerifyCode("");
      setVerifyLoading(false);

      Alert.alert(
        "Email Verified! 🎉",
        "Your email has been confirmed. You can now sign in.",
        [{
          text: "Sign In", onPress: () => {
            // Clear password for security
            setPassword("");
          }
        }]
      );
    } catch (err) {
      setVerifyLoading(false);
      Alert.alert("Error", "Verification failed. Please try again.");
    }
  };
  const fetchProfileAndRoute = async (user: any) => {
    if (!user) {
      setLoading(false);
      Alert.alert("Error", "User not found");
      return;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, full_name, email_verified")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      setLoading(false);
      Alert.alert("Error", "Profile not found. Please register again.");
      return;
    }
    if (!profile.email_verified) {
      setLoading(false);
      Alert.alert("Email not verified", "Please verify your email first.");
      return;
    }
    setLoading(false);
    routeByRole(profile.role);
  };

  const routeByRole = (role: string) => {
    if (!role) {
      Alert.alert("Error", "Account role is missing. Please contact support.");
      return;
    }

    switch (role) {
      case "admin":
        router.replace("/(admin)");
        break;
      case "seller":
        router.replace("/(seller)");
        break;
      case "customer":
        router.replace("/(customer)");
        break;
      case "banned":
        Alert.alert("Account Suspended", "Your account has been suspended. Please contact support.");
        break;
      default:
        // Unknown role - safest to route to customer and log the anomaly
        logger.error(`[Login] Unknown role: ${role} for user, routing to customer`);
        router.replace("/(customer)");
    }
  };


  if (checkingSession) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/freshcarticon.png")} style={{ width: 240, height: 240, position: "relative", top: 50 }} />
          {/* <Text style={[styles.title, { color: theme.textPrimary }]}>FreshCart</Text> */}
          <Text style={[styles.subtitle, { color: theme.textSecondary }, { position: "absolute", bottom: 0 }]}>
            Fresh groceries delivered to your door
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
          <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>Welcome back!</Text>
          <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>Sign in to continue</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Email</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <User size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="your@email.com"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textPrimary }]}>Password</Text>
            <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Lock size={18} color={theme.textMuted} />
              <TextInput
                style={[styles.input, { color: theme.textPrimary }]}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
            </View>
          </View>

          {biometricEnabled && biometricAvailable && (
            <TouchableOpacity
              onPress={handleBiometricLogin}
              style={[styles.biometricBtn, { borderColor: theme.primary + "30", backgroundColor: theme.primary + "10" }]}
            >
              <Fingerprint size={20} color={theme.primary} />
              <Text style={[styles.biometricText, { color: theme.primary }]}>Log in with Fingerprint</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={handleManualLogin}
            disabled={loading || !email || !password}
            style={[
              styles.signInBtn,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
              (loading || !email || !password) && styles.signInBtnDisabled,
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={[styles.signInText, { color: "#fff" }]}>Sign in</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

        </View>
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
                  We sent a 6-digit code to{" "}
                  <Text style={styles.emailHighlight}>{verifyEmail}</Text>
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
                  onPress={handleVerifyFromLogin}
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
                  onPress={() => {
                    setShowVerify(false);
                    setVerifyCode("");
                  }}
                  style={{ marginTop: 16 }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        <TouchableOpacity onPress={() => router.replace("/register")} style={styles.link}>
          <Text style={[styles.linkText, { color: theme.textSecondary }]}>
            Don't have an account?{" "}
            <Text style={[styles.linkHighlight, { color: theme.primary }]}>Sign up</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.replace("/(customer)")} style={styles.link}>
          <Text style={[styles.linkText, { color: theme.textSecondary }]}>
            Preview as <Text style={[styles.linkHighlight, { color: theme.primary }]}>Guest</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: typeof import("../../src/constants/colors").lightTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 40 },
    logoContainer: { alignItems: "center", marginBottom: 32 },
    logoCircle: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    logoEmoji: { fontSize: 40 },
    title: { fontSize: 32, fontWeight: "800", marginBottom: 6 },
    subtitle: { fontSize: 14, textAlign: "center" },
    card: { borderRadius: 24, padding: 24, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 16, elevation: 5 },
    welcomeText: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
    welcomeSub: { fontSize: 14, marginBottom: 24 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
    inputContainer: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 4, borderWidth: 1 },
    input: { flex: 1, paddingVertical: 14, fontSize: 15 },
    biometricBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1 },
    biometricText: { fontSize: 14, fontWeight: "600" },
    signInBtn: { borderRadius: 16, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    signInBtnDisabled: { opacity: 0.6 },
    signInText: { fontWeight: "700", fontSize: 16 },
    link: { marginTop: 20, alignItems: "center" },
    linkText: { fontSize: 14 },
    linkHighlight: { fontWeight: "700" },
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
    },
    verifyBtnText: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "700",
    },
    cancelText: {
      color: theme.textMuted,
      fontSize: 14,
    },
  });