import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider } from "../src/contexts/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "../src/lib/supabase";
import { ActivityIndicator, View } from "react-native";
import { useTheme } from "../src/contexts/ThemeContext";
import { useAuthStore } from "../src/stores/authStore";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();
  const { setSession, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session on app start
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        const profile = await fetchProfile(session.user.id); // await so role is ready before routing
        setLoading(false);
        // Route to the correct dashboard immediately on startup
        if (profile?.role === "admin")        router.replace("/(admin)");
        else if (profile?.role === "seller")  router.replace("/(seller)");
        // customers: already on (customer) by default — no redirect needed
      } else {
        setSession(null);
        setLoading(false);
      }
    });

    // Listen for auth state changes from Supabase.
    // IMPORTANT: We only update the store here — navigation is handled by:
    //   • authStore signOut/softSignOut (explicit logouts)
    //   • login.tsx (after successful login/biometric restore)
    //   • the segment guard below (protecting seller/admin routes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only sync store on real new sessions (e.g. login from another device/tab)
      // Do NOT navigate from here — it races with login.tsx and authStore routing.
      // Do NOT call setSession(null) on SIGNED_OUT — authStore already clears the store.
      if (session?.user) {
        setSession(session);
        fetchProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inSellerGroup = segments[0] === "(seller)";
    const inAdminGroup  = segments[0] === "(admin)";
    const inAuthGroup   = segments[0] === "(auth)";

    const { user, profile } = useAuthStore.getState();

    // Protected routes with no user → send to login
    if ((inSellerGroup || inAdminGroup) && !user) {
      router.replace("/(auth)/login");
      return;
    }

    // Auth screen with an active user (e.g. deep link) → route to their dashboard
    if (inAuthGroup && user && profile) {
      routeByRole(profile.role);
    }

    // Customer route is public — no redirect when there's no user
  }, [loading, segments]);

  // Sync, no network call — uses the role already stored in authStore
  const routeByRole = (role: string) => {
    if (role === "seller")      router.replace("/(seller)");
    else if (role === "admin")  router.replace("/(admin)");
    else                        router.replace("/(customer)");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(customer)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/register" options={{ headerShown: false }} />
        <Stack.Screen name="(seller)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}