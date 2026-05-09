import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";
import { User } from "@supabase/supabase-js";

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
    const biometricEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    
    setBiometricAvailable(hasHardware && isEnrolled);
    setBiometricEnabled(biometricEnabled === "true");

    // Check if Supabase has a persisted session
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      if (biometricEnabled === "true" && hasHardware && isEnrolled) {
        // Session exists but needs biometric unlock
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
          // Biometric failed, stay on login screen
          setCheckingSession(false);
          return;
        }
      } else {
        // No biometric required, just use the session
        const { data: { user } } = await supabase.auth.getUser();
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

  const fetchProfileAndRoute = async (user: User | null) => {
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

  const enableBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Enable fingerprint login",
      fallbackLabel: "Use passcode",
    });

    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
      setBiometricEnabled(true);
      Alert.alert("Success", "Fingerprint login enabled!");
    }
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

  type UserRole = "seller" | "customer" | "admin";
  const routeByRole = (role: UserRole) => {
    if (role === "seller") router.replace("/(seller)");
    else if (role === "customer") router.replace("/(customer)");
    else router.replace("/(admin)");
  };

  if (checkingSession) {
    return (
      <LinearGradient
        colors={colors.gradientColors}
        style={[styles.container, { justifyContent: "center", alignItems: "center" }]}
      >
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={colors.gradientColors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={styles.container}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>FreshCart</Text>
        <Text style={styles.subtitle}>
          Fresh groceries delivered to your door
        </Text>

        <BlurView intensity={40} tint="light" style={styles.card}>
          <View style={styles.cardInner}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              secureTextEntry
            />

            {/* Biometric login button */}
            {biometricEnabled && biometricAvailable && (
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: "#4CAF50" }]}
                onPress={handleBiometricLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>🔓 Log in with Fingerprint</Text>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.btn}
              onPress={handleManualLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Sign in</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.replace("/register")}
              style={styles.link}
            >
              <Text style={styles.linkText}>
                Don't have an account?{" "}
                <Text style={{ color: colors.blue }}>Sign up</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logo: { fontSize: 64, textAlign: "center", marginBottom: 8 },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 32,
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardInner: { backgroundColor: colors.glass, padding: 24 },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 14,
    color: "#fff",
    fontSize: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { color: colors.textMuted, fontSize: 13 },
});