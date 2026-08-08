-- Agregar columna nombre_en_fed a la tabla equipos
ALTER TABLE equipos ADD COLUMN nombre_en_fed VARCHAR(255);

-- Agregar comentario descriptivo
COMMENT ON COLUMN equipos.nombre_en_fed IS 'Nombre del equipo en la federación (ej: IPC LA ESCUELA)';
