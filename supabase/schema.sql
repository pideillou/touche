-- =====================================================================
-- Touché : schéma de la base Supabase (version 1, mode chat contaminé)
-- À coller en entier dans Supabase > SQL Editor, puis cliquer sur Run.
-- Le script peut être relancé : il supprime d'abord ce qu'il recrée.
-- =====================================================================

drop table if exists public.resultats, public.photos, public.captures, public.positions,
  public.joueurs, public.parties, public.profils, public.zones cascade;

-- ---------- Tables ----------------------------------------------------

-- Zones de jeu prédéfinies, par ville
create table public.zones (
  id uuid primary key default gen_random_uuid(),
  ville text not null,
  nom text not null,
  description text,
  latitude double precision not null,
  longitude double precision not null,
  rayon_m integer not null default 600,
  ordre integer not null default 0
);

-- Profil public d'un joueur (un compte invité en a un aussi)
create table public.profils (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (char_length(pseudo) between 2 and 20),
  avatar_url text,
  cree_le timestamptz not null default now()
);

-- Une partie, créée par un hôte et rejointe avec un code à 4 caractères
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  hote_id uuid not null references auth.users (id) on delete cascade,
  zone_id uuid not null references public.zones (id),
  mode text not null default 'contamination' check (mode in ('contamination')),
  rayon_m integer not null check (rayon_m between 200 and 1500),
  duree_min integer not null check (duree_min between 5 and 90),
  delai_hors_zone_s integer not null default 30 check (delai_hors_zone_s between 10 and 120),
  invites_acceptes boolean not null default true,
  statut text not null default 'attente' check (statut in ('attente', 'en_cours', 'terminee')),
  debut_le timestamptz,
  fin_le timestamptz,
  cree_le timestamptz not null default now()
);

-- Les joueurs d'une partie et leur rôle
create table public.joueurs (
  partie_id uuid not null references public.parties (id) on delete cascade,
  joueur_id uuid not null references auth.users (id) on delete cascade,
  pseudo text not null,
  role text not null default 'souris' check (role in ('souris', 'chat')),
  regles_acceptees boolean not null default false,
  devenu_chat_le timestamptz,
  photos_validees integer not null default 0,
  rejoint_le timestamptz not null default now(),
  primary key (partie_id, joueur_id)
);

-- Dernière position connue de chaque joueur (envoyée toutes les 20 s)
create table public.positions (
  partie_id uuid not null,
  joueur_id uuid not null,
  latitude double precision not null,
  longitude double precision not null,
  precision_m real,
  maj_le timestamptz not null default now(),
  primary key (partie_id, joueur_id),
  foreign key (partie_id, joueur_id) references public.joueurs (partie_id, joueur_id) on delete cascade
);

-- Captures signalées par un chat (utilisées à l'étape suivante)
create table public.captures (
  id uuid primary key default gen_random_uuid(),
  partie_id uuid not null references public.parties (id) on delete cascade,
  chat_id uuid not null,
  cible_id uuid not null,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'confirmee', 'contestee', 'validee', 'refusee')),
  distance_m real,
  cree_le timestamptz not null default now()
);

-- Photos de chats prises par les souris (utilisées à l'étape suivante)
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  partie_id uuid not null references public.parties (id) on delete cascade,
  souris_id uuid not null,
  chat_id uuid,
  chemin text not null,
  statut text not null default 'en_attente'
    check (statut in ('en_attente', 'validee', 'refusee', 'contestee')),
  cree_le timestamptz not null default now()
);

-- ---------- Fonctions d'aide pour les règles d'accès -------------------

create or replace function public.est_joueur(p_partie uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from joueurs where partie_id = p_partie and joueur_id = auth.uid());
$$;

