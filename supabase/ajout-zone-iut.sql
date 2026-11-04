-- À lancer seulement si tu as déjà exécuté schema.sql avant l'ajout de la zone IUT.
-- Supabase > SQL Editor > coller > Run.
-- Coordonnées : centre du campus de l'IUT du Limousin (© contributeurs OpenStreetMap)
insert into public.zones (ville, nom, description, latitude, longitude, rayon_m, ordre)
select 'Limoges', 'IUT du Limousin', 'Campus Maurois, allée André Maurois', 45.83565, 1.23105, 350, 3
where not exists (select 1 from public.zones where ville = 'Limoges' and nom = 'IUT du Limousin');
