-- SolaDevis : équipe (patron + techniciens), visite technique, photos, signature électronique simple.
-- Compatible avec l'existant : un compte « profiles » reste l'entreprise ; quotes.user_id reste l'entreprise.

/* ================================================================== Équipe */
create table if not exists public.team_members (
  company_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','technician')),
  email text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id)
);
create index if not exists team_members_company_idx on public.team_members(company_id);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  role text not null default 'technician' check (role in ('technician')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (company_id, email)
);

-- Les comptes existants deviennent propriétaires de leur entreprise
insert into public.team_members (company_id, user_id, role, email)
select p.id, p.id, 'owner', coalesce(p.email, '') from public.profiles p
on conflict (user_id) do nothing;

-- Entreprise et rôle de l'utilisateur connecté (utilisés par toutes les règles RLS)
create or replace function public.my_company_id()
returns uuid language sql stable security definer set search_path = public as $$
  select company_id from public.team_members where user_id = auth.uid()
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.team_members where user_id = auth.uid()
$$;

/* ================================================================== Devis : visite, auteur, signature */
alter table public.quotes add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table public.quotes add column if not exists visit jsonb not null default '{}'::jsonb;
alter table public.quotes add column if not exists signed_at timestamptz;
alter table public.quotes add column if not exists signer_name text;
alter table public.quotes add column if not exists signature_image text;
alter table public.quotes add column if not exists signature_hash text;
alter table public.quotes add column if not exists signature_method text check (signature_method is null or signature_method in ('onsite','remote'));
alter table public.quotes add column if not exists sign_token_hash text;
alter table public.quotes add column if not exists sign_token_expires_at timestamptz;
create unique index if not exists quotes_sign_token_idx on public.quotes(sign_token_hash) where sign_token_hash is not null;

update public.quotes set created_by = user_id where created_by is null;

-- Un devis est visible par le propriétaire de l'entreprise, ou par le technicien qui l'a créé
create or replace function public.can_view_quote(p_quote uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.quotes q
    where q.id = p_quote and q.user_id = public.my_company_id()
      and (public.my_role() = 'owner' or q.created_by = auth.uid())
  )
$$;

create or replace function public.can_edit_quote(p_quote uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view_quote(p_quote)
     and exists (select 1 from public.quotes q where q.id = p_quote and q.signed_at is null)
$$;

-- Empreinte SHA-256 du contenu engageant du devis
create or replace function public.quote_content_hash(q public.quotes)
returns text language sql stable set search_path = public, extensions as $$
  select encode(extensions.digest(convert_to(jsonb_build_object(
    'entreprise', q.user_id, 'numero', q.number,
    'client', jsonb_build_object('nom', q.client_name, 'telephone', q.client_phone, 'ville', q.client_city),
    'mode', q.mode, 'lignes', q.lines, 'remise_pct', q.remise_pct, 'tva_pct', q.tva_pct,
    'total_ht', q.total_ht, 'total_ttc', q.total_ttc, 'valable_jusqu_au', q.valid_until
  )::text, 'UTF8'), 'sha256'), 'hex')
$$;

-- Insertion : rattache à l'entreprise de l'utilisateur, note l'auteur, vérifie l'abonnement, numérote
create or replace function public.quotes_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from now() at time zone 'utc')::int;
  n integer;
  company uuid;
begin
  if auth.uid() is not null then
    company := public.my_company_id();
    if company is null then raise exception 'NO_COMPANY'; end if;
    -- La valeur par défaut de user_id est l'utilisateur connecté : pour un technicien, c'est l'entreprise qui compte
    if new.user_id is null or new.user_id = auth.uid() then new.user_id := company; end if;
    if new.user_id <> company then raise exception 'Accès refusé'; end if;
    new.created_by := auth.uid();
  end if;
  if new.created_by is null then new.created_by := new.user_id; end if;
  if not public.has_active_access(new.user_id) then
    raise exception 'SUBSCRIPTION_EXPIRED' using hint = 'Votre essai ou abonnement est terminé.';
  end if;
  insert into public.quote_counters(user_id, year, seq) values (new.user_id, y, 1)
    on conflict (user_id, year) do update set seq = quote_counters.seq + 1
    returning seq into n;
  new.number := 'DV-' || y || '-' || lpad(n::text, 4, '0');
  -- Un devis neuf (y compris une copie) n'est jamais signé
  new.signed_at := null; new.signer_name := null; new.signature_image := null; new.signature_hash := null;
  new.signature_method := null; new.sign_token_hash := null; new.sign_token_expires_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end $$;

