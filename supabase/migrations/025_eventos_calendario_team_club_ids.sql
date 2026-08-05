-- =====================================================
-- GESTION CLUBES — Club de cada equipo local/visitante en un partido
--
-- Hasta ahora `local_team`/`visitor_team` solo guardaban el NOMBRE del
-- equipo (p.ej. "Juvenil A"). Si dos clubes distintos tienen un equipo
-- con el mismo nombre, la app no podía distinguirlos: al mostrar el
-- partido, el club se re-adivinaba buscando por nombre entre TODOS los
-- clubes, y el propio club del usuario (que suele compartir esos
-- nombres genéricos) siempre "ganaba" el emparejamiento aunque el
-- equipo elegido fuera de otro club (p.ej. un rival).
--
-- Estas columnas guardan explícitamente el club de cada lado en el
-- momento de crear/editar el partido, para que la visualización no
-- tenga que volver a adivinarlo. Igual que `club_id`, se guardan como
-- texto libre (no FK) porque el frontend admite equipos "demo" con ids
-- no-UUID.
-- =====================================================

ALTER TABLE eventos_calendario
    ADD COLUMN IF NOT EXISTS local_team_club_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS visitor_team_club_id VARCHAR(255);
