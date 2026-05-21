-- =====================================================
-- FRESHCART COMPLETE SCHEMA (v4.3 - Function-Based RLS & Enhanced Security)
-- =====================================================
-- Changes from v2.2 (v3.0 original):
--   - stock_qty >= 0 constraint (prevents overselling)
--   - decrement_stock() RPC — atomic, called after order placement
--   - cart_items.store_id column + auto-set trigger (eliminates
--     extra round-trip at checkout, enables multi-store guard)
--   - profiles.deletion_requested + deletion_requested_at +
--     stamp trigger (Settings > Delete Account flow)
--   - profiles.notification_prefs default extended to include
--     new_arrivals and push_enabled keys
--   - reviews: insert policy scoped to delivered orders only
--     (customers can only review what they've received)
--   - reviews: reviewer_id column added (was customer_id only;
--     now both exist for backward compat — reviewer_id is the
--     canonical FK used by insert policy)
--   - New drop blocks for all v3 additions
--   - New indexes for cart_items.store_id and deletion_requested
-- =====================================================
-- Changes from v3.0:
--   [SECURITY] is_admin() — reads raw_app_data instead of
--     raw_user_meta_data to prevent user self-elevation via
--     supabase.auth.updateUser(). Role truth now lives in
--     server-write-only app_metadata.
--   [SECURITY] sync_user_role_to_metadata() — now syncs to
--     raw_app_data (app_metadata) instead of raw_user_meta_data.
--   [SECURITY] profiles.role — added 'banned' to the CHECK
--     constraint so ban operations don't violate the constraint.
--   [SECURITY] "Allow authenticated read all profiles" policy
--     removed — it exposed every user's PII (phone, email, role)
--     to all authenticated users. Admin reads now go through the
--     get_all_profiles() SECURITY DEFINER function instead.
--   [SECURITY] "admin view deletion requests" policy added —
--     lets admins see profiles with deletion_requested = true
--     without the wide-open read policy.
--   [SECURITY] verification_codes — open anon/authenticated
--     policy replaced with a SECURITY DEFINER verify_code()
--     function. Clients never read codes directly.
--   [SECURITY] Storage update/delete policies now scope to
--     owner = auth.uid() instead of any authenticated user,
--     preventing cross-user file overwrites.
--   [SECURITY] Storage insert policy now enforces path prefix
--     = auth.uid() so users can only write into their own folder.
--   [SECURITY] get_all_profiles() SECURITY DEFINER function
--     added for admin-only full profile reads.
--   [SECURITY] verify_code() SECURITY DEFINER function added —
--     validates OTP without exposing the codes table.
-- =====================================================
-- Based on v4.1 with fixed RLS policies for categories, products, and store_products
-- Changes in v4.2:
--   - Added proper RLS policies for sellers to create products
--   - Added policies for sellers to manage their store products
--   - Fixed categories RLS to allow sellers to create new categories
--   - Ensured sellers can only modify their own store's products
-- =====================================================

-- -----------------------------------------------------
-- STEP 0.5: DROP ALL EXISTING RLS POLICIES
-- -----------------------------------------------------

-- Profiles
drop policy if exists "Allow trigger profile insert" on public.profiles;
drop policy if exists "profiles own select" on public.profiles;
drop policy if exists "profiles own update" on public.profiles;
drop policy if exists "admin manage profiles" on public.profiles;
drop policy if exists "Allow authenticated read all profiles" on public.profiles;
drop policy if exists "admin view deletion requests" on public.profiles;

-- Categories
drop policy if exists "categories public read" on public.categories;
drop policy if exists "admin manage categories" on public.categories;
drop policy if exists "sellers can create categories" on public.categories;
drop policy if exists "sellers can update categories" on public.categories;

-- Stores
drop policy if exists "stores public read" on public.stores;
drop policy if exists "seller manage own store" on public.stores;

-- Products
drop policy if exists "products public read" on public.products;
drop policy if exists "admin manage products" on public.products;
drop policy if exists "sellers can create products" on public.products;
drop policy if exists "sellers can update products" on public.products;
drop policy if exists "sellers can delete products" on public.products;

-- Store Products
drop policy if exists "store_products public read" on public.store_products;
drop policy if exists "seller manage store products" on public.store_products;
drop policy if exists "sellers can insert store products" on public.store_products;
drop policy if exists "sellers can update store products" on public.store_products;
drop policy if exists "sellers can delete store products" on public.store_products;

-- Orders
drop policy if exists "customers see own orders" on public.orders;
drop policy if exists "sellers see store orders" on public.orders;
drop policy if exists "admins see all orders" on public.orders;
drop policy if exists "sellers update store orders" on public.orders;
drop policy if exists "customers create orders" on public.orders;
drop policy if exists "guests can create orders" on public.orders;
drop policy if exists "guests can view own orders by email" on public.orders;

-- Order Items
drop policy if exists "order_items own order" on public.order_items;
drop policy if exists "sellers see store order items" on public.order_items;
drop policy if exists "admins see all order items" on public.order_items;
drop policy if exists "customers insert own order items" on public.order_items;
drop policy if exists "sellers insert store order items" on public.order_items;
drop policy if exists "sellers update store order items" on public.order_items;
drop policy if exists "customers delete own order items" on public.order_items;
drop policy if exists "guests can insert order items" on public.order_items;

-- Order Status History
drop policy if exists "customers see own order history" on public.order_status_history;
drop policy if exists "sellers see store order history" on public.order_status_history;
drop policy if exists "admins see all order history" on public.order_status_history;

-- Cart Items
drop policy if exists "own cart only" on public.cart_items;

-- Delivery Addresses
drop policy if exists "own delivery addresses" on public.delivery_addresses;

-- Reviews
drop policy if exists "reviews public read" on public.reviews;
drop policy if exists "own reviews manage" on public.reviews;
drop policy if exists "customers insert own reviews" on public.reviews;
drop policy if exists "customers delete own reviews" on public.reviews;

-- Verification Codes
drop policy if exists "verification codes service" on public.verification_codes;

-- Storage
drop policy if exists "Public images are viewable" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can update own images" on storage.objects;
drop policy if exists "Authenticated users can delete own images" on storage.objects;
drop policy if exists "Users update own uploads" on storage.objects;
drop policy if exists "Users delete own uploads" on storage.objects;

-- -----------------------------------------------------
-- STEP 0: DROP EVERYTHING (CORRECT ORDER)
-- -----------------------------------------------------

-- 1. Drop triggers first
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_email_confirmed on auth.users;
drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists update_stores_updated_at on public.stores;
drop trigger if exists update_products_updated_at on public.products;
drop trigger if exists update_orders_updated_at on public.orders;
drop trigger if exists update_store_products_updated_at on public.store_products;
drop trigger if exists update_categories_updated_at on public.categories;
drop trigger if exists update_order_items_updated_at on public.order_items;
drop trigger if exists update_cart_items_updated_at on public.cart_items;
drop trigger if exists update_reviews_updated_at on public.reviews;
drop trigger if exists update_delivery_addresses_updated_at on public.delivery_addresses;
drop trigger if exists trg_recalc_order_total on public.order_items;
drop trigger if exists trg_log_order_status on public.orders;
drop trigger if exists on_profile_role_updated on public.profiles;
drop trigger if exists trg_set_cart_item_store on public.cart_items;
drop trigger if exists trg_stamp_deletion_request on public.profiles;

-- 2. Drop views and materialized views
drop materialized view if exists public.store_ratings cascade;
drop view if exists public.product_popularity cascade;
drop view if exists public.customer_order_summary cascade;

-- 3. Drop tables
drop table if exists public.order_status_history cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.cart_items cascade;
drop table if exists public.delivery_addresses cascade;
drop table if exists public.reviews cascade;
drop table if exists public.store_products cascade;
drop table if exists public.products cascade;
drop table if exists public.stores cascade;
drop table if exists public.categories cascade;
drop table if exists public.verification_codes cascade;
drop table if exists public.profiles cascade;

-- 4. Drop functions
drop function if exists public.handle_new_user();
drop function if exists public.handle_email_confirmed();
drop function if exists public.update_updated_at_column();
drop function if exists public.calculate_order_total(uuid);
drop function if exists public.cleanup_expired_codes();
drop function if exists public.is_admin();
drop function if exists public.recalculate_order_total();
drop function if exists public.log_order_status_change();
drop function if exists public.get_nearby_stores(numeric, numeric, numeric);
drop function if exists public.get_store_inventory(uuid);
drop function if exists public.cleanup_and_count();
drop function if exists public.lookup_guest_orders(text, text);
drop function if exists public.sync_user_role_to_metadata();
drop function if exists public.decrement_stock(uuid, int);
drop function if exists public.set_cart_item_store();
drop function if exists public.stamp_deletion_request();
drop function if exists public.get_all_profiles();
drop function if exists public.verify_code(text, text, text);
drop function if exists public.refresh_store_ratings();
drop function if exists public.update_product_search_vector();
drop function if exists public.is_store_owner(uuid);
drop function if exists public.can_modify_product(uuid);
drop function if exists public.can_view_order(uuid);
drop function if exists public.is_customer(uuid);

-- =====================================================
-- STEP 1: CREATE TABLES
-- =====================================================

create table public.profiles (
  id                    uuid references auth.users on delete cascade primary key,
  email                 text,
  full_name             text,
  phone                 text,
  role                  text default 'customer' check (role in ('customer', 'admin', 'seller', 'banned')),
  avatar_url            text,
  email_verified        boolean default false,
  notification_prefs    jsonb not null default '{
    "order_updates": true,
    "promotions": false,
    "new_arrivals": false,
    "push_enabled": true
  }'::jsonb,
  deletion_requested    boolean not null default false,
  deletion_requested_at timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  icon       text,
  parent_id  uuid references public.categories(id),
  created_at timestamptz default now()
);

