import { useState } from "react";
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
import { supabase } from "../../src/lib/supabase";
import { colors } from "../../src/constants/colors";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setLoading(false);
    Alert.alert("Login failed", error.message);
    return;
  }

  // GET USER + PROFILE IN ONE GO
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    setLoading(false);
    Alert.alert("Error", "User not found");
    return;
  }

  // FETCH PROFILE (including role)
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

  // ROUTE BASED ON ROLE
  if (profile.role === "seller") {
    router.replace("/(seller)");
  } else if (profile.role === "customer") {
    router.replace("/(customer)");
  }else{
    router.replace("/(admin)")
  }
};

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
              placeholder="you@email.com"
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
            <TouchableOpacity
              style={styles.btn}
              onPress={handleLogin}
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
                <Text style={{ color: colors.blue  }}>Sign up</Text>
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
    marginTop: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  link: { marginTop: 16, alignItems: "center" },
  linkText: { color: colors.textMuted, fontSize: 13 },
});
