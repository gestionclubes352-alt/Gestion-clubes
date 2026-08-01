-- =====================================================
-- Campos que ya usa la pantalla "Equipos" del frontend
-- (CompetitionTable/EditTeamModal) y que no existían en
-- 004_multiclub_schema.sql: escudo, sub-equipo, estadio,
-- localidad y enlace a la federación.
-- =====================================================

ALTER TABLE equipos ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS sub_equipo VARCHAR(255);
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS estadio VARCHAR(255);
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS localidad VARCHAR(255);
ALTER TABLE equipos ADD COLUMN IF NOT EXISTS enlace TEXT;