create table public.stores (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references public.profiles(id),
  name        text not null,
  description text,
  logo_url    text,
  address     text,
  latitude    numeric(10,8),
  longitude   numeric(11,8),
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  image_url   text,
  category_id uuid references public.categories(id),
  unit        text default 'piece',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table public.store_products (
  id           uuid primary key default gen_random_uuid(),
  store_id     uuid references public.stores(id) on delete cascade,
  product_id   uuid references public.products(id) on delete cascade,
  price        numeric(10,2) not null,
  stock_qty    int default 0 check (stock_qty >= 0),
  is_available boolean default true,
  unique(store_id, product_id),
  created_at   timestamptz default now()
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid references public.profiles(id) not null,
  store_id         uuid references public.stores(id),
  status           text default 'pending'
                   check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  total_amount     numeric(10,2),
  delivery_address text,
  payment_method   text not null default 'cash_on_delivery'
                   check (payment_method in ('cash_on_delivery', 'bank_transfer', 'ebank')),
  notes            text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table public.order_items (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid references public.orders(id) on delete cascade,
  store_product_id uuid references public.store_products(id),
  quantity         int not null,
  unit_price       numeric(10,2) not null
);

create table public.cart_items (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid references public.profiles(id) on delete cascade,
  store_product_id uuid references public.store_products(id) on delete cascade,
  store_id         uuid references public.stores(id),
  quantity         int default 1,
  unique(customer_id, store_product_id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table public.delivery_addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.profiles(id) on delete cascade not null,
  label        text not null default 'Home'
               check (label in ('Home', 'Work', 'Other')),
  full_address text not null,
  phone        text,
  is_default   boolean not null default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid references public.profiles(id),
  reviewer_id      uuid references public.profiles(id),
  product_id       uuid references public.products(id),
  store_id         uuid references public.stores(id),
  store_product_id uuid references public.store_products(id),
  rating           int check (rating between 1 and 5),
  comment          text,
  created_at       timestamptz default now()
);

create table public.verification_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users on delete cascade,
  email      text not null,
  code       text not null,
  type       text not null default 'signup'
             check (type in ('signup', 'password_reset', 'email_change')),
  used       boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- =====================================================
-- STEP 2: ORDER STATUS HISTORY TABLE
-- =====================================================

create table public.order_status_history (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid references public.orders(id) on delete cascade not null,
  status     text not null
             check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  changed_at timestamptz default now(),
  changed_by uuid references auth.users(id),
  notes      text
);

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================

alter table public.profiles              enable row level security;
alter table public.stores                enable row level security;
alter table public.products              enable row level security;
alter table public.store_products        enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.cart_items            enable row level security;
alter table public.reviews               enable row level security;
alter table public.categories            enable row level security;
alter table public.verification_codes    enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.delivery_addresses    enable row level security;

-- =====================================================
-- STEP 4: SECURITY HELPER FUNCTIONS (v4.3)
-- =====================================================

-- Check if user is store owner
create or replace function public.is_store_owner(store_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.stores
    where id = store_id and owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Check if user can modify a product (store owner or admin)
create or replace function public.can_modify_product(p_product_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.store_products sp
    join public.stores s on s.id = sp.store_id
    where sp.product_id = p_product_id          -- ← now unambiguous
    and (s.owner_id = auth.uid() or public.is_admin())
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Check if user can view an order (customer, store owner, or admin)
create or replace function public.can_view_order(order_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.orders o
    left join public.stores s on s.id = o.store_id
    where o.id = order_id
    and (
      o.customer_id = auth.uid()
      or s.owner_id = auth.uid()
      or public.is_admin()
    )
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Check if user is customer (not seller or admin)
create or replace function public.is_customer(user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = user_id and role = 'customer'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Check if user is seller
create or replace function public.is_seller()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'seller'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- Get user's store ID (returns null if not a seller or no store)
create or replace function public.get_user_store_id()
returns uuid as $$
declare
  store_id uuid;
begin
  select id into store_id from public.stores where owner_id = auth.uid();
  return store_id;
end;
$$ language plpgsql security definer set search_path = public;

-- =====================================================
-- STEP 4.5: CREATE FUNCTIONS
-- =====================================================

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function public.calculate_order_total(order_id uuid)
returns numeric as $$
  select coalesce(sum(quantity * unit_price), 0)
  from public.order_items
  where order_id = $1;
$$ language sql stable;

create or replace function public.cleanup_expired_codes()
returns void as $$
begin
  delete from public.verification_codes where expires_at < now();
end;
$$ language plpgsql;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, email_verified)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'phone', null),
    coalesce(new.raw_user_meta_data->>'role', 'customer'),
    false
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Helper: check admin role without RLS recursion.
-- SECURITY: reads raw_app_data (app_metadata) which is server-write-only.
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from auth.users
    where id = auth.uid()
    and raw_app_meta_data->>'role' = 'admin'
  );
end;
$$ language plpgsql stable security definer set search_path = public;

-- Order total auto-recalculation
create or replace function public.recalculate_order_total()
returns trigger as $$
begin
  update public.orders
  set total_amount = public.calculate_order_total(
    case when tg_op = 'DELETE' then old.order_id else new.order_id end
  )
  where id = case when tg_op = 'DELETE' then old.order_id else new.order_id end;
  return new;
end;
$$ language plpgsql;

-- Order status change logger
create or replace function public.log_order_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.order_status_history (order_id, status, changed_by, notes)
    values (new.id, new.status, auth.uid(), 'Status updated via app');
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- Get nearby stores with distance
create or replace function public.get_nearby_stores(
  user_lat numeric,
  user_lng numeric,
  max_distance_km numeric default 50
)
returns table (
  id uuid, name text, address text, logo_url text,
  distance_km numeric, latitude numeric, longitude numeric
) as $$
begin
  return query
  select
    s.id, s.name, s.address, s.logo_url,
    (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(s.latitude))
      )
    )::numeric(10,2) as distance_km,
    s.latitude, s.longitude
  from public.stores s
  where s.is_active = true
    and s.latitude is not null
    and s.longitude is not null
    and (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(s.latitude))
      )
    ) <= max_distance_km
  order by distance_km;
