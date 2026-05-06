import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: "customer" | "admin" | "seller";
  avatar_url: string | null;
  email_verified?: boolean;
}

interface AuthState {
  session: any;
  profile: Profile | null;
  setSession: (s: any) => void;
  setProfile: (p: Profile | null) => void;
  fetchProfile: (userId: string) => Promise<Profile | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  
  fetchProfile: async (userId: string): Promise<Profile | null> => {
    const currentSession = get().session;
    if (!currentSession) return null; // ✅ returns null, not undefined

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) {
      console.error("fetchProfile error:", error?.message || "No data");
      set({ profile: null });
      return null; // ✅ always null
    }

    const validRoles: Profile["role"][] = ["customer", "admin", "seller"];
    const profile: Profile = {
      id: data.id,
      full_name: data.full_name || "",
      phone: data.phone || "",
      role: validRoles.includes(data.role) ? data.role : "customer",
      avatar_url: data.avatar_url || null,
      email_verified: data.email_verified || false,
    };

    set({ profile });
    return profile; // ✅ returns Profile
  },
  
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
}));