-- Tests de sécurité SolaDevis : droits par rôle, lien de signature, verrouillage après signature.
-- À exécuter dans Supabase > SQL Editor. Le script crée ses propres comptes fictifs (@soladevis-test.example.com),
-- affiche le résultat de chaque test, puis supprime tout ce qu'il a créé.
-- Résultat attendu : toutes les lignes avec ok = true.

create temp table _r (n serial, test text, ok boolean, detail text default '');
create temp table _ids (k text primary key, v uuid);
create temp table _tok (k text primary key, v text);
grant all on _r, _ids, _tok to authenticated, anon;
grant usage on sequence _r_n_seq to authenticated, anon;

-- ---------------------------------------------------------------- Comptes fictifs
-- Entreprise A : patron + 2 techniciens. Entreprise B : un autre patron. C : tente de rejoindre A sans invitation.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'patron.a@soladevis-test.example.com', '', now(), '{}', '{"company_name":"Entreprise A"}', now(), now()),
       ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'patron.b@soladevis-test.example.com', '', now(), '{}', '{"company_name":"Entreprise B"}', now(), now());
insert into _ids select 'A', id from auth.users where email = 'patron.a@soladevis-test.example.com';
insert into _ids select 'B', id from auth.users where email = 'patron.b@soladevis-test.example.com';
update public.catalog_items set price = 100000 where user_id = (select v from _ids where k = 'A');

insert into public.team_invites (company_id, email) values
  ((select v from _ids where k = 'A'), 'tech.1@soladevis-test.example.com'),
  ((select v from _ids where k = 'A'), 'tech.2@soladevis-test.example.com');
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
select '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', e, '', now(), '{}',
       jsonb_build_object('invite_company_id', (select v from _ids where k = 'A')), now(), now()
from unnest(array['tech.1@soladevis-test.example.com', 'tech.2@soladevis-test.example.com', 'intrus.c@soladevis-test.example.com']) e;
insert into _ids select 'T1', id from auth.users where email = 'tech.1@soladevis-test.example.com';
insert into _ids select 'T2', id from auth.users where email = 'tech.2@soladevis-test.example.com';
insert into _ids select 'C', id from auth.users where email = 'intrus.c@soladevis-test.example.com';

insert into _r(test, ok) select 'Invitation : les techniciens invités rejoignent l''entreprise A', count(*) = 2
  from public.team_members where company_id = (select v from _ids where k = 'A') and role = 'technician';
insert into _r(test, ok) select 'Invitation : sans invitation, impossible de rejoindre l''entreprise A', not exists (
  select 1 from public.team_members where user_id = (select v from _ids where k = 'C') and company_id = (select v from _ids where k = 'A'));