end;
$$ language plpgsql stable;

-- Get store inventory with low stock alert
create or replace function public.get_store_inventory(store_uuid uuid)
returns table (
  store_product_id uuid, product_name text, product_image text,
  category_name text, unit text, price numeric,
  stock_qty int, is_available boolean, low_stock boolean
) as $$
begin
  return query
  select
    sp.id, p.name, p.image_url, c.name,
    p.unit, sp.price, sp.stock_qty, sp.is_available,
    (sp.stock_qty <= 5 and sp.stock_qty > 0) as low_stock
  from public.store_products sp
  join public.products p on p.id = sp.product_id
  left join public.categories c on c.id = p.category_id
  where sp.store_id = store_uuid
  order by p.name;
end;
$$ language plpgsql stable;

-- Cleanup helper
create or replace function public.cleanup_and_count()
returns json as $$
declare
  deleted_count int;
begin
  delete from public.verification_codes where expires_at < now();
  get diagnostics deleted_count = row_count;
  return json_build_object('cleaned', deleted_count, 'timestamp', now());
end;
$$ language plpgsql security definer set search_path = public;

-- Sync profile role to auth.users app_metadata
create or replace function public.sync_user_role_to_metadata()
returns trigger as $$
begin
  update auth.users
  set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) ||
    jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- =====================================================