-- Mise à jour : champs figés + verrouillage après signature (pour les requêtes de l'app ;
-- les opérations d'administration, comme la suppression d'un compte, restent possibles)
create or replace function public.quotes_before_update()
returns trigger language plpgsql set search_path = public as $$
declare
  api boolean := coalesce(auth.role(), '') in ('authenticated', 'anon');
  signing boolean := coalesce(current_setting('soladevis.signing', true), '') = '1';
begin
  if api and not signing and old.signed_at is not null then
    raise exception 'QUOTE_LOCKED' using hint = 'Ce devis est signé : il ne peut plus être modifié. Dupliquez-le pour faire une nouvelle version.';
  end if;
  new.number := old.number;
  new.user_id := old.user_id;
  if api then new.created_by := old.created_by; end if;
  new.created_at := old.created_at;
  -- Les champs de signature ne se modifient que par les fonctions de signature
  if api and not signing then
    new.signed_at := old.signed_at; new.signer_name := old.signer_name; new.signature_image := old.signature_image;
    new.signature_hash := old.signature_hash; new.signature_method := old.signature_method;
    new.sign_token_hash := old.sign_token_hash; new.sign_token_expires_at := old.sign_token_expires_at;
  end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.quotes_before_delete()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Bloque les utilisateurs de l'app ; la suppression d'un compte entier (administration) reste possible
  if old.signed_at is not null and coalesce(auth.role(), '') in ('authenticated', 'anon') then
    raise exception 'QUOTE_LOCKED' using hint = 'Un devis signé ne peut pas être supprimé.';
  end if;
  return old;
end $$;
drop trigger if exists quotes_before_delete on public.quotes;
create trigger quotes_before_delete before delete on public.quotes
  for each row execute function public.quotes_before_delete();

