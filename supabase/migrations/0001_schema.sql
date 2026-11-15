-- SolaDevis : schéma principal
-- À exécuter une fois dans Supabase > SQL Editor (ou via `supabase db push`).

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ profiles */
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  company_name text not null default '',
  phone text not null default '',
  company_email text not null default '',
  address text not null default '',
  ninea text not null default '',
  logo_path text,
  -- Réglages devis
  tva numeric not null default 18,
  validite_jours integer not null default 30,
  conditions text not null default 'Acompte de 50 % à la commande, solde à la mise en service. Garantie du matériel selon fabricant.',
  -- Forfaits (null = non facturé)
  structure_par_panneau numeric,
  cables_par_kwc numeric,
  pose_par_kwc numeric,
  transport numeric,
  -- Réglages techniques
  tech jsonb not null default '{"psh":5.4,"pr":75,"dod":90,"eff":95,"marge":25,"simult":80}'::jsonb,
  -- Abonnement (modifiable uniquement par le service_role : admin ou webhook de paiement)
  plan text not null default 'trial' check (plan in ('trial','active','expired')),
  trial_ends_at timestamptz not null default (now() + interval '15 days'),
  subscription_ends_at timestamptz,
  payment_provider text,
  payment_reference text,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ------------------------------------------------------------------ catalog_items */
create table if not exists public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('panel','inverter','battery')),
  model text not null default '',
  power numeric,          -- Wc (panneau), kW (onduleur), kWh (batterie)
  price numeric check (price is null or price >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists catalog_items_user_idx on public.catalog_items(user_id, type, position);

/* ------------------------------------------------------------------ quotes */
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  number text,
  client_name text not null default '',
  client_phone text not null default '',
  client_city text not null default '',
  mode text not null check (mode in ('autonome','hybride','reseau')),
  inputs jsonb not null default '{}'::jsonb,   -- consommation, part couverte, choix catalogue, tarif kWh
  result jsonb not null default '{}'::jsonb,   -- dimensionnement figé au moment de l'enregistrement
  lines jsonb not null default '[]'::jsonb,
  remise_pct numeric not null default 0,
  tva_pct numeric not null default 18,
  total_ht numeric not null default 0,
  total_ttc numeric not null default 0,
  kwc numeric not null default 0,
  valid_until date,
  status text not null default 'draft' check (status in ('draft','sent','accepted','refused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, number)
);
create index if not exists quotes_user_idx on public.quotes(user_id, created_at desc);

/* Compteur de numéros de devis, par installateur et par année (non accessible aux utilisateurs) */
create table if not exists public.quote_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  seq integer not null default 0,
  primary key (user_id, year)
);

/* ------------------------------------------------------------------ fonctions */

-- Vrai si le compte peut créer des devis (essai en cours ou abonnement actif non échu)
create or replace function public.has_active_access(p_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_user
      and (
        (p.plan = 'trial'  and p.trial_ends_at > now())
        or (p.plan = 'active' and (p.subscription_ends_at is null or p.subscription_ends_at > now()))
      )
  );
$$;

-- Avant insertion d'un devis : vérifie l'abonnement et attribue le numéro DV-AAAA-0001
create or replace function public.quotes_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from now() at time zone 'utc')::int;
  n integer;
begin
  if new.user_id is null then new.user_id := auth.uid(); end if;
  if auth.uid() is not null and new.user_id <> auth.uid() then
    raise exception 'Accès refusé';
  end if;
  if not public.has_active_access(new.user_id) then
    raise exception 'SUBSCRIPTION_EXPIRED' using hint = 'Votre essai ou abonnement est terminé.';
  end if;
  insert into public.quote_counters(user_id, year, seq) values (new.user_id, y, 1)
    on conflict (user_id, year) do update set seq = quote_counters.seq + 1
    returning seq into n;
  new.number := 'DV-' || y || '-' || lpad(n::text, 4, '0');
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists quotes_before_insert on public.quotes;
create trigger quotes_before_insert before insert on public.quotes
  for each row execute function public.quotes_before_insert();

-- Mise à jour d'un devis : le numéro et le propriétaire ne bougent pas
create or replace function public.quotes_before_update()
returns trigger language plpgsql set search_path = public as $$
begin
  new.number := old.number;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists quotes_before_update on public.quotes;
create trigger quotes_before_update before update on public.quotes
  for each row execute function public.quotes_before_update();

-- Un installateur ne peut pas modifier lui-même son abonnement
create or replace function public.profiles_protect_billing()
returns trigger language plpgsql set search_path = public as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and current_user not in ('postgres', 'supabase_admin', 'service_role') then
    new.plan := old.plan;
    new.trial_ends_at := old.trial_ends_at;
    new.subscription_ends_at := old.subscription_ends_at;
    new.payment_provider := old.payment_provider;
    new.payment_reference := old.payment_reference;
    new.email := old.email;
  end if;
  new.id := old.id;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists profiles_protect_billing on public.profiles;
create trigger profiles_protect_billing before update on public.profiles
  for each row execute function public.profiles_protect_billing();

-- À l'inscription : crée le profil (essai 15 jours) et un catalogue de départ SANS prix
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, company_name, phone, company_email)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'company_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;

  insert into public.catalog_items (user_id, type, model, power, price, position) values
    (new.id, 'panel',    'Panneau monocristallin 550 Wc', 550, null, 0),
    (new.id, 'inverter', 'Onduleur hybride 3 kW',  3,  null, 0),
    (new.id, 'inverter', 'Onduleur hybride 5 kW',  5,  null, 1),
    (new.id, 'inverter', 'Onduleur hybride 8 kW',  8,  null, 2),
    (new.id, 'inverter', 'Onduleur hybride 10 kW', 10, null, 3),
    (new.id, 'battery',  'Batterie lithium 48 V 5 kWh', 5, null, 0);
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

/* ------------------------------------------------------------------ RLS */
alter table public.profiles enable row level security;
alter table public.catalog_items enable row level security;
alter table public.quotes enable row level security;
alter table public.quote_counters enable row level security; -- aucune politique : invisible pour les utilisateurs

drop policy if exists "profil : lecture" on public.profiles;
create policy "profil : lecture" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profil : modification" on public.profiles;
create policy "profil : modification" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "catalogue : tout" on public.catalog_items;
create policy "catalogue : tout" on public.catalog_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "devis : lecture" on public.quotes;
create policy "devis : lecture" on public.quotes for select to authenticated using (user_id = auth.uid());
drop policy if exists "devis : création" on public.quotes;
create policy "devis : création" on public.quotes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "devis : modification" on public.quotes;
create policy "devis : modification" on public.quotes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "devis : suppression" on public.quotes;
create policy "devis : suppression" on public.quotes for delete to authenticated using (user_id = auth.uid());

-- Fonctions internes : utilisées par les triggers uniquement, pas appelables via l'API
revoke execute on function public.has_active_access(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.quotes_before_insert() from public, anon, authenticated;