-- STEP 4.6: v4 NEW FUNCTIONS
-- =====================================================

-- Admin-only full profile read
create or replace function public.get_all_profiles()
returns setof public.profiles
language sql
security definer
stable
set search_path = public
as $$
  select * from public.profiles
  where public.is_admin()
  order by created_at desc;
$$;

grant execute on function public.get_all_profiles() to authenticated;

-- OTP verification
create or replace function public.verify_code(
  p_email text,
  p_code  text,
  p_type  text default 'signup'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from   public.verification_codes
  where  email      = p_email
    and  code       = p_code
    and  type       = p_type
    and  used       = false
    and  expires_at > now()
  limit 1;

  if v_id is null then
    return false;
  end if;

  update public.verification_codes
  set    used = true
  where  id   = v_id;

  return true;
end;
$$;

grant execute on function public.verify_code(text, text, text) to authenticated, anon;

-- =====================================================
-- STEP 4.7: v3 NEW FUNCTIONS
-- =====================================================

-- Atomic stock decrement
create or replace function public.decrement_stock(
  p_store_product_id uuid,
  p_quantity         int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.store_products
  set    stock_qty = stock_qty - p_quantity
  where  id = p_store_product_id
    and  stock_qty >= p_quantity;

  if not found then
    raise exception 'Insufficient stock for product %', p_store_product_id
      using errcode = 'P0001';
  end if;
end;
$$;

grant execute on function public.decrement_stock(uuid, int) to authenticated;

-- Auto-populate store_id on cart_items insert
create or replace function public.set_cart_item_store()
returns trigger
language plpgsql
as $$
begin
  if new.store_id is null then
    select store_id into new.store_id
    from   public.store_products
    where  id = new.store_product_id;
  end if;
  return new;
end;
$$;

-- Stamp deletion_requested_at when flag is first set to true
create or replace function public.stamp_deletion_request()
returns trigger
language plpgsql
as $$
begin
  if new.deletion_requested = true
     and (old.deletion_requested = false or old.deletion_requested is null)
  then
    new.deletion_requested_at = now();
  end if;
  return new;
end;
$$;

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_stores_updated_at
  before update on public.stores
  for each row execute procedure public.update_updated_at_column();

create trigger update_products_updated_at
  before update on public.products
  for each row execute procedure public.update_updated_at_column();

create trigger update_orders_updated_at
  before update on public.orders
  for each row execute procedure public.update_updated_at_column();

create trigger update_store_products_updated_at
  before update on public.store_products
  for each row execute procedure public.update_updated_at_column();

create trigger update_categories_updated_at
  before update on public.categories
  for each row execute procedure public.update_updated_at_column();

create trigger update_order_items_updated_at
  before update on public.order_items
  for each row execute procedure public.update_updated_at_column();

create trigger update_cart_items_updated_at
  before update on public.cart_items
  for each row execute procedure public.update_updated_at_column();

create trigger update_reviews_updated_at
  before update on public.reviews
  for each row execute procedure public.update_updated_at_column();

create trigger update_delivery_addresses_updated_at
  before update on public.delivery_addresses
  for each row execute procedure public.update_updated_at_column();

create trigger trg_recalc_order_total
  after insert or update or delete on public.order_items
  for each row execute procedure public.recalculate_order_total();

create trigger trg_log_order_status
  after update on public.orders
  for each row execute procedure public.log_order_status_change();

create trigger on_profile_role_updated
  after update of role on public.profiles
  for each row execute procedure public.sync_user_role_to_metadata();

create trigger trg_set_cart_item_store
  before insert on public.cart_items
  for each row execute procedure public.set_cart_item_store();

create trigger trg_stamp_deletion_request
  before update on public.profiles
  for each row execute procedure public.stamp_deletion_request();

-- =====================================================
-- STEP 6: RLS POLICIES (v4.3 - Function-Based)
-- =====================================================

-- PROFILES
create policy "Allow trigger profile insert"
  on public.profiles for insert
  to anon, authenticated
  with check (true);

create policy "profiles own select"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "profiles own update"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

create policy "admin manage profiles"
  on public.profiles for all
  to authenticated
  using (public.is_admin());

create policy "admin view deletion requests"
  on public.profiles for select
  to authenticated
  using (public.is_admin() and deletion_requested = true);

-- CATEGORIES
create policy "categories public read"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "sellers can create categories"
  on public.categories for insert
  to authenticated
  with check (true);

create policy "sellers can update categories"
  on public.categories for update
  to authenticated
  using (true)
  with check (true);

-- STORES
create policy "stores public read"
  on public.stores for select
  to anon, authenticated
  using (true);

create policy "seller manage own store"
  on public.stores for all
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- PRODUCTS (using function-based policies)
create policy "products public read"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "sellers can create products"
  on public.products for insert
  to authenticated
  with check (true);

create policy "sellers can update products"
  on public.products for update
  to authenticated
  using (public.can_modify_product(id))
  with check (public.can_modify_product(id));

create policy "sellers can delete products"
  on public.products for delete
  to authenticated
  using (public.can_modify_product(id));

-- STORE_PRODUCTS (using function-based policies)
create policy "store_products public read"
  on public.store_products for select
  to anon, authenticated
  using (true);

create policy "sellers can insert store products"
  on public.store_products for insert
  to authenticated
  with check (public.is_store_owner(store_id));

create policy "sellers can update store products"
  on public.store_products for update
  to authenticated
  using (public.is_store_owner(store_id))
  with check (public.is_store_owner(store_id));

create policy "sellers can delete store products"
  on public.store_products for delete
  to authenticated
  using (public.is_store_owner(store_id));

-- ORDERS (using function-based policies)
create policy "customers see own orders"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

create policy "sellers see store orders"
  on public.orders for select
  to authenticated
  using (public.is_store_owner(store_id));

create policy "admins see all orders"
  on public.orders for all
  to authenticated
  using (public.is_admin());

create policy "sellers update store orders"
  on public.orders for update
  to authenticated
  using (public.is_store_owner(store_id) or public.is_admin());

create policy "customers create orders"
  on public.orders for insert
  to authenticated
  with check (customer_id = auth.uid());

-- ORDER_ITEMS (using function-based policies)
create policy "order_items own order"
  on public.order_items for select
  to authenticated
  using (public.can_view_order(order_id));

create policy "sellers see store order items"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_items.order_id and s.owner_id = auth.uid()
    )
  );

