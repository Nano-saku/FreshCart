import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { supabase } from "../src/lib/supabase";
import { useAuthStore } from "../src/stores/authStore";

const queryClient = new QueryClient();

function RootLayoutNav() {
  const {
    session,
    setSession,
    profile,
    fetchProfile,
    signOut,
    checkBiometric,
    isLoggingOut // NEW: Check if logout is in progress
  } = useAuthStore();
  
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);

  // Handle auth state changes with async profile fetch
  const handleAuthChange = async (newSession: any) => {
    setSession(newSession);
    const inAuth = segments[0] === "(auth)";

    if (!newSession) {
      if (!inAuth) router.replace("/(auth)/login");
      setIsReady(true);
      return;
    }

    // Session exists — MUST fetch profile before routing
    const fetchedProfile = await fetchProfile(newSession.user.id);

    if (!fetchedProfile) {
      // Profile missing — clean up and redirect to login
      await signOut();
      if (!inAuth) router.replace("/(auth)/login");
      setIsReady(true);
      return;
    }

    // Now safe to route based on role
    if (inAuth) {
      const target = fetchedProfile.role === "seller" || fetchedProfile.role === "admin"
        ? "/(admin)"
        : "/(customer)";
      router.replace(target);
    }

    setIsReady(true);
  };

  // Initial setup - check session and biometric
  useEffect(() => {
    const initializeAuth = async () => {
      // First, check if biometric can restore session
      if (!isLoggingOut && !biometricChecked) {
        const biometricSuccess = await checkBiometric();
        setBiometricChecked(true);
        
        if (biometricSuccess) {
          // Biometric restored session - let handleAuthChange process it
          const { data: { session } } = await supabase.auth.getSession();
          await handleAuthChange(session);
          return;
        }
      }

      // No biometric or failed - check normal session
      supabase.auth.getSession().then(({ data: { session } }) => {
        handleAuthChange(session);
      });
    };

    initializeAuth();
  }, []);

  // Listen for auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Don't process auth changes during logout
        if (isLoggingOut) {
          console.log('Auth change ignored: logout in progress');
          return;
        }

        await handleAuthChange(session);
      }
    );

    return () => subscription.unsubscribe();
  }, [isLoggingOut]); // Re-subscribe when isLoggingOut changes

  // Guard against role-switching when already inside the app
  useEffect(() => {
    if (!isReady || !session || !profile) return;

    const inAdmin = segments[0] === "(admin)";
    const inCustomer = segments[0] === "(customer)";
    const isAdminRole = profile.role === "admin" || profile.role === "seller";

    if (isAdminRole && inCustomer) {
      router.replace("/(admin)");
    } else if (!isAdminRole && inAdmin) {
      router.replace("/(customer)");
    }
  }, [segments, isReady, session, profile]);

  if (!isReady) return null;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <RootLayoutNav />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}