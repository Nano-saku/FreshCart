-- =====================================================
-- FRESHCART COMPLETE SCHEMA (v2.1 - Auth-Only Checkout)
-- =====================================================
-- Changes from v2.0:
--   - Removed guest checkout fields (is_guest, guest_name, guest_email, guest_phone)
--   - Removed guest RLS policies
--   - Reverted orders.customer_id back to NOT NULL
--   - Kept all other improvements (triggers, functions, views, indexes)
--   - Added profile sync from auth.users
--   - FIXED: Drop triggers BEFORE functions to avoid dependency errors
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

-- Categories
drop policy if exists "categories public read" on public.categories;
drop policy if exists "admin manage categories" on public.categories;

-- Stores
drop policy if exists "stores public read" on public.stores;
drop policy if exists "seller manage own store" on public.stores;

-- Products
drop policy if exists "products public read" on public.products;
drop policy if exists "admin manage products" on public.products;

-- Store Products
drop policy if exists "store_products public read" on public.store_products;
drop policy if exists "seller manage store products" on public.store_products;

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

-- Reviews
drop policy if exists "reviews public read" on public.reviews;
drop policy if exists "own reviews manage" on public.reviews;

-- Verification Codes
drop policy if exists "verification codes service" on public.verification_codes;

-- Storage
drop policy if exists "Public images are viewable" on storage.objects;
drop policy if exists "Authenticated users can upload" on storage.objects;
drop policy if exists "Authenticated users can update own images" on storage.objects;
drop policy if exists "Authenticated users can delete own images" on storage.objects;

-- -----------------------------------------------------
-- STEP 0: DROP EVERYTHING (CORRECT ORDER)
-- -----------------------------------------------------
-- 1. Drop triggers first (they depend on functions)
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
drop trigger if exists trg_recalc_order_total on public.order_items;
drop trigger if exists trg_log_order_status on public.orders;
drop trigger if exists on_profile_role_updated on public.profiles;

-- 2. Drop views (they depend on tables)
drop view if exists public.product_popularity cascade;
drop view if exists public.store_ratings cascade;
drop view if exists public.customer_order_summary cascade;

-- 3. Drop tables (cascade drops dependent objects)
drop table if exists public.order_status_history cascade;
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.cart_items cascade;
drop table if exists public.reviews cascade;
drop table if exists public.store_products cascade;
drop table if exists public.products cascade;
drop table if exists public.stores cascade;
drop table if exists public.categories cascade;
drop table if exists public.verification_codes cascade;
drop table if exists public.profiles cascade;

-- 4. Now drop functions (no more dependents)
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

-- -----------------------------------------------------
-- STEP 1: CREATE TABLES
-- -----------------------------------------------------
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  phone text,
  role text default 'customer' check (role in ('customer', 'admin', 'seller')),
  avatar_url text,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text,
  parent_id uuid references public.categories(id),
  created_at timestamptz default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id),
  name text not null,
  description text,
  logo_url text,
  address text,
  latitude numeric(10,8),
  longitude numeric(11,8),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  category_id uuid references public.categories(id),
  unit text default 'piece',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  product_id uuid references public.products(id) on delete cascade,
  price numeric(10,2) not null,
  stock_qty int default 0,
  is_available boolean default true,
  unique(store_id, product_id),
  created_at timestamptz default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) not null,
  store_id uuid references public.stores(id),
  status text default 'pending' check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  total_amount numeric(10,2),
  delivery_address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  store_product_id uuid references public.store_products(id),
  quantity int not null,
  unit_price numeric(10,2) not null
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete cascade,
  store_product_id uuid references public.store_products(id) on delete cascade,
  quantity int default 1,
  unique(customer_id, store_product_id),
  created_at timestamptz default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id),
  product_id uuid references public.products(id),
  store_id uuid references public.stores(id),
  store_product_id uuid references public.store_products(id),
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

create table public.verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  email text not null,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- =====================================================
-- STEP 2: ORDER STATUS HISTORY TABLE
-- =====================================================
create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  status text not null check (status in ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled')),
  changed_at timestamptz default now(),
  changed_by uuid references auth.users(id),
  notes text
);

-- =====================================================
-- STEP 3: ENABLE RLS
-- =====================================================
alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.store_products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cart_items enable row level security;
alter table public.reviews enable row level security;
alter table public.categories enable row level security;
alter table public.verification_codes enable row level security;
alter table public.order_status_history enable row level security;

-- =====================================================
-- STEP 4: CREATE FUNCTIONS
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
$$ language plpgsql security definer;

-- Helper: Function to check admin role without recursion
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from auth.users
    where id = auth.uid()
    and raw_user_meta_data->>'role' = 'admin'
  );
end;
$$ language plpgsql stable security definer;