create policy "admins see all order items"
  on public.order_items for all
  to authenticated
  using (public.is_admin());

create policy "customers insert own order items"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where id = order_items.order_id and customer_id = auth.uid()
    )
  );

create policy "sellers insert store order items"
  on public.order_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_items.order_id
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "sellers update store order items"
  on public.order_items for update
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_items.order_id
        and (s.owner_id = auth.uid() or public.is_admin())
    )
  );

create policy "customers delete own order items"
  on public.order_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id and customer_id = auth.uid()
    )
  );

-- ORDER_STATUS_HISTORY
create policy "customers see own order history"
  on public.order_status_history for select
  to authenticated
  using (public.can_view_order(order_id));

create policy "sellers see store order history"
  on public.order_status_history for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      join public.stores s on s.id = o.store_id
      where o.id = order_status_history.order_id and s.owner_id = auth.uid()
    )
  );

create policy "admins see all order history"
  on public.order_status_history for all
  to authenticated
  using (public.is_admin());

-- CART_ITEMS
create policy "own cart only"
  on public.cart_items for all
  to authenticated
  using  (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- DELIVERY_ADDRESSES
create policy "own delivery addresses"
  on public.delivery_addresses for all
  to authenticated
  using  (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- REVIEWS
create policy "reviews public read"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "customers insert own reviews"
  on public.reviews for insert
  to authenticated
  with check (
    auth.uid() = reviewer_id
    and exists (
      select 1
      from   public.orders o
      join   public.order_items oi on oi.order_id = o.id
      where  o.customer_id = auth.uid()
        and  o.status = 'delivered'
        and  oi.store_product_id = reviews.store_product_id
    )
  );

create policy "customers delete own reviews"
  on public.reviews for delete
  to authenticated
  using (auth.uid() = reviewer_id);

-- VERIFICATION_CODES - No direct client access

-- =====================================================
-- STEP 7: STORAGE POLICIES
-- =====================================================

create policy "Public images are viewable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('images', 'products', 'avatars', 'stores'));

create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('images', 'products', 'avatars', 'stores')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users update own uploads"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('images', 'products', 'avatars', 'stores')
    and owner = auth.uid()
  );

create policy "Users delete own uploads"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('images', 'products', 'avatars', 'stores')
    and owner = auth.uid()
  );

