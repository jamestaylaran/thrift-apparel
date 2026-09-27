-- ============================================================================
-- Thrift Apparel — Supabase setup script
-- ----------------------------------------------------------------------------
-- Run this ONCE in your Supabase project:  Dashboard > SQL Editor > New query
-- > paste this file > Run.
--
-- What it does:
--   1. Drops the leftover tables from the earlier MySQL-style attempt
--   2. Recreates every table linked to Supabase Auth (users.id = auth.users.id)
--   3. Adds the trigger that creates a user profile on every signup
--   4. Adds the atomic checkout + admin stats database functions
--   5. Enables Row Level Security (all app access goes through the API)
--   6. Creates the public "product-images" Storage bucket for admin uploads
--
-- After running it, see the instructions at the bottom of this file
-- (or the README) to seed products and promote your admin account.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Drop leftover tables from the previous attempt (old MySQL-style schema)
-- ----------------------------------------------------------------------------
do $$
declare
  tbls text[];
  funcs text[];
  t text;
  f text;
begin
  -- Materialise the lists first (dropping while iterating a live cursor can fail)
  select coalesce(array_agg(tablename), '{}') into tbls
  from pg_tables where schemaname = 'public';

  select coalesce(array_agg(routine_name), '{}') into funcs
  from information_schema.routines
  where routine_schema = 'public' and routine_type = 'FUNCTION';

  foreach t in array tbls loop
    execute format('drop table if exists public.%I cascade', t);
  end loop;

  foreach f in array funcs loop
    execute format('drop function if exists public.%I cascade', f);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- One row per person who signed up. `id` is the Supabase Auth user id.
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  phone       text,
  address     text,
  created_at  timestamptz not null default now()
);

create table public.categories (
  id          bigint generated always as identity primary key,
  name        varchar(100) not null unique,
  description text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create table public.products (
  id              bigint generated always as identity primary key,
  sku             varchar(100) not null unique,
  name            varchar(255) not null,
  description     text,
  price           numeric(10,2) not null check (price >= 0),
  category_id     bigint not null references public.categories (id),
  brand           varchar(150) not null default 'Thrifted',
  size            varchar(50),
  color           varchar(80),
  material        varchar(120),
  condition_name  varchar(50),
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  status          text not null default 'active' check (status in ('active', 'sold_out', 'archived')),
  measurements    jsonb not null default '{}'::jsonb,
  image_url       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.product_images (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id) on delete cascade,
  image_url   text not null,
  created_at  timestamptz not null default now()
);

create table public.carts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null unique references public.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.cart_items (
  id          bigint generated always as identity primary key,
  cart_id     bigint not null references public.carts (id) on delete cascade,
  product_id  bigint not null references public.products (id),
  quantity    integer not null default 1 check (quantity > 0),
  created_at  timestamptz not null default now()
);

create table public.wishlist (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users (id) on delete cascade,
  product_id  bigint not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, product_id)
);

