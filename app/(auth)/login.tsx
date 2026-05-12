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
import { useTheme } from "../../src/contexts/ThemeContext";
import { User, Lock, Fingerprint, ArrowRight } from "lucide-react-native";

const BIOMETRIC_ENABLED_KEY = "biometric_enabled";
const BIOMETRIC_UNLOCKED_KEY = "biometric_unlocked";

export default function LoginScreen() {
  const { theme, isDark } = useTheme();
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
    const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);

    setBiometricAvailable(hasHardware && isEnrolled);
    setBiometricEnabled(biometricEnabled === "true");

    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      if (biometricEnabled === "true" && hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Log in with fingerprint",
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        if (result.success) {
          await SecureStore.setItemAsync(BIOMETRIC_UNLOCKED_KEY, "true");
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await fetchProfileAndRoute(user);
        } else {
          setCheckingSession(false);
          return;
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await fetchProfileAndRoute(user);
      }
    }

    setCheckingSession(false);
  };

  const handleManualLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
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

  const styles = createStyles(theme);

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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary + "15" }]}>
            <Text style={styles.logoEmoji}>🥬</Text>
          </View>
          <Text style={[styles.title, { color: theme.textPrimary }]}>FreshCart</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Fresh groceries delivered to your door
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadowColor }]}>
          <Text style={[styles.welcomeText, { color: theme.textPrimary }]}>Welcome back!</Text>
          <Text style={[styles.welcomeSub, { color: theme.textSecondary }]}>Sign in to continue</Text>

          {/* Email */}
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

          {/* Password */}
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

          {/* Biometric login button */}
          {biometricEnabled && biometricAvailable && (
            <TouchableOpacity onPress={handleBiometricLogin} style={[styles.biometricBtn, { borderColor: theme.primary + "30", backgroundColor: theme.primary + "10" }]}>
              <Fingerprint size={20} color={theme.primary} />
              <Text style={[styles.biometricText, { color: theme.primary }]}>Log in with Fingerprint</Text>
            </TouchableOpacity>
          )}

          {/* Sign In Button */}
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

        {/* Register Link */}
        <TouchableOpacity onPress={() => router.replace("/register")} style={styles.link}>
          <Text style={[styles.linkText, { color: theme.textSecondary }]}>
            Don't have an account?{" "}
            <Text style={[styles.linkHighlight, { color: theme.primary }]}>Sign up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  welcomeSub: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
  },
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: "600",
  },
  signInBtn: {
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInBtnDisabled: {
    opacity: 0.6,
  },
  signInText: {
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    marginTop: 20,
    alignItems: "center",
  },
  linkText: {
    fontSize: 14,
  },
  linkHighlight: {
    fontWeight: "700",
  },
});