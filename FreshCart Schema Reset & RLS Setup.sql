-- =====================================================
-- FRESHCART CLEAN SLATE RESET (RECURSION FIX)
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

-- Order Items
drop policy if exists "order_items own order" on public.order_items;
drop policy if exists "sellers see store order items" on public.order_items;
drop policy if exists "admins see all order items" on public.order_items;

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

-- -----------------------------------------------------
-- STEP 0: DROP EVERYTHING
-- -----------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_email_confirmed on auth.users;
drop trigger if exists update_profiles_updated_at on public.profiles;
drop trigger if exists update_stores_updated_at on public.stores;
drop trigger if exists update_products_updated_at on public.products;
drop trigger if exists update_orders_updated_at on public.orders;

drop function if exists public.handle_new_user();
drop function if exists public.handle_email_confirmed();
drop function if exists public.update_updated_at_column();
drop function if exists public.calculate_order_total(uuid);
drop function if exists public.cleanup_expired_codes();

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
  customer_id uuid references public.profiles(id),
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

-- -----------------------------------------------------
-- STEP 2: ENABLE RLS
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- STEP 3: CREATE FUNCTIONS
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- STEP 4: CREATE TRIGGERS
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- STEP 5: CREATE RLS POLICIES (RECURSION-FREE)
-- -----------------------------------------------------

-- Helper: Function to check admin role without recursion
-- Reads from auth.users raw metadata (bypasses profiles RLS)
CREATE POLICY "Allow authenticated read all profiles" 
ON profiles 
FOR SELECT 
TO authenticated 
USING (true);

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
  using (
    owner_id = auth.uid() or public.is_admin()
  );

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

-- Set up RLS policies for storage
create policy "Public images are viewable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('images', 'products', 'avatars', 'stores'));

create policy "Authenticated users can upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('images', 'products', 'avatars', 'stores'));

-- -----------------------------------------------------
-- STEP 6: INDEXES
-- -----------------------------------------------------
create index idx_verification_codes_email on public.verification_codes(email);
create index idx_verification_codes_expires on public.verification_codes(expires_at);
create index idx_orders_customer on public.orders(customer_id);
create index idx_orders_store on public.orders(store_id);
create index idx_orders_status on public.orders(status);
create index idx_store_products_store on public.store_products(store_id);
create index idx_store_products_product on public.store_products(product_id);
create index idx_cart_items_customer on public.cart_items(customer_id);

-- -----------------------------------------------------
-- STEP 7: SEED DATA
-- -----------------------------------------------------
insert into public.categories (name, icon) values
  ('Fruits', 'apple'),
  ('Vegetables', 'carrot'),
  ('Meat', 'beef'),
  ('Seafood', 'fish'),
  ('Dairy', 'milk'),
  ('Beverages', 'coffee'),
  ('Snacks', 'cookie'),
  ('Household', 'home');

-- Create buckets (run in Supabase SQL Editor)
do $$
begin
  insert into storage.buckets (id, name, public) values
    ('images', 'images', true),
    ('products', 'products', true),
    ('avatars', 'avatars', true),
    ('stores', 'stores', true)
  on conflict do nothing;
end $$;