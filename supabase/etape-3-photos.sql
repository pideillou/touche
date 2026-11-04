-- =====================================================================
-- Touché, étape 3 : photos des chats prises par les souris
-- Déjà inclus à la fin de schema.sql. Ce fichier sert seulement si tu as
-- exécuté schema.sql avant cette étape : colle-le dans SQL Editor, puis Run.
-- =====================================================================

-- Statut final « rejetee » quand l'hôte refuse une photo contestée
alter table public.photos drop constraint if exists photos_statut_check;
alter table public.photos add constraint photos_statut_check
  check (statut in ('en_attente', 'validee', 'refusee', 'contestee', 'rejetee'));

-- Espace de stockage privé : une photo n'est visible que par les joueurs de sa partie.
-- Chaque photo est rangée dans un dossier qui porte l'identifiant de la partie.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
  on conflict (id) do nothing;

drop policy if exists "photos : envoi par les joueurs" on storage.objects;
drop policy if exists "photos : lecture par les joueurs" on storage.objects;
drop policy if exists "photos : suppression par l'hote" on storage.objects;

create policy "photos : envoi par les joueurs" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.est_joueur(((storage.foldername(name))[1])::uuid));

create policy "photos : lecture par les joueurs" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.est_joueur(((storage.foldername(name))[1])::uuid));

create policy "photos : suppression par l'hote" on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos'
    and exists (select 1 from public.parties p where p.id = ((storage.foldername(name))[1])::uuid and p.hote_id = auth.uid())
  );

-- Une souris envoie la photo d'un chat (une par chat toutes les 2 minutes)
create or replace function public.envoyer_photo(p_partie uuid, p_chat uuid, p_chemin text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from parties where id = p_partie and statut = 'en_cours' and now() >= debut_le) then
    raise exception 'La partie n''est pas en cours.';
  end if;
  if mon_role(p_partie) is distinct from 'souris' then raise exception 'Seule une souris peut photographier un chat.'; end if;
  if role_de(p_partie, p_chat) is distinct from 'chat' then raise exception 'Ce joueur n''est pas un chat.'; end if;
  if split_part(p_chemin, '/', 1) <> p_partie::text then raise exception 'Photo invalide.'; end if;
  if exists (
    select 1 from photos
    where partie_id = p_partie and souris_id = auth.uid() and chat_id = p_chat and cree_le > now() - interval '2 minutes'
  ) then
    raise exception 'Tu as déjà photographié ce chat il y a moins de 2 minutes.';
  end if;
  insert into photos (partie_id, souris_id, chat_id, chemin)
    values (p_partie, auth.uid(), p_chat, p_chemin) returning id into v_id;
  return v_id;
end;
$$;

-- Le chat photographié valide ou refuse
create or replace function public.valider_photo(p_photo uuid, p_valide boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v photos%rowtype;
begin
  select * into v from photos where id = p_photo;
  if not found or v.chat_id <> auth.uid() then raise exception 'Photo introuvable.'; end if;
  if v.statut <> 'en_attente' then raise exception 'Cette photo a déjà été traitée.'; end if;
  if p_valide then
    update photos set statut = 'validee' where id = p_photo;
    update joueurs set photos_validees = photos_validees + 1 where partie_id = v.partie_id and joueur_id = v.souris_id;
  else
    update photos set statut = 'refusee' where id = p_photo;
  end if;
end;
$$;

-- La souris conteste un refus
create or replace function public.contester_photo(p_photo uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v photos%rowtype;
begin
  select * into v from photos where id = p_photo;
  if not found or v.souris_id <> auth.uid() then raise exception 'Photo introuvable.'; end if;
  if v.statut <> 'refusee' then raise exception 'Seule une photo refusée peut être contestée.'; end if;
  update photos set statut = 'contestee' where id = p_photo;
end;
$$;

-- L'hôte tranche une photo contestée
create or replace function public.arbitrer_photo(p_photo uuid, p_valide boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v photos%rowtype;
begin
  select * into v from photos where id = p_photo;
  if not found then raise exception 'Photo introuvable.'; end if;
  if not exists (select 1 from parties where id = v.partie_id and hote_id = auth.uid()) then
    raise exception 'Seul l''hôte peut trancher.';
  end if;
  if v.statut <> 'contestee' then raise exception 'Cette photo n''est pas contestée.'; end if;
  if p_valide then
    update photos set statut = 'validee' where id = p_photo;
    update joueurs set photos_validees = photos_validees + 1 where partie_id = v.partie_id and joueur_id = v.souris_id;
  else
    update photos set statut = 'rejetee' where id = p_photo;
  end if;
end;
$$;

-- Captures et photos sans réponse sous 30 secondes sont validées
create or replace function public.expirer_captures(p_partie uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v record;
begin
  if not est_joueur(p_partie) then return; end if;
  for v in
    select id, cible_id from captures
    where partie_id = p_partie and statut = 'en_attente' and cree_le < now() - interval '30 seconds'
  loop
    update captures set statut = 'validee' where id = v.id;
    perform contaminer(p_partie, v.cible_id);
  end loop;
  for v in
    select id, souris_id from photos
    where partie_id = p_partie and statut = 'en_attente' and cree_le < now() - interval '30 seconds'
  loop
    update photos set statut = 'validee' where id = v.id;
    update joueurs set photos_validees = photos_validees + 1 where partie_id = p_partie and joueur_id = v.souris_id;
  end loop;
end;
$$;

grant execute on function public.envoyer_photo, public.valider_photo, public.contester_photo,
  public.arbitrer_photo to authenticated;

alter publication supabase_realtime add table public.photos;
