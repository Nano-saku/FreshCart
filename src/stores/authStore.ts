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
  isLoggingOut: boolean; // NEW: Prevents biometric during logout
  setSession: (session: Session | null) => void;
  setProfile: (profile: any) => void;
  fetchProfile: (userId: string) => Promise<any>;
  signOut: () => Promise<void>;
  softSignOut: () => Promise<void>; // NEW: Soft logout
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
      isLoggingOut: false // Reset logout flag when setting new session
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
    set({ isLoggingOut: true }); // Set flag BEFORE logout starts
    
    try {
      // Clear SecureStore
      await SecureStore.deleteItemAsync('refresh_token');
      await SecureStore.deleteItemAsync('biometric_enabled');
      
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
    set({ isLoggingOut: true }); // Set flag BEFORE logout starts
    
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
      await SecureStore.setItemAsync('biometric_enabled', enabled.toString());
      
      if (enabled) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.refresh_token) {
          await SecureStore.setItemAsync('refresh_token', session.refresh_token);
        }
      } else {
        await SecureStore.deleteItemAsync('refresh_token');
      }
      
      set({ biometricEnabled: enabled });
    } catch (error) {
      console.error('Error setting biometric:', error);
      throw error;
    }
  },

  checkBiometric: async (): Promise<boolean> => {
    try {
      // CRITICAL: Don't run biometric during logout
      if (get().isLoggingOut) {
        console.log('Biometric check skipped: logout in progress');
        return false;
      }

      const savedBiometric = await SecureStore.getItemAsync('biometric_enabled');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      
      if (savedBiometric !== 'true' || !refreshToken) {
        return false;
      }

      // Check hardware availability
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (!compatible || !enrolled) {
        return false;
      }

      // Authenticate
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Restore session from refresh token
        const { data, error } = await supabase.auth.setSession({
          access_token: '', // Will be regenerated
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Session restore error:', error);
          return false;
        }

        if (data.session) {
          set({ 
            session: data.session, 
            user: data.session.user,
            biometricEnabled: true 
          });
          
          // Fetch profile after session restore
          const fetchedProfile = await get().fetchProfile(data.session.user.id);
          
          if (fetchedProfile) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Biometric check error:', error);
      return false;
    }
  },
}));