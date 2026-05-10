import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface AuthState {
  session: any;
  profile: any;
  setSession: (s: any) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  setSession: (session) => set({ session }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));
