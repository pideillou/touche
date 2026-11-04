-- =====================================================================
-- Touché, étape 4 : comptes, selfie, niveau et historique
-- Déjà inclus à la fin de schema.sql. Ce fichier sert seulement si tu as
-- exécuté schema.sql avant cette étape : colle-le dans SQL Editor, puis Run.
-- =====================================================================

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
