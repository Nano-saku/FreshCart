import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: any;
  loading: boolean;
  biometricEnabled: boolean;
  isLoggingOut: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: any) => void;
  fetchProfile: (userId: string) => Promise<any>;
  signOut: () => Promise<void>;
  softSignOut: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  checkBiometric: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  biometricEnabled: false,
  isLoggingOut: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      loading: false,
      isLoggingOut: false,
    });
  },

  setProfile: (profile) => set({ profile }),

  fetchProfile: async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      set({ profile });
      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  },

  // FULL LOGOUT — invalidates the token on Supabase, clears everything
  signOut: async () => {
    set({ isLoggingOut: true });
    try {
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_unlocked').catch(() => {});

      // Full sign out invalidates the token server-side — this is intentional
      await supabase.auth.signOut();

      set({
        session: null,
        user: null,
        profile: null,
        biometricEnabled: false,
        isLoggingOut: false,
        loading: false,
      });

      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during sign out:', error);
      set({ isLoggingOut: false, loading: false });
    }
  },

  // SOFT LOGOUT — does NOT call supabase.auth.signOut()
  // Calling signOut() invalidates the refresh token server-side,
  // which would break biometric re-login. Instead, we just clear
  // the local Supabase session from AsyncStorage manually so the
  // token stays alive on the server.
  softSignOut: async () => {
    set({ isLoggingOut: true });
    try {
      // Save the refresh token BEFORE wiping AsyncStorage
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');

      // Clear only Supabase's own session keys from AsyncStorage
      // This makes the app "forget" the session without invalidating it server-side
      const keys = await AsyncStorage.getAllKeys();
      const supabaseKeys = keys.filter(k => k.startsWith('supabase'));
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys);
      }

      // Restore our saved credentials — they must survive the wipe
      if (refreshToken) {
        await SecureStore.setItemAsync('refresh_token', refreshToken);
      }
      if (biometricEnabled) {
        await SecureStore.setItemAsync('biometric_enabled', biometricEnabled);
      }

      // Clear only the unlocked flag
      await SecureStore.deleteItemAsync('biometric_unlocked').catch(() => {});

      set({
        session: null,
        user: null,
        profile: null,
        isLoggingOut: false,
        loading: false,
        // biometricEnabled state stays as-is
      });

      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during soft sign out:', error);
      set({ isLoggingOut: false, loading: false });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    try {
      if (enabled) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.refresh_token) throw new Error('No active session to save');

        await SecureStore.setItemAsync('biometric_enabled', 'true');
        await SecureStore.setItemAsync('refresh_token', session.refresh_token);
        set({ biometricEnabled: true });
      } else {
        await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
        await SecureStore.setItemAsync('biometric_enabled', 'false');
        set({ biometricEnabled: false });
      }
    } catch (error) {
      console.error('Error setting biometric:', error);
      throw error;
    }
  },

  checkBiometric: async (): Promise<boolean> => {
    try {
      if (get().isLoggingOut) return false;

      const savedBiometric = await SecureStore.getItemAsync('biometric_enabled');
      if (savedBiometric !== 'true') return false;

      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        console.log('[Biometric] No refresh token found');
        return false;
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) return false;

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (!result.success) return false;

      const { data, error } = await supabase.auth.setSession({
        access_token: '',
        refresh_token: refreshToken,
      });

      if (error) {
        console.log('[Biometric] Session restore failed:', error.message);
        if (
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found')
        ) {
          await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
          await SecureStore.setItemAsync('biometric_enabled', 'false');
          set({ biometricEnabled: false });
        }
        return false;
      }

      if (!data.session) return false;

      // Save the new refresh token Supabase issued after rotation
      await SecureStore.setItemAsync('refresh_token', data.session.refresh_token);

      set({
        session: data.session,
        user: data.session.user,
        biometricEnabled: true,
        loading: false,
      });

      await get().fetchProfile(data.session.user.id);
      return true;
    } catch (error) {
      console.error('[Biometric] Unexpected error:', error);
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      await SecureStore.setItemAsync('biometric_enabled', 'false').catch(() => {});
      set({ biometricEnabled: false });
      return false;
    }
  },
}));