/* ================================================================== Photos */
create table if not exists public.quote_photos (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  company_id uuid not null references public.profiles(id) on delete cascade,
  path text not null unique,
  caption text not null default '',
  width integer, height integer,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists quote_photos_quote_idx on public.quote_photos(quote_id, created_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-photos', 'quote-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

/* ================================================================== Notifications (propriétaire) */
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null default '',
  quote_id uuid references public.quotes(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_company_idx on public.notifications(company_id, created_at desc);

/* ================================================================== Signature */
create or replace function public.notify_signed(q public.quotes)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications(company_id, kind, title, body, quote_id)
  values (q.user_id, 'quote_signed',
          coalesce(nullif(q.signer_name, ''), q.client_name) || ' a signé le devis ' || q.number,
          'Signature électronique simple ' || case when q.signature_method = 'remote' then 'à distance' else 'sur place' end
          || ' · ' || replace(to_char(round(q.total_ttc), 'FM999G999G999G990'), ',', ' ') || ' FCFA TTC',
          q.id)
$$;

create or replace function public.check_signature_input(p_name text, p_image text)
returns void language plpgsql immutable as $$
begin
  if p_name is null or length(btrim(p_name)) < 2 or length(p_name) > 120 then raise exception 'INVALID_NAME'; end if;
  if p_image is null or p_image not like 'data:image/png;base64,%' or length(p_image) > 600000 or length(p_image) < 200 then
    raise exception 'INVALID_SIGNATURE';
  end if;
end $$;

-- Sur place (technicien ou propriétaire connecté). p_signed_at : heure réelle de la signature
-- si elle a été faite hors connexion (bornée : pas dans le futur, pas plus de 7 jours en arrière).
create or replace function public.sign_quote_onsite(p_quote uuid, p_name text, p_image text, p_signed_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare q public.quotes; ts timestamptz;
begin
  if auth.uid() is null or not public.can_view_quote(p_quote) then raise exception 'NOT_ALLOWED'; end if;
  select * into q from public.quotes where id = p_quote for update;
  if q.signed_at is not null then raise exception 'ALREADY_SIGNED'; end if;
  perform public.check_signature_input(p_name, p_image);
  ts := least(now(), greatest(coalesce(p_signed_at, now()), now() - interval '7 days'));
  perform set_config('soladevis.signing', '1', true);
  update public.quotes set
    signed_at = ts, signer_name = btrim(p_name), signature_image = p_image,
    signature_hash = public.quote_content_hash(q), signature_method = 'onsite',
    status = 'accepted', sign_token_hash = null, sign_token_expires_at = null
  where id = p_quote returning * into q;
  perform set_config('soladevis.signing', '', true);
  perform public.notify_signed(q);
  return jsonb_build_object('signed_at', q.signed_at, 'signature_hash', q.signature_hash);
end $$;

-- Lien de signature à distance : jeton aléatoire (192 bits), seule son empreinte est stockée
create or replace function public.create_sign_link(p_quote uuid)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare q public.quotes; tok text; exp timestamptz;
begin
  if auth.uid() is null or not public.can_edit_quote(p_quote) then raise exception 'NOT_ALLOWED'; end if;
  select * into q from public.quotes where id = p_quote;
  tok := encode(extensions.gen_random_bytes(24), 'hex');
  exp := greatest(coalesce((q.valid_until + 1)::timestamptz, now() + interval '30 days'), now() + interval '1 day');
  perform set_config('soladevis.signing', '1', true);
  update public.quotes set sign_token_hash = encode(extensions.digest(tok, 'sha256'), 'hex'), sign_token_expires_at = exp,
    status = case when status = 'draft' then 'sent' else status end
  where id = p_quote;
  perform set_config('soladevis.signing', '', true);
  return jsonb_build_object('token', tok, 'expires_at', exp);
end $$;

-- Lecture publique d'UN devis par son jeton (aucune autre donnée exposée)
create or replace function public.get_quote_for_signature(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare q public.quotes; p public.profiles;
begin
  if p_token is null or length(p_token) < 32 then return jsonb_build_object('error', 'invalid'); end if;
  select * into q from public.quotes where sign_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not found then return jsonb_build_object('error', 'invalid'); end if;
  if q.signed_at is null and q.sign_token_expires_at < now() then return jsonb_build_object('error', 'expired'); end if;
  select * into p from public.profiles where id = q.user_id;
  return jsonb_build_object(
    'quote', jsonb_build_object(
      'number', q.number, 'created_at', q.created_at, 'valid_until', q.valid_until,
      'client_name', q.client_name, 'client_phone', q.client_phone, 'client_city', q.client_city,
      'mode', q.mode, 'kwc', q.kwc, 'lines', q.lines, 'remise_pct', q.remise_pct, 'tva_pct', q.tva_pct,
      'total_ht', q.total_ht, 'total_ttc', q.total_ttc, 'result', q.result, 'status', q.status,
      'signed_at', q.signed_at, 'signer_name', q.signer_name, 'signature_image', q.signature_image,
      'signature_hash', q.signature_hash, 'signature_method', q.signature_method, 'expires_at', q.sign_token_expires_at
    ),
    'company', jsonb_build_object(
      'company_name', p.company_name, 'phone', p.phone, 'company_email', p.company_email,
      'address', p.address, 'ninea', p.ninea, 'logo_path', p.logo_path, 'conditions', p.conditions
    )
  );
end $$;

create or replace function public.sign_quote_remote(p_token text, p_name text, p_image text, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare q public.quotes;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'INVALID_TOKEN'; end if;
  select * into q from public.quotes where sign_token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') for update;
  if not found then raise exception 'INVALID_TOKEN'; end if;
  if q.signed_at is not null then raise exception 'ALREADY_SIGNED'; end if;
  if q.sign_token_expires_at < now() then raise exception 'EXPIRED_TOKEN'; end if;
  if p_accept is not true then raise exception 'NOT_ACCEPTED'; end if;
  perform public.check_signature_input(p_name, p_image);
  perform set_config('soladevis.signing', '1', true);
  update public.quotes set
    signed_at = now(), signer_name = btrim(p_name), signature_image = p_image,
    signature_hash = public.quote_content_hash(q), signature_method = 'remote', status = 'accepted'
  where id = q.id returning * into q;
  perform set_config('soladevis.signing', '', true);
  perform public.notify_signed(q);
  return jsonb_build_object('signed_at', q.signed_at, 'signature_hash', q.signature_hash);
end $$;

/* ================================================================== Inscription : propriétaire ou technicien invité */
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare inv public.team_invites;
begin
  -- Technicien : uniquement si une invitation en attente existe pour cet email ET cette entreprise
  if new.raw_user_meta_data ? 'invite_company_id' then
    select * into inv from public.team_invites
    where company_id = (new.raw_user_meta_data->>'invite_company_id')::uuid
      and lower(email) = lower(new.email) and accepted_at is null;
    if found then
      insert into public.team_members (company_id, user_id, role, email) values (inv.company_id, new.id, inv.role, coalesce(new.email, ''))
      on conflict (user_id) do nothing;
      update public.team_invites set accepted_at = now() where id = inv.id;
      return new;
    end if;
  end if;

  insert into public.profiles (id, email, company_name, phone, company_email)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'company_name', ''), coalesce(new.raw_user_meta_data->>'phone', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  insert into public.team_members (company_id, user_id, role, email) values (new.id, new.id, 'owner', coalesce(new.email, ''))
  on conflict (user_id) do nothing;
  insert into public.catalog_items (user_id, type, model, power, price, position) values
    (new.id, 'panel',    'Panneau monocristallin 550 Wc', 550, null, 0),
    (new.id, 'inverter', 'Onduleur hybride 3 kW',  3,  null, 0),
    (new.id, 'inverter', 'Onduleur hybride 5 kW',  5,  null, 1),
    (new.id, 'inverter', 'Onduleur hybride 8 kW',  8,  null, 2),
    (new.id, 'inverter', 'Onduleur hybride 10 kW', 10, null, 3),
    (new.id, 'battery',  'Batterie lithium 48 V 5 kWh', 5, null, 0);
  return new;
end $$;

/* ================================================================== RLS */
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.quote_photos enable row level security;
alter table public.notifications enable row level security;

-- Profil = entreprise : lisible par toute l'équipe, modifiable par le propriétaire seul
drop policy if exists "profil : lecture" on public.profiles;
create policy "profil : lecture" on public.profiles for select to authenticated using (id = public.my_company_id());
drop policy if exists "profil : modification" on public.profiles;
create policy "profil : modification" on public.profiles for update to authenticated
  using (id = auth.uid() and public.my_role() = 'owner') with check (id = auth.uid());

-- Catalogue : lecture par l'équipe, écriture par le propriétaire seul
drop policy if exists "catalogue : tout" on public.catalog_items;
drop policy if exists "catalogue : lecture" on public.catalog_items;
create policy "catalogue : lecture" on public.catalog_items for select to authenticated using (user_id = public.my_company_id());
drop policy if exists "catalogue : écriture" on public.catalog_items;
create policy "catalogue : écriture" on public.catalog_items for all to authenticated
  using (user_id = auth.uid() and public.my_role() = 'owner') with check (user_id = auth.uid() and public.my_role() = 'owner');

-- Devis
drop policy if exists "devis : lecture" on public.quotes;
create policy "devis : lecture" on public.quotes for select to authenticated
  using (user_id = public.my_company_id() and (public.my_role() = 'owner' or created_by = auth.uid()));
drop policy if exists "devis : création" on public.quotes;
create policy "devis : création" on public.quotes for insert to authenticated
  with check (user_id = public.my_company_id());
drop policy if exists "devis : modification" on public.quotes;
create policy "devis : modification" on public.quotes for update to authenticated
  using (user_id = public.my_company_id() and (public.my_role() = 'owner' or created_by = auth.uid()))
  with check (user_id = public.my_company_id());
drop policy if exists "devis : suppression" on public.quotes;
create policy "devis : suppression" on public.quotes for delete to authenticated
  using (user_id = public.my_company_id() and (public.my_role() = 'owner' or created_by = auth.uid()));

-- Équipe : lisible par ses membres ; écritures uniquement côté serveur (clé service_role)
drop policy if exists "équipe : lecture" on public.team_members;
create policy "équipe : lecture" on public.team_members for select to authenticated using (company_id = public.my_company_id());
drop policy if exists "invitations : lecture" on public.team_invites;
create policy "invitations : lecture" on public.team_invites for select to authenticated
  using (company_id = public.my_company_id() and public.my_role() = 'owner');

-- Photos
drop policy if exists "photos : lecture" on public.quote_photos;
create policy "photos : lecture" on public.quote_photos for select to authenticated using (public.can_view_quote(quote_id));
drop policy if exists "photos : ajout" on public.quote_photos;
create policy "photos : ajout" on public.quote_photos for insert to authenticated
  with check (company_id = public.my_company_id() and public.can_edit_quote(quote_id));
drop policy if exists "photos : légende" on public.quote_photos;
create policy "photos : légende" on public.quote_photos for update to authenticated
  using (public.can_edit_quote(quote_id)) with check (public.can_edit_quote(quote_id));
drop policy if exists "photos : suppression" on public.quote_photos;
create policy "photos : suppression" on public.quote_photos for delete to authenticated using (public.can_edit_quote(quote_id));

-- Fichiers photos : <entreprise>/<devis>/<fichier>.jpg
drop policy if exists "photos chantier : lecture" on storage.objects;
create policy "photos chantier : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'quote-photos' and public.can_view_quote(((storage.foldername(name))[2])::uuid));
drop policy if exists "photos chantier : ajout" on storage.objects;
create policy "photos chantier : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'quote-photos' and (storage.foldername(name))[1] = public.my_company_id()::text
              and public.can_edit_quote(((storage.foldername(name))[2])::uuid));
drop policy if exists "photos chantier : suppression" on storage.objects;
create policy "photos chantier : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'quote-photos' and public.can_edit_quote(((storage.foldername(name))[2])::uuid));

-- Notifications : propriétaire uniquement
drop policy if exists "notifications : lecture" on public.notifications;
create policy "notifications : lecture" on public.notifications for select to authenticated
  using (company_id = public.my_company_id() and public.my_role() = 'owner');
drop policy if exists "notifications : lu" on public.notifications;
create policy "notifications : lu" on public.notifications for update to authenticated
  using (company_id = public.my_company_id() and public.my_role() = 'owner')
  with check (company_id = public.my_company_id());

/* ================================================================== Droits d'exécution */
revoke execute on function public.notify_signed(public.quotes) from public, anon, authenticated;
revoke execute on function public.quote_content_hash(public.quotes) from public, anon, authenticated;
revoke execute on function public.check_signature_input(text, text) from public, anon;
revoke execute on function public.sign_quote_onsite(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.sign_quote_onsite(uuid, text, text, timestamptz) to authenticated;
revoke execute on function public.create_sign_link(uuid) from public, anon;
grant execute on function public.create_sign_link(uuid) to authenticated;
grant execute on function public.get_quote_for_signature(text) to anon, authenticated;
grant execute on function public.sign_quote_remote(text, text, text, boolean) to anon, authenticated;
grant execute on function public.my_company_id() to authenticated;
grant execute on function public.my_role() to authenticated;
grant execute on function public.can_view_quote(uuid) to authenticated;
grant execute on function public.can_edit_quote(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.quotes_before_insert() from public, anon, authenticated;

-- Fonctions internes : jamais appelables sans compte
revoke execute on function public.my_company_id() from public, anon;
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.can_view_quote(uuid) from public, anon;
revoke execute on function public.can_edit_quote(uuid) from public, anon;
alter function public.check_signature_input(text, text) set search_path = public;
