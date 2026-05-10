import { useState, useEffect } from "react";
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
} from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { User, Lock, Fingerprint, ArrowRight } from "lucide-react-native";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_UNLOCKED_KEY = "biometric_unlocked";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const biometricEnabled = await SecureStore.getItemAsync(
      BIOMETRIC_ENABLED_KEY,
    );

    setBiometricAvailable(hasHardware && isEnrolled);
    setBiometricEnabled(biometricEnabled === "true");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      if (biometricEnabled === "true" && hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Log in with fingerprint",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await SecureStore.setItemAsync(BIOMETRIC_UNLOCKED_KEY, "true");
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) await fetchProfileAndRoute(user);
        } else {
          setCheckingSession(false);
          return;
        }
      } else {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await fetchProfileAndRoute(user);
      }
    }

    setCheckingSession(false);
  };

  const handleManualLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        Alert.alert("Login failed", error.message);
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

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Log in with fingerprint",
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_UNLOCKED_KEY, "true");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await fetchProfileAndRoute(user);
      } else {
        Alert.alert("No session", "Please sign in manually first.");
      }
    }
  };

  const routeByRole = (role: string) => {
    if (role === "seller") router.replace("/(seller)");
    else if (role === "customer") router.replace("/(customer)");
    else router.replace("/(admin)");
  };

  if (checkingSession) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🥬</Text>
            </View>
            <Text style={styles.title}>FreshCart</Text>
            <Text style={styles.subtitle}>
              Fresh groceries delivered to your door
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.welcomeSub}>Sign in to continue</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <User size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={18} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>
            </View>

            {/* Biometric login button */}
            {biometricEnabled && biometricAvailable && (
              <TouchableOpacity
                style={styles.biometricBtn}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                <Fingerprint size={20} color={colors.primary} />
                <Text style={styles.biometricText}>
                  Log in with Fingerprint
                </Text>
              </TouchableOpacity>
            )}

            {/* Sign In Button */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              onPress={handleManualLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <>
                  <Text style={styles.signInText}>Sign in</Text>
                  <ArrowRight size={18} color={colors.textLight} />
                </>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <TouchableOpacity
              onPress={() => router.replace("/register")}
              style={styles.link}
            >
              <Text style={styles.linkText}>
                Don't have an account?{" "}
                <Text style={styles.linkHighlight}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary + "10",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  biometricText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  signInBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInText: {
    color: colors.textLight,
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  linkHighlight: {
    color: colors.primary,
    fontWeight: "700",
  },
});
