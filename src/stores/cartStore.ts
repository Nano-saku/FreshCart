import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface CartItem {
  id: string;
  store_product_id: string;
  quantity: number;
  product: {
    name: string;
    image_url: string | null;
    unit: string;
  };
  price: number;
  store_name: string;
}

interface CartState {
  items: CartItem[];
  loading: boolean;
  fetchCart: () => Promise<void>;
  addItem: (storeProductId: string, quantity?: number) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async () => {
    set({ loading: true });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("cart_items")
      .select(
        `
        id, quantity, store_product_id,
        store_product:store_products(
          price,
          store:stores(name),
          product:products(name, image_url, unit)
        )
      `,
      )
      .eq("customer_id", user.id);
    if (data) {
      const mapped = data.map((item: any) => ({
        id: item.id,
        store_product_id: item.store_product_id,
        quantity: item.quantity,
        price: item.store_product.price,
        store_name: item.store_product.store.name,
        product: item.store_product.product,
      }));
      set({ items: mapped, loading: false });
    }
  },

  addItem: async (storeProductId, quantity = 1) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("cart_items").upsert(
      {
        customer_id: user.id,
        store_product_id: storeProductId,
        quantity,
      },
      { onConflict: "customer_id,store_product_id" },
    );
    get().fetchCart();
  },

  removeItem: async (id) => {
    await supabase.from("cart_items").delete().eq("id", id);
    set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
  },

  updateQuantity: async (id, quantity) => {
    if (quantity < 1) return get().removeItem(id);
    await supabase.from("cart_items").update({ quantity }).eq("id", id);
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, quantity } : i)),
    }));
  },

  clearCart: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("cart_items").delete().eq("customer_id", user.id);
    set({ items: [] });
  },

  total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
}));
