-- SolaDevis : stockage des logos
-- Bucket public en lecture (le logo apparaît sur les PDF), écriture limitée au dossier de l'installateur : <user_id>/logo.png

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "logos : ajout" on storage.objects;
create policy "logos : ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos : remplacement" on storage.objects;
create policy "logos : remplacement" on storage.objects for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos : suppression" on storage.objects;
create policy "logos : suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "logos : lecture" on storage.objects;
create policy "logos : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
