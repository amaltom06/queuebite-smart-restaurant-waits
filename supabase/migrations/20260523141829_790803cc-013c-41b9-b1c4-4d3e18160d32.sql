
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_self_select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_self_update" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_self_insert" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), new.phone);
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Restaurants
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  slug text not null unique,
  name text not null,
  cuisine text not null,
  description text,
  image_url text,
  address text,
  rating numeric(2,1) default 4.5,
  capacity int default 40,
  avg_service_minutes int default 8,
  opens_at time default '11:00',
  closes_at time default '23:00',
  is_open boolean default true,
  current_serving_token int default 0,
  created_at timestamptz not null default now()
);
alter table public.restaurants enable row level security;
create policy "restaurants_public_read" on public.restaurants for select using (true);
create policy "restaurants_owner_update" on public.restaurants for update to authenticated using (auth.uid() = owner_id);

-- Queue entries
create type public.queue_status as enum ('waiting','called','seated','cancelled','completed');

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  token_number int not null,
  party_size int not null default 2,
  seating_preference text,
  notes text,
  status public.queue_status not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index queue_entries_restaurant_status_idx on public.queue_entries(restaurant_id, status, token_number);
create index queue_entries_user_idx on public.queue_entries(user_id, created_at desc);

alter table public.queue_entries enable row level security;
-- Public can read waiting/called counts (needed for live queue numbers on listing pages)
create policy "queue_public_read" on public.queue_entries for select using (true);
create policy "queue_user_insert" on public.queue_entries for insert to authenticated with check (auth.uid() = user_id);
create policy "queue_user_update_own" on public.queue_entries for update to authenticated using (auth.uid() = user_id);
create policy "queue_owner_update" on public.queue_entries for update to authenticated
  using (exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid()));

-- Auto-assign token number per restaurant
create or replace function public.assign_token_number()
returns trigger language plpgsql as $$
begin
  if new.token_number is null or new.token_number = 0 then
    select coalesce(max(token_number), 0) + 1 into new.token_number
    from public.queue_entries
    where restaurant_id = new.restaurant_id
      and created_at::date = current_date;
  end if;
  return new;
end; $$;
create trigger queue_entries_assign_token
  before insert on public.queue_entries
  for each row execute function public.assign_token_number();

-- Realtime
alter publication supabase_realtime add table public.queue_entries;
alter publication supabase_realtime add table public.restaurants;
alter table public.queue_entries replica identity full;
alter table public.restaurants replica identity full;

-- Seed restaurants
insert into public.restaurants (slug, name, cuisine, description, image_url, address, rating, capacity, avg_service_minutes, current_serving_token) values
('osteria-luna', 'Osteria Luna', 'Italian', 'Wood-fired pastas and natural wines in a candlelit cellar.', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&q=80', '24 Mercer St, SoHo', 4.8, 48, 9, 12),
('koji-ramen', 'Koji Ramen Bar', 'Japanese', 'Hand-pulled noodles and 24-hour tonkotsu broth.', 'https://images.unsplash.com/photo-1623341214825-9f4f963727da?w=1200&q=80', '88 Bowery, Chinatown', 4.7, 30, 7, 24),
('aurora-grill', 'Aurora Steakhouse', 'Steakhouse', 'Dry-aged cuts, open flame, and a vinyl-only soundtrack.', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80', '410 W 14th St, Meatpacking', 4.9, 60, 12, 7),
('saffron-house', 'Saffron House', 'Indian', 'Modern South Indian small plates and craft cocktails.', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=1200&q=80', '156 E 27th St, Curry Hill', 4.6, 52, 8, 18),
('taqueria-norte', 'Taquería del Norte', 'Mexican', 'Nixtamal tortillas, mezcal flights, no reservations.', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&q=80', '92 Orchard St, LES', 4.5, 36, 6, 31),
('blue-harbor', 'Blue Harbor Oyster Co.', 'Seafood', 'East coast oysters, plateau de fruits de mer, sea breeze.', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1200&q=80', '5 Pier 17, FiDi', 4.7, 44, 10, 9);

-- Seed some waiting entries (fake users via null-safe approach is impossible due to FK; skip; counts will start at 0 for live data, but current_serving_token gives illusion of activity)
