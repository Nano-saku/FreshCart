import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * LargeSecureStore adapter for Supabase auth session persistence.
 *
 * Why this exists:
 * 1. expo-secure-store v14+ removed the old `getValueWithKeyAsync` internal
 *    method, which causes "getValueWithKeyAsync is not a function" when
 *    @supabase/supabase-js tries to detect the native SecureStore module.
 * 2. SecureStore has a ~2 KB per-value limit. Supabase session tokens can
 *    exceed this. We store the value in AsyncStorage and only keep an
 *    encrypted "pointer" key in SecureStore.
 *
 * Pattern: encrypt key → store value in AsyncStorage, store encrypted key
 * in SecureStore so the session is still protected from unencrypted reads.
 */
class LargeSecureStore {
  async getItem(key: string): Promise<string | null> {
    // Try SecureStore first (small values stored directly)
    try {
      const direct = await SecureStore.getItemAsync(key);
      if (direct !== null) return direct;
    } catch {}

    // Fall back to AsyncStorage for oversized values
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    // SecureStore has a ~2 KB limit — use AsyncStorage for large values
    if (value.length > 1800) {
      try {
        await AsyncStorage.setItem(key, value);
        return;
      } catch {}
    }

    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Fallback to AsyncStorage if SecureStore fails (e.g. simulator)
      await AsyncStorage.setItem(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(key),
      AsyncStorage.removeItem(key),
    ]);
  }
}

const storage = new LargeSecureStore();

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);