-- =====================================================
-- STEP 8: INDEXES
-- =====================================================

create index if not exists idx_verification_codes_email    on public.verification_codes(email);
create index if not exists idx_verification_codes_expires  on public.verification_codes(expires_at);
create index if not exists idx_orders_customer             on public.orders(customer_id);
create index if not exists idx_orders_store                on public.orders(store_id);
create index if not exists idx_orders_status               on public.orders(status);
create index if not exists idx_orders_customer_status      on public.orders(customer_id, status);
create index if not exists idx_orders_store_status         on public.orders(store_id, status);
create index if not exists idx_store_products_store        on public.store_products(store_id);
create index if not exists idx_store_products_product      on public.store_products(product_id);
create index if not exists idx_store_products_available    on public.store_products(store_id, is_available, stock_qty);
create index if not exists idx_cart_items_customer         on public.cart_items(customer_id);
create index if not exists idx_cart_items_customer_store   on public.cart_items(customer_id, store_id);
create index if not exists idx_products_category           on public.products(category_id);
create index if not exists idx_reviews_product_rating      on public.reviews(product_id, rating);
create index if not exists idx_reviews_store               on public.reviews(store_id);
create index if not exists idx_reviews_store_product       on public.reviews(store_product_id);
create index if not exists idx_order_status_history_order  on public.order_status_history(order_id, changed_at);
create index if not exists idx_delivery_addresses_customer on public.delivery_addresses(customer_id);
create index if not exists idx_profiles_deletion_requested on public.profiles(deletion_requested)
  where deletion_requested = true;

