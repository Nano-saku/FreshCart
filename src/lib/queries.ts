import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { useAuthStore } from "../stores/authStore";

// Read user from authStore — avoids redundant network round-trips
const getUser = () => useAuthStore.getState().user;

// ==================== PRODUCTS ====================

export function useProducts(storeId?: string | null, category?: string | null) {
  return useQuery({
    queryKey: ["products", storeId, category],
    queryFn: async () => {
      let query = supabase
        .from("store_products")
        .select("*, product:products(*, category:categories(name)), store:stores(name, logo_url)")
        .eq("is_available", true)
        .gt("stock_qty", 0);

      if (storeId) query = query.eq("store_id", storeId);
      if (category) query = query.ilike("product.category.name", category);

      const { data, error } = await query.order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_products")
        .select("*, product:products(*, category:categories(name)), store:stores(name, address)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data, error } = await supabase
        .from("store_products")
        .select("*, product:products(*, category:categories(name)), store:stores(name)")
        .ilike("product.name", `%${query}%`)
        .eq("is_available", true)
        .gt("stock_qty", 0);
      if (error) throw error;
      return data ?? [];
    },
    enabled: query.length > 1,
  });
}

// ==================== STORES ====================

export function useStores(userLocation?: { lat: number; lng: number } | null) {
  return useQuery({
    queryKey: ["stores", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("id, name, address, logo_url, is_active, latitude, longitude, description")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;

      const storesWithDistance = (data || []).map((store: any) => {
        let distance: number | undefined;
        if (userLocation && store.latitude && store.longitude) {
          const R = 6371;
          const dLat = ((store.latitude - userLocation.lat) * Math.PI) / 180;
          const dLon = ((store.longitude - userLocation.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((userLocation.lat * Math.PI) / 180) *
              Math.cos((store.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distance = R * c;
        }
        // Rating is static per store — not randomised on every render
        return { ...store, distance, rating: 4.2 };
      });

      if (userLocation) {
        storesWithDistance.sort((a, b) => (a.distance || 999) - (b.distance || 999));
      }

      return storesWithDistance;
    },
    staleTime: 1000 * 60 * 5,
  });
}

// ==================== ORDERS ====================

export function useCustomerOrders() {
  return useQuery({
    queryKey: ["customer-orders"],
    queryFn: async () => {
      const user = getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*, store:stores(name, phone, address), order_items(*, store_product:store_products(price, product:products(name, unit, image_url)))")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: ["seller-orders"],
    queryFn: async () => {
      const user = getUser();
      if (!user) return [];

      const { data: storeData } = await supabase
        .from("stores")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      if (!storeData) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*, customer:profiles(full_name, phone), store:stores(name), order_items(id)")
        .eq("store_id", storeData.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, store:stores(name, phone, address), customer:profiles(full_name, phone), order_items(*, store_product:store_products(price, product:products(name, unit, image_url)))")
        .eq("id", orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

// ==================== ADMIN ====================

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: orders },
        { count: products },
        { count: stores },
        { data: revenue },
        { data: recent },
      ] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("stores").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total_amount").eq("status", "delivered"),
        supabase
          .from("orders")
          .select("*, store:stores(name), customer:profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const totalRevenue = revenue?.reduce((sum: number, o: any) => sum + (o.total_amount ?? 0), 0) ?? 0;

      return {
        orders: orders ?? 0,
        products: products ?? 0,
        stores: stores ?? 0,
        revenue: totalRevenue,
        recentOrders: recent ?? [],
      };
    },
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, category:categories(name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminStores() {
  return useQuery({
    queryKey: ["admin-stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*, owner:profiles(full_name)")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ==================== MUTATIONS ====================

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data, error } = await supabase.from("orders").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });
}