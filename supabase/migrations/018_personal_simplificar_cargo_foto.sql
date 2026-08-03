-- =====================================================
-- El formulario de Personal se simplificó para pedir solo
-- nombre, cargo, teléfono, DNI y foto (ver EditStaffModal.tsx
-- y App.tsx: personalService.create/update). Pero la tabla
-- `personal` (004_multiclub_schema.sql) todavía exige
-- `primer_apellido` y `rol` como NOT NULL y no tiene columna
-- `cargo`, así que cualquier alta o edición desde ese formulario
-- fallaba antes de poder guardar la foto.
--
-- Esta migración:
--   1) Añade la columna `cargo` que usa el formulario actual.
--   2) Migra los `rol` existentes a `cargo` para no perder datos.
--   3) Quita el NOT NULL de `primer_apellido` y `rol`, que el
--      formulario simplificado ya no rellena.
-- =====================================================

ALTER TABLE personal ADD COLUMN IF NOT EXISTS cargo VARCHAR(100);

UPDATE personal SET cargo = rol WHERE cargo IS NULL;

ALTER TABLE personal ALTER COLUMN primer_apellido DROP NOT NULL;
ALTER TABLE personal ALTER COLUMN rol DROP NOT NULL;

-- foto_url ya existe como TEXT DEFAULT '' (004_multiclub_schema.sql) y el
-- bucket público `club-media` con sus políticas ya cubre las subidas de
-- staffPhotoService.ts (013_storage_club_media.sql), así que no hace falta
-- tocar nada más para que las fotos del personal se guarden correctamente.