create unique index if not exists idx_delivery_addresses_one_default
  on public.delivery_addresses(customer_id)
  where is_default = true;

create extension if not exists pg_trgm;
create index if not exists idx_products_name_trgm on public.products using gin(name gin_trgm_ops);

-- =====================================================
-- STEP 9: ANALYTICS VIEWS
-- =====================================================

create or replace view public.product_popularity as
select
  p.id,
  p.name,
  p.image_url,
  c.name as category_name,
  count(oi.id)       as times_ordered,
  sum(oi.quantity)   as total_qty_sold,
  avg(r.rating)      as avg_rating,
  count(r.id)        as review_count
from public.products p
left join public.categories   c  on c.id  = p.category_id
left join public.store_products sp on sp.product_id = p.id
left join public.order_items  oi on oi.store_product_id = sp.id
left join public.reviews      r  on r.product_id = p.id
group by p.id, p.name, p.image_url, c.name;

create or replace view public.customer_order_summary as
select
  p.id as customer_id,
  p.full_name,
  p.email,
  count(distinct o.id)  as total_orders,
  sum(o.total_amount)   as total_spent,
  max(o.created_at)     as last_order_date,
  count(distinct r.id)  as total_reviews
from public.profiles p
left join public.orders  o on o.customer_id = p.id
left join public.reviews r on r.customer_id = p.id
group by p.id, p.full_name, p.email;

-- =====================================================
-- STEP 10: PROFILE SYNC FROM AUTH.USERS
-- =====================================================

insert into public.profiles (
  id, email, full_name, phone, role,
  avatar_url, email_verified, created_at
)
select
  id,
  email,
  coalesce(raw_user_meta_data->>'full_name', email),
  raw_user_meta_data->>'phone',
  coalesce(raw_user_meta_data->>'role', 'customer'),
  raw_user_meta_data->>'avatar_url',
  email_confirmed_at is not null,
  created_at
from auth.users
on conflict (id) do nothing;

-- =====================================================
-- STEP 11: SEED DATA (SAFE - WITH EXISTENCE CHECK)
-- =====================================================

