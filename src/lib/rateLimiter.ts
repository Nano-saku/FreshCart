import AsyncStorage from '@react-native-async-storage/async-storage';

export async function checkRateLimit(
  key: string, maxAttempts: number, windowMs: number
): Promise<{ allowed: boolean; remainingMs: number }> {
  const raw = await AsyncStorage.getItem('rl:' + key);
  const now = Date.now();
  const record = raw ? JSON.parse(raw) : { attempts: 0, windowStart: now };

  if (now - record.windowStart > windowMs) {
    record.attempts = 0; record.windowStart = now;
  }
  record.attempts++;
  await AsyncStorage.setItem('rl:' + key, JSON.stringify(record));

  const allowed = record.attempts <= maxAttempts;
  const remainingMs = allowed ? 0 : (record.windowStart + windowMs) - now;
  return { allowed, remainingMs };
}
// In login: await checkRateLimit('login:' + email, 5, 15 * 60_000)
// Also enable Supabase Auth rate limits in dashboard settings.