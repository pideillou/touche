-- =====================================================================
-- Touché, étape 2 : captures, sortie de zone et fin de partie
-- Déjà inclus à la fin de schema.sql. Ce fichier sert seulement si tu as
-- exécuté schema.sql avant cette étape : colle-le dans SQL Editor, puis Run.
-- =====================================================================

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