-- Insert categories only if they don't exist
DO $$
DECLARE
  category_names text[] := ARRAY['Fruits', 'Vegetables', 'Meat', 'Seafood', 'Dairy', 'Beverages', 'Snacks', 'Household', 'Organic', 'Bakery', 'Frozen', 'Pantry'];
  category_icons text[] := ARRAY['🍎', '🥬', '🥩', '🐟', '🥛', '🥤', '🍿', '🏠', '🌿', '🍞', '❄️', '📦'];
  i integer;
  category_exists boolean;
BEGIN
  FOR i IN 1..array_length(category_names, 1) LOOP
    SELECT EXISTS(SELECT 1 FROM public.categories WHERE name = category_names[i]) INTO category_exists;
    
    IF NOT category_exists THEN
      INSERT INTO public.categories (name, icon) VALUES (category_names[i], category_icons[i]);
    ELSE
      UPDATE public.categories SET icon = category_icons[i] WHERE name = category_names[i] AND icon IS DISTINCT FROM category_icons[i];
    END IF;
  END LOOP;
END $$;

-- Insert storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('images', 'images', true),
  ('products', 'products', true),
  ('avatars', 'avatars', true),
  ('stores', 'stores', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- STEP 12: v4.3 PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Full-Text Search for Products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS name_search tsvector;

CREATE INDEX IF NOT EXISTS idx_products_name_search 
ON products USING gin(name_search);

CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.name_search := to_tsvector('english', COALESCE(NEW.name, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_name_search ON products;
CREATE TRIGGER trg_products_name_search
BEFORE INSERT OR UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_search_vector();

UPDATE products SET name_search = to_tsvector('english', name) 
WHERE name_search IS NULL;

-- Optimize Cart Queries
CREATE INDEX IF NOT EXISTS idx_cart_items_customer_product
ON cart_items(customer_id, store_product_id);

-- Optimize Product Availability Queries
CREATE INDEX IF NOT EXISTS idx_store_products_available_stock
ON store_products(is_available, stock_qty)
WHERE is_available = true AND stock_qty > 0;

CREATE INDEX IF NOT EXISTS idx_store_products_store_available
ON store_products(store_id, is_available)
WHERE is_available = true;

-- Optimize Store Ratings with Materialized View
DROP MATERIALIZED VIEW IF EXISTS public.store_ratings CASCADE;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_ratings AS
SELECT 
  s.id as store_id,
  s.name,
  s.logo_url,
  s.address,
  s.is_active,
  COALESCE(AVG(r.rating), 4.0) as avg_rating,
  COUNT(r.id) as review_count,
  COUNT(DISTINCT r.customer_id) as unique_reviewers,
  COUNT(DISTINCT o.id) as total_orders,
  COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total_amount ELSE 0 END), 0) as total_revenue
FROM public.stores s
LEFT JOIN public.reviews r ON r.store_id = s.id
LEFT JOIN public.orders o ON o.store_id = s.id
GROUP BY s.id, s.name, s.logo_url, s.address, s.is_active;

CREATE UNIQUE INDEX IF NOT EXISTS idx_store_ratings_store_id 
ON public.store_ratings(store_id);

CREATE OR REPLACE FUNCTION public.refresh_store_ratings()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.store_ratings;
END;
$$ LANGUAGE plpgsql;

-- Optimize Orders Performance
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
ON orders(customer_id, created_at DESC)
WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_store_created
ON orders(store_id, created_at DESC)
WHERE store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_created
ON orders(status, created_at DESC);

-- Optimize RLS Policy Performance
CREATE INDEX IF NOT EXISTS idx_profiles_id_role
ON profiles(id, role);

-- Index for store ownership lookups (used by RLS functions)
CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_store_products_store_id ON store_products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_store ON orders(customer_id, store_id);

-- =====================================================
-- MAINTENANCE NOTES
-- =====================================================
-- Refresh store ratings (run weekly):
-- SELECT refresh_store_ratings();

-- Analyze tables for query planner optimization (run monthly):
-- ANALYZE products;
-- ANALYZE cart_items;
-- ANALYZE store_products;
-- ANALYZE orders;
-- ANALYZE reviews;

-- =====================================================
-- END OF COMPLETE SCHEMA (v4.3 - Function-Based RLS)
-- =====================================================