-- Order total auto-recalculation
create or replace function public.recalculate_order_total()
returns trigger as $$
begin
  update public.orders
  set total_amount = public.calculate_order_total(
    case
      when tg_op = 'DELETE' then old.order_id
      else new.order_id
    end
  )
  where id = case
    when tg_op = 'DELETE' then old.order_id
    else new.order_id
  end;
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
$$ language plpgsql security definer;

-- Get nearby stores with distance
create or replace function public.get_nearby_stores(
  user_lat numeric,
  user_lng numeric,
  max_distance_km numeric default 50
)
returns table (
  id uuid,
  name text,
  address text,
  logo_url text,
  distance_km numeric,
  latitude numeric,
  longitude numeric
) as $$
begin
  return query
  select
    s.id,
    s.name,
    s.address,
    s.logo_url,
    (
      6371 * acos(
        cos(radians(user_lat)) * cos(radians(s.latitude)) *
        cos(radians(s.longitude) - radians(user_lng)) +
        sin(radians(user_lat)) * sin(radians(s.latitude))
      )
    )::numeric(10,2) as distance_km,
    s.latitude,
    s.longitude
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
  store_product_id uuid,
  product_name text,
  product_image text,
  category_name text,
  unit text,
  price numeric,
  stock_qty int,
  is_available boolean,
  low_stock boolean
) as $$
begin
  return query
  select
    sp.id as store_product_id,
    p.name as product_name,
    p.image_url as product_image,
    c.name as category_name,
    p.unit,
    sp.price,
    sp.stock_qty,
    sp.is_available,
    (sp.stock_qty <= 5 and sp.stock_qty > 0) as low_stock
  from public.store_products sp
  join public.products p on p.id = sp.product_id
  left join public.categories c on c.id = p.category_id
  where sp.store_id = store_uuid
  order by p.name;
end;
$$ language plpgsql stable;

-- Cleanup helper for app startup
create or replace function public.cleanup_and_count()
returns json as $$
declare
  deleted_count int;
begin
  delete from public.verification_codes where expires_at < now();
  get diagnostics deleted_count = row_count;
  return json_build_object('cleaned', deleted_count, 'timestamp', now());
end;
$$ language plpgsql security definer;

-- Function to sync profile role back to auth.users metadata
create or replace function public.sync_user_role_to_metadata()
returns trigger as $$
begin
  update auth.users
  set raw_user_meta_data = 
    coalesce(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', new.role)
  where id = new.id;
  return new;
end;
$$ language plpgsql security definer;

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

create trigger trg_recalc_order_total
  after insert or update or delete on public.order_items
  for each row execute procedure public.recalculate_order_total();

create trigger trg_log_order_status
  after update on public.orders
  for each row execute procedure public.log_order_status_change();

create trigger on_profile_role_updated
  after update of role on public.profiles
  for each row execute procedure public.sync_user_role_to_metadata();

-- =====================================================
-- STEP 6: CREATE RLS POLICIES (RECURSION-FREE)
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

create policy "Allow authenticated read all profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- CATEGORIES
create policy "categories public read"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "admin manage categories"
  on public.categories for all
  to authenticated
  using (public.is_admin());

-- STORES
create policy "stores public read"
  on public.stores for select
  to anon, authenticated
  using (true);

create policy "seller manage own store"
  on public.stores for all
  to authenticated
  using (owner_id = auth.uid() or public.is_admin());

-- PRODUCTS
create policy "products public read"
  on public.products for select
  to anon, authenticated
  using (true);

create policy "admin manage products"
  on public.products for all
  to authenticated
  using (public.is_admin());

-- STORE_PRODUCTS
create policy "store_products public read"
  on public.store_products for select
  to anon, authenticated
  using (true);

create policy "seller manage store products"
  on public.store_products for all
  to authenticated
  using (
    exists (
      select 1 from public.stores
      where id = store_products.store_id and owner_id = auth.uid()
    ) or public.is_admin()
  );

-- ORDERS
create policy "customers see own orders"
  on public.orders for select
  to authenticated
  using (customer_id = auth.uid());

create policy "sellers see store orders"
  on public.orders for select
  to authenticated
  using (
    exists (
      select 1 from public.stores
      where id = orders.store_id and owner_id = auth.uid()
    )
  );

create policy "admins see all orders"
  on public.orders for all
  to authenticated
  using (public.is_admin());

create policy "sellers update store orders"
  on public.orders for update
  to authenticated
  using (
    exists (
      select 1 from public.stores
      where id = orders.store_id and owner_id = auth.uid()
    ) or public.is_admin()
  );

create policy "customers create orders"
  on public.orders for insert
  to authenticated
  with check (customer_id = auth.uid());

-- ORDER_ITEMS
create policy "order_items own order"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id and customer_id = auth.uid()
    )
  );

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
  using (
    exists (
      select 1 from public.orders
      where id = order_status_history.order_id and customer_id = auth.uid()
    )
  );

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
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- REVIEWS
create policy "reviews public read"
  on public.reviews for select
  to anon, authenticated
  using (true);

