// src/hooks/useAdminGuard.ts
import { useEffect } from "react";
import { useRouter, useSegments } from "expo-router";
import { useAuthStore } from "../stores/authStore";

export function useAdminGuard() {
  const { session, profile } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }
    if (profile && profile.role !== "admin") {
      // Sellers and customers have no access to admin screens
      if (profile.role === "seller") {
        router.replace("/(seller)/index");
      } else {
        router.replace("/(customer)/index");
      }
    }
  }, [session, profile, segments]);

  return {
    profile,
    isAdmin: profile?.role === "admin",
    isSeller: profile?.role === "seller",
  };
}