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
  loading: true,
  biometricEnabled: false,
  isLoggingOut: false,

  setSession: (session) => {
    set({ 
      session, 
      user: session?.user ?? null,
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

  // FULL LOGOUT - Clears everything including biometric
  signOut: async () => {
    set({ isLoggingOut: true });
    
    try {
      // Clear all SecureStore items
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      await SecureStore.deleteItemAsync('biometric_enabled').catch(() => {});
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear state
      set({ 
        session: null, 
        user: null, 
        profile: null,
        biometricEnabled: false,
        isLoggingOut: false 
      });
    } catch (error) {
      console.error('Error during sign out:', error);
      set({ isLoggingOut: false });
    }
  },

  // SOFT LOGOUT - Keeps biometric for quick re-login
  softSignOut: async () => {
    set({ isLoggingOut: true });
    
    try {
      // Sign out from Supabase but keep SecureStore tokens
      await supabase.auth.signOut();
      
      // Clear state but keep biometric settings
      set({ 
        session: null, 
        user: null, 
        profile: null,
        isLoggingOut: false 
      });
    } catch (error) {
      console.error('Error during soft sign out:', error);
      set({ isLoggingOut: false });
    }
  },

  setBiometricEnabled: async (enabled: boolean) => {
    try {
      if (enabled) {
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.refresh_token) {
          throw new Error('No active session to save');
        }

        // Save settings
        await SecureStore.setItemAsync('biometric_enabled', 'true');
        await SecureStore.setItemAsync('refresh_token', session.refresh_token);
        
        set({ biometricEnabled: true });
      } else {
        // Disable biometric
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
      // CRITICAL: Don't run biometric during logout
      if (get().isLoggingOut) {
        console.log('[Biometric] Skipped: logout in progress');
        return false;
      }

      // Check if biometric is enabled
      const savedBiometric = await SecureStore.getItemAsync('biometric_enabled');
      
      if (savedBiometric !== 'true') {
        console.log('[Biometric] Not enabled');
        return false;
      }

      // Get refresh token
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (!refreshToken) {
        console.log('[Biometric] No refresh token found');
        // Clean up invalid state
        await SecureStore.setItemAsync('biometric_enabled', 'false');
        set({ biometricEnabled: false });
        return false;
      }

      // Check hardware availability
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        console.log('[Biometric] Hardware not available or not enrolled');
        return false;
      }

      // Authenticate
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (!result.success) {
        console.log('[Biometric] Authentication failed or cancelled');
        return false;
      }

      // Try to restore session from refresh token
      console.log('[Biometric] Attempting session restore...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: '', // Will be regenerated
        refresh_token: refreshToken,
      });

      if (error) {
        console.error('[Biometric] Session restore failed:', error.message);
        
        // If refresh token is invalid, clean up
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('Refresh Token Not Found')) {
          console.log('[Biometric] Cleaning up invalid refresh token');
          await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
          await SecureStore.setItemAsync('biometric_enabled', 'false');
          set({ biometricEnabled: false });
        }
        
        return false;
      }

      if (!data.session) {
        console.log('[Biometric] No session returned');
        return false;
      }

      console.log('[Biometric] Session restored successfully');
      
      // Set session in store
      set({ 
        session: data.session, 
        user: data.session.user,
        biometricEnabled: true 
      });
      
      // Fetch profile
      const fetchedProfile = await get().fetchProfile(data.session.user.id);
      
      if (!fetchedProfile) {
        console.error('[Biometric] Failed to fetch profile');
        return false;
      }

      console.log('[Biometric] Login complete');
      return true;

    } catch (error) {
      console.error('[Biometric] Unexpected error:', error);
      
      // Clean up on any unexpected error
      await SecureStore.deleteItemAsync('refresh_token').catch(() => {});
      await SecureStore.setItemAsync('biometric_enabled', 'false').catch(() => {});
      set({ biometricEnabled: false });
      
      return false;
    }
  },
}));