create policy "own reviews manage"
  on public.reviews for all
  to authenticated
  using (customer_id = auth.uid());

-- VERIFICATION_CODES
create policy "verification codes service"
  on public.verification_codes for all
  to authenticated, anon
  using (true)
  with check (true);

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
  with check (bucket_id in ('images', 'products', 'avatars', 'stores'));

create policy "Authenticated users can update own images"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('images', 'products', 'avatars', 'stores'));

create policy "Authenticated users can delete own images"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('images', 'products', 'avatars', 'stores'));

-- =====================================================
-- STEP 8: INDEXES
-- =====================================================
create index idx_verification_codes_email on public.verification_codes(email);
create index idx_verification_codes_expires on public.verification_codes(expires_at);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_store on public.orders(store_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_customer_status on public.orders(customer_id, status);
create index idx_orders_store_status on public.orders(store_id, status);
create index idx_store_products_store on public.store_products(store_id);
create index idx_store_products_product on public.store_products(product_id);
create index idx_store_products_available on public.store_products(store_id, is_available, stock_qty);
create index idx_cart_items_customer on public.cart_items(customer_id);
create index idx_products_category on public.products(category_id);
create index idx_reviews_product_rating on public.reviews(product_id, rating);
create index idx_reviews_store on public.reviews(store_id);
create index idx_reviews_store_product on public.reviews(store_product_id);
create index idx_order_status_history_order on public.order_status_history(order_id, changed_at);

-- Full text search index on product names
create extension if not exists pg_trgm;
create index idx_products_name_trgm on public.products using gin (name gin_trgm_ops);

-- =====================================================
-- STEP 9: ANALYTICS VIEWS
-- =====================================================

create view public.product_popularity as
select
  p.id,
  p.name,
  p.image_url,
  c.name as category_name,
  count(oi.id) as times_ordered,
  sum(oi.quantity) as total_qty_sold,
  avg(r.rating) as avg_rating,
  count(r.id) as review_count
from public.products p
left join public.categories c on c.id = p.category_id
left join public.store_products sp on sp.product_id = p.id
left join public.order_items oi on oi.store_product_id = sp.id
left join public.reviews r on r.product_id = p.id
group by p.id, p.name, p.image_url, c.name;

create view public.store_ratings as
select
  s.id,
  s.name,
  s.logo_url,
  s.address,
  s.is_active,
  avg(r.rating) as avg_rating,
  count(r.id) as review_count,
  count(distinct o.id) as total_orders,
  sum(case when o.status = 'delivered' then o.total_amount else 0 end) as total_revenue
from public.stores s
left join public.reviews r on r.store_id = s.id
left join public.orders o on o.store_id = s.id
group by s.id, s.name, s.logo_url, s.address, s.is_active;

create view public.customer_order_summary as
select
  p.id as customer_id,
  p.full_name,
  p.email,
  count(distinct o.id) as total_orders,
  sum(o.total_amount) as total_spent,
  max(o.created_at) as last_order_date,
  count(distinct r.id) as total_reviews
from public.profiles p
left join public.orders o on o.customer_id = p.id
left join public.reviews r on r.customer_id = p.id
group by p.id, p.full_name, p.email;

-- =====================================================
-- STEP 10: PROFILE SYNC FROM AUTH.USERS
-- Run this to sync any existing auth users to profiles
-- =====================================================

insert into public.profiles (
    id,
    email,
    full_name,
    phone,
    role,
    avatar_url,
    email_verified,
    created_at
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
-- STEP 11: SEED DATA
-- =====================================================
insert into public.categories (name, icon) values
  ('Fruits', 'apple'),
  ('Vegetables', 'carrot'),
  ('Meat', 'beef'),
  ('Seafood', 'fish'),
  ('Dairy', 'milk'),
  ('Beverages', 'coffee'),
  ('Snacks', 'cookie'),
  ('Household', 'home'),
  ('Organic', 'leaf'),
  ('Bakery', 'bread'),
  ('Frozen', 'snowflake'),
  ('Pantry', 'package')
on conflict do nothing;

-- Create storage buckets
do $$
begin
  insert into storage.buckets (id, name, public) values
    ('images', 'images', true),
    ('products', 'products', true),
    ('avatars', 'avatars', true),
    ('stores', 'stores', true)
  on conflict do nothing;
end $$;

-- =====================================================
-- STEP 12: REALTIME SETUP (Uncomment if needed)
-- =====================================================
-- alter publication supabase_realtime add table public.store_products;
-- alter publication supabase_realtime add table public.orders;
-- alter publication supabase_realtime add table public.order_status_history;

-- =====================================================
-- END OF COMPLETE SCHEMA
-- =====================================================