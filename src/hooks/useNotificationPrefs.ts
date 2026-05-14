import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFS_KEY = "freshcart_notification_prefs";

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

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updatePref = useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      try {
        await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {}
    },
    [prefs]
  );

  return { prefs, loading, updatePref };
}