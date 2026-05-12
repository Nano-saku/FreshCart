import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

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
  loading: true,  // Start as true until auth check completes
  biometricEnabled: false,
  isLoggingOut: false,

  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
      loading: false,  // Auth check complete
      isLoggingOut: false
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

  // FULL LOGOUT
  signOut: async () => {
    set({ isLoggingOut: true });

    try {
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
      await supabase.auth.signOut();

      set({
        session: null,
        user: null,
        profile: null,
        biometricEnabled: false,
        isLoggingOut: false,
        loading: false
      });
    } catch (error) {
      console.error('Error during sign out:', error);
      set({ isLoggingOut: false, loading: false });
    }
  },

  // SOFT LOGOUT
  softSignOut: async () => {
    set({ isLoggingOut: true });

    try {
      await supabase.auth.signOut();
      set({
        session: null,
        user: null,
        profile: null,
        isLoggingOut: false,
        loading: false
      });
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
      if (get().isLoggingOut) {
        console.log('[Biometric] Skipped: logout in progress');
        return false;
      }

      const savedBiometric = await SecureStore.getItemAsync('biometric_enabled');
      if (savedBiometric !== 'true') return false;

      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      if (!refreshToken) {
        await SecureStore.setItemAsync('biometric_enabled', 'false');
        set({ biometricEnabled: false });
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
        if (error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found')) {
          await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
          await SecureStore.setItemAsync('biometric_enabled', 'false');
          set({ biometricEnabled: false });
        }
        return false;
      }

      if (!data.session) return false;

      set({
        session: data.session,
        user: data.session.user,
        biometricEnabled: true,
        loading: false
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