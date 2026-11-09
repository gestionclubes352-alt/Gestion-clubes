-- =====================================================
-- Encuadre de la foto del jugador (zoom y posición).
-- Por defecto (zoom 1, x 50, y 20) reproduce el encuadre anterior de la app.
-- Idempotente.
-- =====================================================

ALTER TABLE plantillas
  ADD COLUMN IF NOT EXISTS foto_zoom numeric(4,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS foto_pos_x numeric(5,2) NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS foto_pos_y numeric(5,2) NOT NULL DEFAULT 20;

ALTER TABLE plantillas DROP CONSTRAINT IF EXISTS plantillas_foto_zoom_check;
ALTER TABLE plantillas ADD CONSTRAINT plantillas_foto_zoom_check CHECK (foto_zoom BETWEEN 1 AND 3);

ALTER TABLE plantillas DROP CONSTRAINT IF EXISTS plantillas_foto_pos_x_check;
ALTER TABLE plantillas ADD CONSTRAINT plantillas_foto_pos_x_check CHECK (foto_pos_x BETWEEN 0 AND 100);

ALTER TABLE plantillas DROP CONSTRAINT IF EXISTS plantillas_foto_pos_y_check;
ALTER TABLE plantillas ADD CONSTRAINT plantillas_foto_pos_y_check CHECK (foto_pos_y BETWEEN 0 AND 100);
