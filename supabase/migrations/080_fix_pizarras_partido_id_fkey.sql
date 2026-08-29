-- =====================================================
-- La columna partido_id de pizarras_tacticas se usa con el id
-- del evento de calendario (mismo patron que match_reports.id),
-- no con el id de la tabla partidos. La FK original apuntaba a
-- partidos(id) y rompia el guardado desde el Plan de Partido con
-- un error de violacion de clave foranea (23503).
-- =====================================================

ALTER TABLE pizarras_tacticas
    DROP CONSTRAINT IF EXISTS pizarras_tacticas_partido_id_fkey;