create table public.orders (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references public.users (id),
  order_number     text unique,
  total_amount     numeric(10,2) not null,
  shipping_address text not null,
  phone            text,
  status           text not null default 'pending'
                   check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.order_items (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders (id) on delete cascade,
  product_id  bigint not null references public.products (id),
  quantity    integer not null check (quantity > 0),
  price       numeric(10,2) not null,
  created_at  timestamptz not null default now()
);

create table public.product_reviews (
  id           bigint generated always as identity primary key,
  product_id   bigint not null references public.products (id) on delete cascade,
  user_id      uuid not null references public.users (id) on delete cascade,
  order_id     bigint not null references public.orders (id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  review_text  text,
  created_at   timestamptz not null default now(),
  unique (order_id, product_id)
);

create table public.customer_addresses (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references public.users (id) on delete cascade,
  address      text not null,
  city         text,
  province     text,
  postal_code  text,
  created_at   timestamptz not null default now()
);

-- Indexes
create index idx_products_category  on public.products (category_id);
create index idx_products_stock     on public.products (stock_quantity);
create index idx_products_status    on public.products (status);
create index idx_cart_items_cart    on public.cart_items (cart_id);
create index idx_wishlist_user      on public.wishlist (user_id);
create index idx_orders_user        on public.orders (user_id);
create index idx_orders_status      on public.orders (status);
create index idx_order_items_order  on public.order_items (order_id);
create index idx_reviews_product    on public.product_reviews (product_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Create a profile row automatically on every Supabase Auth signup
--    (role is always 'customer' here — it can never be set from the client)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, phone, address, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'phone', ''), ''),
    nullif(coalesce(new.raw_user_meta_data ->> 'address', ''), ''),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Backfill profiles for accounts that already exist in auth.users
insert into public.users (id, email, name, phone, address, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'name', ''),
  nullif(coalesce(u.raw_user_meta_data ->> 'phone', ''), ''),
  nullif(coalesce(u.raw_user_meta_data ->> 'address', ''), ''),
  'customer'
from auth.users u
on conflict (id) do nothing;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. Database functions
-- ----------------------------------------------------------------------------

-- Atomic checkout: validates stock, creates the order, decreases stock and
-- clears the cart in one transaction. Only the API (service role) may call it.
create or replace function public.place_order(
  p_user_id uuid,
  p_shipping_address text,
  p_phone text default ''
)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_cart_id    bigint;
  v_order_id   bigint;
  v_total      numeric(10,2) := 0;
  v_order      jsonb;
  item         record;
begin
  if p_shipping_address is null or btrim(p_shipping_address) = '' then
    raise exception 'Shipping address is required.';
  end if;

  select id into v_cart_id from public.carts where user_id = p_user_id for update;
  if v_cart_id is null then
    raise exception 'No cart found.';
  end if;

  if not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'Cart is empty.';
  end if;

  -- Lock the product rows and validate stock
  for item in
    select ci.quantity, p.id as product_id, p.name, p.price, p.stock_quantity
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.cart_id = v_cart_id
    order by ci.id
    for update of p
  loop
    if item.stock_quantity < item.quantity then
      raise exception 'Insufficient stock for %', item.name;
    end if;
    v_total := v_total + item.price * item.quantity;
  end loop;

  insert into public.orders (user_id, total_amount, shipping_address, phone, status)
  values (p_user_id, v_total, btrim(p_shipping_address), coalesce(p_phone, ''), 'pending')
  returning id into v_order_id;

  update public.orders set order_number = 'THR-' || v_order_id where id = v_order_id;

  insert into public.order_items (order_id, product_id, quantity, price)
  select v_order_id, ci.product_id, ci.quantity, p.price
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id;

  update public.products p
  set stock_quantity = p.stock_quantity - ci.quantity,
      status = case when p.stock_quantity - ci.quantity <= 0 then 'sold_out' else 'active' end
  from public.cart_items ci
  where ci.cart_id = v_cart_id and p.id = ci.product_id;

  delete from public.cart_items where cart_id = v_cart_id;

  select to_jsonb(o) into v_order from public.orders o where o.id = v_order_id;
  return v_order;
end;
$$;

-- Admin dashboard aggregates in a single call
create or replace function public.admin_dashboard_stats()
returns jsonb
language sql
set search_path = public
as $$
  select jsonb_build_object(
    'totalProducts',  (select count(*) from products where status <> 'archived'),
    'totalStock',     coalesce((select sum(stock_quantity) from products where status <> 'archived'), 0),
    'lowStock',       (select count(*) from products where stock_quantity between 1 and 5 and status <> 'archived'),
    'outOfStock',     (select count(*) from products where stock_quantity = 0 and status <> 'archived'),
    'totalCustomers', (select count(*) from users where role = 'customer'),
    'pendingOrders',  (select count(*) from orders where status = 'pending'),
    'completedOrders',(select count(*) from orders where status = 'delivered'),
    'totalSales',     coalesce((select sum(total_amount) from orders
                                where status in ('confirmed','processing','shipped','delivered')), 0)
  );
$$;

-- These functions must only be callable by the API (service role),
-- never directly from the browser.
revoke execute on function public.place_order(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.admin_dashboard_stats() from public, anon, authenticated;
grant  execute on function public.place_order(uuid, text, text) to service_role;
grant  execute on function public.admin_dashboard_stats() to service_role;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security — every table is locked down.
--    All reads/writes from the app go through the Express API, which uses the
--    service-role key (bypasses RLS). The browser can never touch these tables.
-- ----------------------------------------------------------------------------
alter table public.users             enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.carts             enable row level security;
alter table public.cart_items        enable row level security;
alter table public.wishlist          enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.product_reviews   enable row level security;
alter table public.customer_addresses enable row level security;

-- Privileges (Supabase sets most of these by default; repeated here on purpose)
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;
grant usage, select on all sequences in schema public to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 6. Storage bucket for product images uploaded from the admin dashboard
--    (runs AFTER the main transaction above, so a storage-side hiccup can
--    never roll back the schema)
-- ----------------------------------------------------------------------------
commit;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Public-read policy. The bucket is already public, so if this statement is
-- not permitted on your project the app still works — it only raises a warning.
do $$
begin
  drop policy if exists "Product images are publicly readable" on storage.objects;
  create policy "Product images are publicly readable"
    on storage.objects for select
    using (bucket_id = 'product-images');
exception when others then
  raise warning 'Storage read policy skipped: %', sqlerrm;
end $$;

-- ============================================================================
-- DONE. Next steps:
--
-- 1) Seed categories + sample products (optional):
--      Dashboard > SQL Editor > paste database/supabase_seed.sql > Run
--
-- 2) Create your admin account:
--      a. Open the app and register normally (or use the Admin Login page)
--      b. Then run in the SQL Editor:
--
--         update public.users set role = 'admin' where email = 'you@example.com';
--
--    (Signups can never grant themselves the admin role — it is set here only.)
-- ============================================================================
