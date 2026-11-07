-- =====================================================
-- Elimina TODOS los partidos de la aplicación:
--   * eventos_calendario de tipo 'Partido' (calendario)
--   * match_reports (informes de partido) y sus share_tokens
--   * pizarras_tacticas ligadas a un partido (plan de partido)
--   * partidos (tabla de competiciones)
--
-- ATENCIÓN: irreversible. Haz copia de seguridad antes de ejecutar.
-- Se conservan equipos, plantillas, sesiones y el resto de eventos del
-- calendario (entrenamientos, sesiones, actividades...).
-- Cada paso comprueba que la tabla exista (el esquema real no siempre
-- coincide con las migraciones antiguas).
-- =====================================================

DO $$
BEGIN
    IF to_regclass('public.share_tokens') IS NOT NULL THEN
        DELETE FROM share_tokens
        WHERE match_report_id IN (SELECT id::text FROM match_reports);
    END IF;

    IF to_regclass('public.match_reports') IS NOT NULL THEN
        DELETE FROM match_reports;
    END IF;

    IF to_regclass('public.pizarras_tacticas') IS NOT NULL THEN
        DELETE FROM pizarras_tacticas WHERE partido_id IS NOT NULL;
    END IF;

    IF to_regclass('public.eventos_calendario') IS NOT NULL THEN
        DELETE FROM eventos_calendario WHERE type = 'Partido';
    END IF;

    IF to_regclass('public.partidos') IS NOT NULL THEN
        DELETE FROM partidos;
    END IF;
END $$;
