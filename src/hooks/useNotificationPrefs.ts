import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../stores/authStore";

const LOCAL_KEY = "freshcart_notification_prefs";

export interface NotificationPrefs {
  orderUpdates: boolean;
  promotions: boolean;
  newArrivals: boolean;
  pushEnabled: boolean;
}

const DEFAULTS: NotificationPrefs = {
  orderUpdates: true,
  promotions: false,
  newArrivals: false,
  pushEnabled: true,
};

// Map between our local key names and the DB JSONB keys
const toDbFormat = (prefs: NotificationPrefs) => ({
  order_updates: prefs.orderUpdates,
  promotions: prefs.promotions,
  new_arrivals: prefs.newArrivals,
  push_enabled: prefs.pushEnabled,
});

const fromDbFormat = (raw: any): NotificationPrefs => ({
  orderUpdates: raw.order_updates ?? DEFAULTS.orderUpdates,
  promotions: raw.promotions ?? DEFAULTS.promotions,
  newArrivals: raw.new_arrivals ?? DEFAULTS.newArrivals,
  pushEnabled: raw.push_enabled ?? DEFAULTS.pushEnabled,
});

export function useNotificationPrefs() {
  const { user } = useAuthStore();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  // Load: try DB first (for authenticated users), fall back to AsyncStorage
  useEffect(() => {
    const load = async () => {
      try {
        if (user) {
          const { data } = await supabase
            .from("profiles")
            .select("notification_prefs")
            .eq("id", user.id)
            .single();

          if (data?.notification_prefs) {
            const parsed = fromDbFormat(data.notification_prefs);
            setPrefs(parsed);
            // Keep AsyncStorage in sync as a local cache
            await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(parsed));
            return;
          }
        }
        // Guest or DB miss — read from local cache
        const raw = await AsyncStorage.getItem(LOCAL_KEY);
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      } catch {
        // Silently fall through to defaults
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const updatePref = useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next); // Optimistic update

      try {
        // Persist locally
        await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));

        // Persist to DB if authenticated
        if (user) {
          await supabase
            .from("profiles")
            .update({ notification_prefs: toDbFormat(next) })
            .eq("id", user.id);
        }
      } catch {
        // Revert on failure
        setPrefs(prefs);
      }
    },
    [prefs, user]
  );

  return { prefs, loading, updatePref };
}