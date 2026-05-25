-- =========================================================================
-- FRESHCART IN-APP NOTIFICATION SYSTEM SETUP SQL
-- =========================================================================
-- Run this complete script in the Supabase Dashboard SQL Editor.
-- It will:
--   1. Create the `public.notifications` table.
--   2. Enable Row Level Security (RLS) and define secure read/write policies.
--   3. Create triggers to automate notifications for new orders, order
--      status changes, store registration, and customer registrations.
-- =========================================================================

-- 1. Create notifications table
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade, -- Targeted recipient (null means admin broadcast)
  title      text not null,
  message    text not null,
  type       text not null default 'general' check (type in ('new_order', 'order_status', 'new_customer', 'new_store', 'general')),
  read       boolean not null default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.notifications enable row level security;

-- 2. Drop existing policies if they exist (allows safe re-runs)
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

-- 3. Create RLS Policies
-- Allow users to read their own notifications, or if they are admin, read notifications where user_id is null
create policy "Users can view own notifications" on public.notifications
  for select using (
    user_id = auth.uid() or (user_id is null and public.is_admin())
  );

-- Allow users to update (mark as read) their own notifications
create policy "Users can update own notifications" on public.notifications
  for update using (
    user_id = auth.uid() or (user_id is null and public.is_admin())
  );

-- Allow users to delete their own notifications
create policy "Users can delete own notifications" on public.notifications
  for delete using (
    user_id = auth.uid() or (user_id is null and public.is_admin())
  );

-- 4. Trigger: Notify Seller on New Order
create or replace function public.notify_seller_on_new_order()
returns trigger as $$
declare
  v_owner_id uuid;
  v_customer_name text;
begin
  -- Retrieve the owner of the store
  select owner_id into v_owner_id from public.stores where id = new.store_id;
  
  -- Retrieve customer name
  select full_name into v_customer_name from public.profiles where id = new.customer_id;

  if v_owner_id is not null then
    insert into public.notifications (user_id, title, message, type)
    values (
      v_owner_id,
      'New Order Received! 🛒',
      coalesce(v_customer_name, 'A customer') || ' placed a new order of ₱' || coalesce(new.total_amount::text, '0.00') || '.',
      'new_order'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists
drop trigger if exists trg_notify_seller_on_new_order on public.orders;

create trigger trg_notify_seller_on_new_order
  after insert on public.orders
  for each row execute procedure public.notify_seller_on_new_order();

-- 5. Trigger: Notify Customer on Order Status Change
create or replace function public.notify_customer_on_order_status_change()
returns trigger as $$
declare
  v_status_label text;
begin
  if old.status is distinct from new.status then
    v_status_label := case new.status
      when 'confirmed' then 'confirmed and is being processed'
      when 'preparing' then 'being prepared for packaging'
      when 'out_for_delivery' then 'out for delivery! 🛵'
      when 'delivered' then 'delivered! Thank you for ordering with FreshCart! 🎉'
      when 'cancelled' then 'cancelled'
      else new.status
    end;

    insert into public.notifications (user_id, title, message, type)
    values (
      new.customer_id,
      'Order Status Update 📦',
      'Your order #' || upper(substring(new.id::text from 1 for 8)) || ' has been ' || v_status_label || '.',
      'order_status'
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists
drop trigger if exists trg_notify_customer_on_order_status_change on public.orders;

create trigger trg_notify_customer_on_order_status_change
  after update of status on public.orders
  for each row execute procedure public.notify_customer_on_order_status_change();

-- 6. Trigger: Notify Admins on New Store
create or replace function public.notify_admins_on_new_store()
returns trigger as $$
declare
  v_admin_id uuid;
begin
  for v_admin_id in (select id from public.profiles where role = 'admin') loop
    insert into public.notifications (user_id, title, message, type)
    values (
      v_admin_id,
      'New Store Registered! 🏪',
      'A new store "' || new.name || '" has been registered on the platform.',
      'new_store'
    );
  end loop;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists
drop trigger if exists trg_notify_admins_on_new_store on public.stores;

create trigger trg_notify_admins_on_new_store
  after insert on public.stores
  for each row execute procedure public.notify_admins_on_new_store();

-- 7. Trigger: Notify Admins on New Customer Signup
create or replace function public.notify_admins_on_new_customer()
returns trigger as $$
declare
  v_admin_id uuid;
begin
  if new.role = 'customer' then
    for v_admin_id in (select id from public.profiles where role = 'admin') loop
      insert into public.notifications (user_id, title, message, type)
      values (
        v_admin_id,
        'New Customer Registered! 👤',
        'A new customer "' || coalesce(new.full_name, new.email, 'User') || '" has registered.',
        'new_customer'
      );
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if exists
drop trigger if exists trg_notify_admins_on_new_customer on public.profiles;

create trigger trg_notify_admins_on_new_customer
  after insert on public.profiles
  for each row execute procedure public.notify_admins_on_new_customer();