-- Fonction utilitaire : se connecter « en tant que » quelqu'un (jeton JWT simulé)
create or replace function pg_temp.as_user(k text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', (select v from _ids where _ids.k = as_user.k), 'role', 'authenticated')::text, false)
$$;

-- ---------------------------------------------------------------- Devis de chaque personne
select pg_temp.as_user('T1'); set role authenticated;
insert into public.quotes (mode, client_name) values ('hybride', 'Client du technicien 1');
reset role;
select pg_temp.as_user('T2'); set role authenticated;
insert into public.quotes (mode, client_name) values ('autonome', 'Client du technicien 2');
reset role;
select pg_temp.as_user('B'); set role authenticated;
insert into public.quotes (mode, client_name) values ('reseau', 'Client de B');
reset role;
insert into _ids select 'Q1', id from public.quotes where client_name = 'Client du technicien 1' and user_id = (select v from _ids where k = 'A');
insert into _ids select 'Q2', id from public.quotes where client_name = 'Client du technicien 2' and user_id = (select v from _ids where k = 'A');
insert into _ids select 'QB', id from public.quotes where client_name = 'Client de B' and user_id = (select v from _ids where k = 'B');
insert into _r(test, ok) select 'Devis du technicien rattaché à son entreprise, auteur noté',
  (select user_id = (select v from _ids where k = 'A') and created_by = (select v from _ids where k = 'T1') from public.quotes where id = (select v from _ids where k = 'Q1'));

-- ---------------------------------------------------------------- Droits du technicien 1
select pg_temp.as_user('T1'); set role authenticated;
do $$
declare n int; ok boolean;
begin
  select count(*) into n from public.quotes;
  insert into _r(test, ok, detail) values ('Technicien : ne voit que ses propres devis', n = 1, n || ' devis visible(s)');

  select count(*) into n from public.quotes where user_id = (select v from _ids where k = 'B');
  insert into _r(test, ok) values ('Technicien : ne voit pas les devis d''une autre entreprise', n = 0);

  select count(*) into n from public.catalog_items;
  insert into _r(test, ok, detail) values ('Technicien : voit le catalogue de son entreprise', n = 6, n || ' articles');

  update public.catalog_items set price = 1 where user_id = (select v from _ids where k = 'A');
  get diagnostics n = row_count;
  insert into _r(test, ok, detail) values ('Technicien : ne peut pas modifier les prix', n = 0, n || ' ligne(s) modifiée(s)');

  begin
    insert into public.catalog_items (user_id, type, model, power, price) values ((select v from _ids where k = 'A'), 'panel', 'Pirate', 1, 1);
    ok := false;
  exception when others then ok := true; end;
  insert into _r(test, ok) values ('Technicien : ne peut pas ajouter d''article au catalogue', ok);

  update public.profiles set tva = 0, structure_par_panneau = 1 where id = (select v from _ids where k = 'A');
  get diagnostics n = row_count;
  insert into _r(test, ok) values ('Technicien : ne peut pas modifier les réglages de l''entreprise', n = 0);

  select count(*) into n from public.team_invites;
  insert into _r(test, ok) values ('Technicien : ne voit pas les invitations de l''équipe', n = 0);

  begin
    insert into public.quotes (mode, client_name, user_id) values ('hybride', 'Intrusion', (select v from _ids where k = 'B'));
    ok := false;
  exception when others then ok := true; end;
  insert into _r(test, ok) values ('Technicien : ne peut pas créer un devis dans une autre entreprise', ok);

  update public.quotes set client_name = 'Piraté' where id = (select v from _ids where k = 'Q2');
  get diagnostics n = row_count;
  insert into _r(test, ok) values ('Technicien : ne peut pas modifier le devis d''un collègue', n = 0);

  begin
    perform public.sign_quote_onsite((select v from _ids where k = 'Q2'), 'Faux client', 'data:image/png;base64,' || repeat('A', 300));
    ok := false;
  exception when others then ok := sqlerrm = 'NOT_ALLOWED'; end;
  insert into _r(test, ok) values ('Technicien : ne peut pas faire signer le devis d''un collègue', ok);

  insert into _tok values ('Q1', (public.create_sign_link((select v from _ids where k = 'Q1')))->>'token');
end $$;
reset role;

-- ---------------------------------------------------------------- Le patron voit tout son entreprise
select pg_temp.as_user('A'); set role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.quotes;
  insert into _r(test, ok, detail) values ('Patron : voit tous les devis de son entreprise', n = 2, n || ' devis');
  select count(*) into n from public.quotes where user_id = (select v from _ids where k = 'B');
  insert into _r(test, ok) values ('Patron : ne voit pas les devis d''une autre entreprise', n = 0);
  select count(*) into n from public.team_invites;
  insert into _r(test, ok) values ('Patron : voit les invitations de son équipe', n = 2);
end $$;
reset role;

-- ---------------------------------------------------------------- Lien de signature (visiteur sans compte)
select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
do $$
declare j jsonb; ok boolean; tok text := (select v from _tok where k = 'Q1');
begin
  insert into _r(test, ok) values ('Lien : le jeton fait 48 caractères aléatoires', length(tok) = 48);

  j := public.get_quote_for_signature('mauvais-jeton-mauvais-jeton-mauvais-jeton-0000');
  insert into _r(test, ok) values ('Lien : un mauvais jeton est refusé', j->>'error' = 'invalid');

  j := public.get_quote_for_signature(tok);
  insert into _r(test, ok, detail) values ('Lien : le bon jeton montre ce devis et seulement lui',
    j->'quote'->>'client_name' = 'Client du technicien 1' and j->'quote' ? 'number' and not (j->'quote' ? 'user_id') and not (j ? 'quotes'),
    coalesce(j->'quote'->>'number', ''));

  begin
    perform 1 from public.quotes;
    insert into _r(test, ok) values ('Lien : un visiteur ne peut pas lire la table des devis', not exists (select 1 from public.quotes));
  exception when others then insert into _r(test, ok) values ('Lien : un visiteur ne peut pas lire la table des devis', true); end;

  begin
    perform public.sign_quote_remote(tok, 'Client du technicien 1', 'data:image/png;base64,' || repeat('A', 300), false);
    ok := false;
  exception when others then ok := sqlerrm = 'NOT_ACCEPTED'; end;
  insert into _r(test, ok) values ('Lien : il faut cocher « J''accepte »', ok);

  begin
    perform public.sign_quote_remote('mauvais-jeton-mauvais-jeton-mauvais-jeton-0000', 'X', 'data:image/png;base64,' || repeat('A', 300), true);
    ok := false;
  exception when others then ok := sqlerrm = 'INVALID_TOKEN'; end;
  insert into _r(test, ok) values ('Lien : impossible de signer avec un mauvais jeton', ok);
end $$;
reset role;

-- Lien expiré
select set_config('request.jwt.claims', '{}', false); -- action « administrateur »
update public.quotes set sign_token_expires_at = now() - interval '1 minute' where id = (select v from _ids where k = 'Q1');
select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
do $$
declare j jsonb; ok boolean; tok text := (select v from _tok where k = 'Q1');
begin
  j := public.get_quote_for_signature(tok);
  insert into _r(test, ok) values ('Lien : un lien expiré n''affiche plus le devis', j->>'error' = 'expired');
  begin
    perform public.sign_quote_remote(tok, 'Client du technicien 1', 'data:image/png;base64,' || repeat('A', 300), true);
    ok := false;
  exception when others then ok := sqlerrm = 'EXPIRED_TOKEN'; end;
  insert into _r(test, ok) values ('Lien : impossible de signer avec un lien expiré', ok);
end $$;
reset role;
select set_config('request.jwt.claims', '{}', false);
update public.quotes set sign_token_expires_at = now() + interval '10 days' where id = (select v from _ids where k = 'Q1');

-- Signature à distance réussie, puis double signature refusée
select set_config('request.jwt.claims', '{"role":"anon"}', false); set role anon;
do $$
declare j jsonb; ok boolean; tok text := (select v from _tok where k = 'Q1');
begin
  j := public.sign_quote_remote(tok, 'Moussa Diop', 'data:image/png;base64,' || repeat('A', 300), true);
  insert into _r(test, ok) values ('Lien : signature à distance enregistrée avec son empreinte', length(j->>'signature_hash') = 64);
  begin
    perform public.sign_quote_remote(tok, 'Moussa Diop', 'data:image/png;base64,' || repeat('A', 300), true);
    ok := false;
  exception when others then ok := sqlerrm = 'ALREADY_SIGNED'; end;
  insert into _r(test, ok) values ('Lien : un devis déjà signé ne peut pas être signé une 2e fois', ok);
  j := public.get_quote_for_signature(tok);
  insert into _r(test, ok) values ('Lien : après signature, le lien affiche le devis signé', j->'quote'->>'signer_name' = 'Moussa Diop');
end $$;
reset role;

insert into _r(test, ok) select 'Signature : statut « Accepté », nom, date et empreinte enregistrés',
  status = 'accepted' and signer_name = 'Moussa Diop' and signed_at is not null and signature_method = 'remote'
  and signature_hash = public.quote_content_hash(q)
  from public.quotes q where id = (select v from _ids where k = 'Q1');

-- ---------------------------------------------------------------- Verrouillage après signature
select pg_temp.as_user('T1'); set role authenticated;
do $$
declare ok boolean;
begin
  begin
    update public.quotes set total_ttc = 1, client_name = 'Modifié' where id = (select v from _ids where k = 'Q1');
    ok := false;
  exception when others then ok := sqlerrm = 'QUOTE_LOCKED'; end;
  insert into _r(test, ok) values ('Verrou : un devis signé ne peut plus être modifié (technicien)', ok);
  begin
    delete from public.quotes where id = (select v from _ids where k = 'Q1');
    ok := false;
  exception when others then ok := sqlerrm = 'QUOTE_LOCKED'; end;
  insert into _r(test, ok) values ('Verrou : un devis signé ne peut pas être supprimé', ok);
  begin
    insert into public.quote_photos (quote_id, company_id, path) values ((select v from _ids where k = 'Q1'), (select v from _ids where k = 'A'), 'x/y/z.jpg');
    ok := false;
  exception when others then ok := true; end;
  insert into _r(test, ok) values ('Verrou : impossible d''ajouter une photo à un devis signé', ok);
end $$;
reset role;

select pg_temp.as_user('A'); set role authenticated;
do $$
declare ok boolean; n int;
begin
  begin
    update public.quotes set status = 'refused' where id = (select v from _ids where k = 'Q1');
    ok := false;
  exception when others then ok := sqlerrm = 'QUOTE_LOCKED'; end;
  insert into _r(test, ok) values ('Verrou : même le patron ne peut pas modifier un devis signé', ok);

  insert into public.quotes (mode, client_name, lines) select mode, client_name, lines from public.quotes where id = (select v from _ids where k = 'Q1');
  select count(*) into n from public.quotes where client_name = 'Client du technicien 1' and signed_at is null;
  insert into _r(test, ok) values ('Verrou : « Dupliquer » crée une nouvelle version non signée', n = 1);

  select count(*) into n from public.notifications where kind = 'quote_signed';
  insert into _r(test, ok) values ('Notification : le patron est prévenu de la signature', n = 1);
end $$;
reset role;

select pg_temp.as_user('T2'); set role authenticated;
do $$
declare j jsonb; ok boolean; n int;
begin
  j := public.sign_quote_onsite((select v from _ids where k = 'Q2'), 'Awa Ndiaye', 'data:image/png;base64,' || repeat('A', 300), now() - interval '2 hours');
  insert into _r(test, ok) values ('Sur place : signature enregistrée avec l''heure réelle (hors connexion)',
    (j->>'signed_at')::timestamptz < now() - interval '1 hour');
  begin
    perform public.sign_quote_onsite((select v from _ids where k = 'Q2'), 'Awa Ndiaye', 'data:image/png;base64,' || repeat('A', 300));
    ok := false;
  exception when others then ok := sqlerrm = 'ALREADY_SIGNED'; end;
  insert into _r(test, ok) values ('Sur place : impossible de signer deux fois', ok);
  select count(*) into n from public.notifications;
  insert into _r(test, ok) values ('Notification : un technicien ne voit pas les notifications du patron', n = 0);
end $$;
reset role;

-- ---------------------------------------------------------------- Nettoyage, puis résultat
select set_config('request.jwt.claims', '{}', false);
delete from public.quote_counters where user_id in (select v from _ids where k in ('A', 'B', 'C'));
delete from auth.users where email like '%@soladevis-test.example.com';

select n, test, ok, detail from _r order by n;
