-- =====================================================
-- Permite asociar una Pizarra Táctica a una sección concreta
-- del Plan de Partido (ataque / defensa / transiciones) de un
-- partido, para poder listarlas desde MatchReportView.
-- =====================================================

-- La columna partido_id se declaraba en la migración 005 pero nunca llegó a
-- existir realmente en la tabla real (ver 080_fix_pizarras_partido_id_fkey.sql):
-- se crea aquí como TEXT sin FK, igual que match_reports.id, para guardar el
-- id del evento de calendario.
ALTER TABLE pizarras_tacticas
    ADD COLUMN IF NOT EXISTS partido_id TEXT;

ALTER TABLE pizarras_tacticas
    ADD COLUMN IF NOT EXISTS seccion VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_pizarras_partido_seccion ON pizarras_tacticas(partido_id, seccion);