create or replace function public.mon_role(p_partie uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from joueurs where partie_id = p_partie and joueur_id = auth.uid();
$$;

create or replace function public.role_de(p_partie uuid, p_joueur uuid)
returns text language sql stable security definer set search_path = public as $$
  select role from joueurs where partie_id = p_partie and joueur_id = p_joueur;
$$;

-- ---------- Règles d'accès (Row Level Security) -----------------------

alter table public.zones enable row level security;
alter table public.profils enable row level security;
alter table public.parties enable row level security;
alter table public.joueurs enable row level security;
alter table public.positions enable row level security;
alter table public.captures enable row level security;
alter table public.photos enable row level security;

create policy "zones lisibles" on public.zones for select to authenticated using (true);

create policy "mon profil" on public.profils for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "parties de mes parties" on public.parties for select to authenticated
  using (hote_id = auth.uid() or public.est_joueur(id));

create policy "joueurs de mes parties" on public.joueurs for select to authenticated
  using (public.est_joueur(partie_id));

-- Positions : chacun voit la sienne, les chats voient celles des souris.
-- Les souris ne voient jamais les chats.
create policy "positions visibles" on public.positions for select to authenticated
  using (
    joueur_id = auth.uid()
    or (public.mon_role(partie_id) = 'chat' and public.role_de(partie_id, joueur_id) = 'souris')
  );

create policy "envoyer ma position" on public.positions for insert to authenticated
  with check (
    joueur_id = auth.uid() and public.est_joueur(partie_id)
    and exists (select 1 from public.parties p where p.id = partie_id and p.statut = 'en_cours')
  );

create policy "mettre a jour ma position" on public.positions for update to authenticated
  using (joueur_id = auth.uid()) with check (joueur_id = auth.uid());

create policy "captures de mes parties" on public.captures for select to authenticated
  using (public.est_joueur(partie_id));

create policy "photos de mes parties" on public.photos for select to authenticated
  using (public.est_joueur(partie_id));

-- ---------- Actions du jeu (appelées par l'appli) ---------------------

create or replace function public.generer_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  resultat text;
begin
  loop
    resultat := '';
    for i in 1..4 loop
      resultat := resultat || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.parties where code = resultat);
  end loop;
  return resultat;
end;
$$;

create or replace function public.creer_partie(
  p_zone uuid, p_pseudo text, p_rayon integer, p_duree integer, p_delai integer, p_invites boolean
) returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text := generer_code();
  v_partie uuid;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  insert into profils (id, pseudo) values (auth.uid(), trim(p_pseudo))
    on conflict (id) do update set pseudo = excluded.pseudo;
  insert into parties (code, hote_id, zone_id, rayon_m, duree_min, delai_hors_zone_s, invites_acceptes)
    values (v_code, auth.uid(), p_zone, p_rayon, p_duree, p_delai, p_invites)
    returning id into v_partie;
  insert into joueurs (partie_id, joueur_id, pseudo) values (v_partie, auth.uid(), trim(p_pseudo));
  return v_code;
end;
$$;

create or replace function public.rejoindre_partie(p_code text, p_pseudo text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_partie parties%rowtype;
  v_nombre integer;
begin
  if auth.uid() is null then raise exception 'Connexion requise.'; end if;
  select * into v_partie from parties where code = upper(trim(p_code));
  if not found then raise exception 'Aucune partie avec ce code.'; end if;
  if v_partie.statut <> 'attente' then raise exception 'Cette partie a déjà commencé.'; end if;
  if not v_partie.invites_acceptes and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'Cette partie demande un compte.';
  end if;
  select count(*) into v_nombre from joueurs where partie_id = v_partie.id;
  if v_nombre >= 12 and not exists (select 1 from joueurs where partie_id = v_partie.id and joueur_id = auth.uid()) then
    raise exception 'La partie est complète (12 joueurs).';
  end if;
  insert into profils (id, pseudo) values (auth.uid(), trim(p_pseudo))
    on conflict (id) do update set pseudo = excluded.pseudo;
  insert into joueurs (partie_id, joueur_id, pseudo) values (v_partie.id, auth.uid(), trim(p_pseudo))
    on conflict (partie_id, joueur_id) do update set pseudo = excluded.pseudo;
  return v_partie.code;
end;
$$;

create or replace function public.accepter_regles(p_partie uuid)
returns void language sql security definer set search_path = public as $$
  update joueurs set regles_acceptees = true where partie_id = p_partie and joueur_id = auth.uid();
$$;

-- Lance la partie : 1 chat tiré au sort, 2 au-delà de 10 joueurs.
-- Le chrono démarre 5 secondes après, le temps du compte à rebours.
create or replace function public.lancer_partie(p_partie uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_partie parties%rowtype;
  v_nombre integer;
begin
  select * into v_partie from parties where id = p_partie;
  if v_partie.hote_id is distinct from auth.uid() then raise exception 'Seul l''hôte peut lancer la partie.'; end if;
  if v_partie.statut <> 'attente' then raise exception 'La partie est déjà lancée.'; end if;
  select count(*) into v_nombre from joueurs where partie_id = p_partie;
  if v_nombre < 2 then raise exception 'Il faut au moins 2 joueurs.'; end if;
  if exists (select 1 from joueurs where partie_id = p_partie and not regles_acceptees) then
    raise exception 'Tous les joueurs doivent accepter les règles.';
  end if;
  update joueurs set role = 'chat', devenu_chat_le = now()
    where partie_id = p_partie and joueur_id in (
      select joueur_id from joueurs where partie_id = p_partie
      order by random() limit case when v_nombre > 10 then 2 else 1 end
    );
  update parties set statut = 'en_cours',
    debut_le = now() + interval '5 seconds',
    fin_le = now() + interval '5 seconds' + make_interval(mins => duree_min)
    where id = p_partie;
end;
$$;

revoke execute on function public.generer_code() from public, anon;
grant execute on function public.creer_partie, public.rejoindre_partie,
  public.accepter_regles, public.lancer_partie to authenticated;

-- ---------- Temps réel ------------------------------------------------

alter publication supabase_realtime add table public.parties, public.joueurs;

-- ---------- Zones de Limoges -------------------------------------------
-- Coordonnées issues d'OpenStreetMap (© contributeurs OpenStreetMap)

insert into public.zones (ville, nom, description, latitude, longitude, rayon_m, ordre) values
  ('Limoges', 'Centre-ville', 'République, Jourdan, Halles', 45.83192, 1.25813, 600, 1),
  ('Limoges', 'Quartier de la gare', 'Autour des Bénédictins', 45.83630, 1.26747, 400, 2),
  ('Limoges', 'IUT du Limousin', 'Campus Maurois, allée André Maurois', 45.83565, 1.23105, 350, 3);

-- Étape 2 : captures, sortie de zone et fin de partie
-- Distance en mètres entre deux points GPS (même formule que l'appli)
create or replace function public.distance_m(
  lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision
) returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ));
$$;

-- Transforme une souris en chat. Usage interne : l'appli ne peut pas l'appeler.
create or replace function public.contaminer(p_partie uuid, p_joueur uuid)
returns void language sql security definer set search_path = public as $$
  update joueurs set role = 'chat', devenu_chat_le = now()
  where partie_id = p_partie and joueur_id = p_joueur and role = 'souris';
$$;
revoke execute on function public.contaminer(uuid, uuid) from public, anon, authenticated;

-- Un chat signale qu'il a touché une souris
create or replace function public.signaler_capture(p_partie uuid, p_cible uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_distance double precision;
begin
  if not exists (select 1 from parties where id = p_partie and statut = 'en_cours' and now() >= debut_le) then
    raise exception 'La partie n''est pas en cours.';
  end if;
  if mon_role(p_partie) is distinct from 'chat' then raise exception 'Seul un chat peut toucher.'; end if;
  if role_de(p_partie, p_cible) is distinct from 'souris' then raise exception 'Ce joueur n''est plus une souris.'; end if;
  if exists (select 1 from captures where partie_id = p_partie and cible_id = p_cible and statut in ('en_attente', 'contestee')) then
    raise exception 'Une capture de ce joueur est déjà en cours.';
  end if;
  -- Distance entre les deux dernières positions connues, pour aider l'hôte en cas de litige
  select distance_m(a.latitude, a.longitude, b.latitude, b.longitude) into v_distance
    from positions a join positions b on b.partie_id = a.partie_id
    where a.partie_id = p_partie and a.joueur_id = auth.uid() and b.joueur_id = p_cible;
  insert into captures (partie_id, chat_id, cible_id, distance_m)
    values (p_partie, auth.uid(), p_cible, v_distance) returning id into v_id;
  return v_id;
end;
$$;

-- La souris confirme (elle devient chat) ou conteste (l'hôte tranchera)
create or replace function public.repondre_capture(p_capture uuid, p_confirme boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v captures%rowtype;
begin
  select * into v from captures where id = p_capture;
  if not found or v.cible_id <> auth.uid() then raise exception 'Capture introuvable.'; end if;
  if v.statut <> 'en_attente' then raise exception 'Cette capture a déjà été traitée.'; end if;
  if p_confirme then
    update captures set statut = 'confirmee' where id = p_capture;
    perform contaminer(v.partie_id, v.cible_id);
  else
    update captures set statut = 'contestee' where id = p_capture;
  end if;
end;
$$;

-- L'hôte tranche une capture contestée
create or replace function public.arbitrer_capture(p_capture uuid, p_valide boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v captures%rowtype;
begin
  select * into v from captures where id = p_capture;
  if not found then raise exception 'Capture introuvable.'; end if;
  if not exists (select 1 from parties where id = v.partie_id and hote_id = auth.uid()) then
    raise exception 'Seul l''hôte peut trancher.';
  end if;
  if v.statut <> 'contestee' then raise exception 'Cette capture n''est pas contestée.'; end if;
  update captures set statut = case when p_valide then 'validee' else 'refusee' end where id = p_capture;
  if p_valide then perform contaminer(v.partie_id, v.cible_id); end if;
end;
$$;

-- Sans réponse sous 30 secondes, la capture est validée.
-- Chaque téléphone de la partie appelle cette fonction toutes les 20 secondes.
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
end;
$$;

-- Une souris restée hors zone trop longtemps devient chat.
-- La base vérifie elle-même avec la dernière position envoyée.
create or replace function public.sortie_de_zone(p_partie uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_dehors boolean;
begin
  select distance_m(pos.latitude, pos.longitude, z.latitude, z.longitude) > p.rayon_m into v_dehors
    from parties p
    join zones z on z.id = p.zone_id
    join positions pos on pos.partie_id = p.id and pos.joueur_id = auth.uid()
    where p.id = p_partie and p.statut = 'en_cours';
  if coalesce(v_dehors, false) and mon_role(p_partie) = 'souris' then
    perform contaminer(p_partie, auth.uid());
    return true;
  end if;
  return false;
end;
$$;

-- Termine la partie quand le chrono est écoulé ou qu'il ne reste plus de souris.
-- Les positions sont alors effacées : elles ne servent plus à rien.
create or replace function public.verifier_fin(p_partie uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v parties%rowtype;
begin
  if not est_joueur(p_partie) then raise exception 'Partie introuvable.'; end if;
  select * into v from parties where id = p_partie;
  if v.statut = 'en_cours' and now() >= v.debut_le
     and (now() >= v.fin_le or not exists (select 1 from joueurs where partie_id = p_partie and role = 'souris')) then
    update parties set statut = 'terminee', fin_le = least(fin_le, now()) where id = p_partie;
    delete from positions where partie_id = p_partie;
    return 'terminee';
  end if;
  return v.statut;
end;
$$;

grant execute on function public.signaler_capture, public.repondre_capture, public.arbitrer_capture,
  public.expirer_captures, public.sortie_de_zone, public.verifier_fin to authenticated;

alter publication supabase_realtime add table public.captures;

-- Étape 3 : photos des chats prises par les souris
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

-- Étape 4 : comptes, selfie, niveau et historique
-- Points d'expérience cumulés
alter table public.profils add column if not exists xp integer not null default 0;

-- Résultat de chaque joueur à la fin de chaque partie : sert à l'historique et au niveau
create table if not exists public.resultats (
  partie_id uuid not null references public.parties (id) on delete cascade,
  joueur_id uuid not null references auth.users (id) on delete cascade,
  rang integer not null,
  role_final text not null,
  survie_s integer not null default 0,
  photos integer not null default 0,
  captures integer not null default 0,
  xp_gagne integer not null default 0,
  cree_le timestamptz not null default now(),
  primary key (partie_id, joueur_id)
);
alter table public.resultats enable row level security;
drop policy if exists "resultats de mes parties" on public.resultats;
create policy "resultats de mes parties" on public.resultats for select to authenticated
  using (joueur_id = auth.uid() or public.est_joueur(partie_id));

-- Calcule le classement et l'expérience de chacun.
-- Barème : 50 XP pour avoir joué, 100 pour avoir survécu, 20 par photo validée,
-- 30 par capture réussie, 150 de plus pour la souris gagnante.
create or replace function public.enregistrer_resultats(p_partie uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v parties%rowtype;
begin
  select * into v from parties where id = p_partie;
  insert into resultats (partie_id, joueur_id, rang, role_final, survie_s, photos, captures)
  select
    p_partie,
    j.joueur_id,
    rank() over (
      order by case when j.role = 'souris' then 0 when j.devenu_chat_le > v.debut_le then 1 else 2 end,
      j.photos_validees desc,
      j.devenu_chat_le desc
    ),
    j.role,
    case
      when j.role = 'souris' then extract(epoch from (v.fin_le - v.debut_le))::integer
      when j.devenu_chat_le > v.debut_le then extract(epoch from (j.devenu_chat_le - v.debut_le))::integer
      else 0
    end,
    j.photos_validees,
    (select count(*) from captures c where c.partie_id = p_partie and c.chat_id = j.joueur_id and c.statut in ('confirmee', 'validee'))
  from joueurs j
  where j.partie_id = p_partie
  on conflict (partie_id, joueur_id) do nothing;

  update resultats set xp_gagne = 50
    + case when role_final = 'souris' then 100 else 0 end
    + 20 * photos
    + 30 * captures
    + case when role_final = 'souris' and rang = 1 then 150 else 0 end
  where partie_id = p_partie;

  update profils p set xp = p.xp + r.xp_gagne
  from resultats r
  where r.partie_id = p_partie and r.joueur_id = p.id;
end;
$$;
revoke execute on function public.enregistrer_resultats(uuid) from public, anon, authenticated;

-- Fin de partie : même règle qu'avant, avec l'enregistrement des résultats en plus
create or replace function public.verifier_fin(p_partie uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v parties%rowtype;
begin
  if not est_joueur(p_partie) then raise exception 'Partie introuvable.'; end if;
  select * into v from parties where id = p_partie;
  if v.statut = 'en_cours' and now() >= v.debut_le
     and (now() >= v.fin_le or not exists (select 1 from joueurs where partie_id = p_partie and role = 'souris')) then
    update parties set statut = 'terminee', fin_le = least(fin_le, now()) where id = p_partie;
    delete from positions where partie_id = p_partie;
    perform enregistrer_resultats(p_partie);
    return 'terminee';
  end if;
  return v.statut;
end;
$$;

-- Selfies : espace privé, chacun dépose seulement le sien ; les joueurs connectés peuvent les voir
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
  on conflict (id) do nothing;

drop policy if exists "avatars : lecture" on storage.objects;
drop policy if exists "avatars : mon selfie (ajout)" on storage.objects;
drop policy if exists "avatars : mon selfie (remplacement)" on storage.objects;

create policy "avatars : lecture" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
create policy "avatars : mon selfie (ajout)" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');
create policy "avatars : mon selfie (remplacement)" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = auth.uid()::text || '.jpg');

-- Un joueur peut modifier son pseudo et son selfie, mais jamais son expérience
revoke insert, update on public.profils from authenticated;
grant insert (id, pseudo, avatar_url), update (pseudo, avatar_url) on public.profils to authenticated;
