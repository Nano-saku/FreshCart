import { create } from "zustand";
import { supabase } from "../lib/supabase";

export const useCartStore = create((set, get) => ({
  items: [] as any[],
  addItem: async (storeProductId: string, quantity = 1) => {
    await supabase.from("cart_items").upsert(
      {
        customer_id: (await supabase.auth.getUser()).data.user?.id,
        store_product_id: storeProductId,
        quantity,
      },
      { onConflict: "customer_id,store_product_id" },
    );
    // Re-fetch cart
  },
  removeItem: async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
  },
}));
