import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../lib/logger';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: any;
  loading: boolean;
  biometricEnabled: boolean;
  isLoggingOut: boolean;
  justSoftLoggedOut: boolean; // flag so login screen knows not to auto-route
  setSession: (session: Session | null) => void;
  setProfile: (profile: any) => void;
  fetchProfile: (userId: string) => Promise<any>;
  signOut: () => Promise<void>;
  softSignOut: () => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  restoreSessionFromToken: (refreshToken: string) => Promise<Session | null>;
  
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  biometricEnabled: false,
  isLoggingOut: false,
  justSoftLoggedOut: false,

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

  

  // FULL LOGOUT — invalidates token server-side, clears everything
  signOut: async () => {
    set({ isLoggingOut: true, justSoftLoggedOut: false });
    try {
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_unlocked').catch(() => {});
      await supabase.auth.signOut();
      set({
        session: null,
        user: null,
        profile: null,
        biometricEnabled: false,
        isLoggingOut: false,
        justSoftLoggedOut: false,
        loading: false,
      });
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error during sign out:', error);
      set({ isLoggingOut: false, loading: false });
    }
  },

  // SOFT LOGOUT — does NOT invalidate the token server-side
  // We wipe AsyncStorage LAST so any in-flight session writes are cleared too
  softSignOut: async () => {
    set({ isLoggingOut: true, justSoftLoggedOut: true });
    try {
      // Snapshot credentials before any wipe
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const biometricFlag = await SecureStore.getItemAsync('biometric_enabled');


      // Clear state first so no component tries to use the session
      set({
        session: null,
        user: null,
        profile: null,
        isLoggingOut: false,
        loading: false,
        // justSoftLoggedOut stays true — login screen reads this
      });

     
      // Navigate first so the login screen mounts BEFORE we wipe AsyncStorage.
      // This prevents the login screen's getSession() from seeing a stale session.
      router.replace('/(auth)/login');

      // Small delay to let the navigation settle and login screen to mount
      await new Promise(resolve => setTimeout(resolve, 100));

      // NOW wipe Supabase's AsyncStorage keys — any session restoreSessionFromToken
      // wrote is cleared here, so getSession() on the login screen returns null
      const allKeys = await AsyncStorage.getAllKeys();
      const supabaseKeys = allKeys.filter(k => k.startsWith('supabase'));
      if (supabaseKeys.length > 0) {
        await AsyncStorage.multiRemove(supabaseKeys);
      }
      const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
      if (
        Date.now() - (new Date(sessionStorage.created_at).getTime()) > SESSION_MAX_AGE_MS
      ) {
        await supabase.auth.signOut();
        set({
          session: null,
          user: null,
          profile: null,
          biometricEnabled: false,
          isLoggingOut: false,
          justSoftLoggedOut: false,
          loading: false,
        });
        router.replace('/(auth)/login');
      }
      // Restore biometric credentials after the wipe
      if (refreshToken) await SecureStore.setItemAsync('refresh_token', refreshToken);
      if (biometricFlag) await SecureStore.setItemAsync('biometric_enabled', biometricFlag);
      await SecureStore.deleteItemAsync('biometric_unlocked').catch(() => {});

    } catch (error) {
      console.error('Error during soft sign out:', error);
      set({ isLoggingOut: false, justSoftLoggedOut: false, loading: false });
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

  restoreSessionFromToken: async (refreshToken: string): Promise<Session | null> => {
    try {
      const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

      if (error) {
        console.log('[Auth] refreshSession failed:', error.message);
        if (
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found') ||
          error.message.includes('Token has been revoked') ||
          error.status === 400
        ) {
          await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
          await SecureStore.setItemAsync('biometric_enabled', 'false').catch(() => {});
          set({ biometricEnabled: false });
        }
        return null;
      }

      if (!data.session) return null;

      // Save the rotated token
      await SecureStore.setItemAsync('refresh_token', data.session.refresh_token);

      set({
        session: data.session,
        user: data.session.user,
        biometricEnabled: true,
        justSoftLoggedOut: false, // clear the flag on successful login
        loading: false,
      });

      

      await get().fetchProfile(data.session.user.id);
      return data.session;
    } catch (error) {
      logger.error('[Auth] restoreSessionFromToken error:', error);
      return null;
    }
  },
}));