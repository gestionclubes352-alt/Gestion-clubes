-- =====================================================
-- Asegurar que las columnas heredadas de 'personal' que
-- el formulario simplificado no completa ahora sean opcionales.
-- El formulario actual solo envía: nombre, cargo, telefono, dni, email, equipo_ids, foto_url, club_id
-- =====================================================

-- Hacer opcional 'primer_apellido' (heredada de 004_multiclub_schema.sql)
ALTER TABLE personal ALTER COLUMN primer_apellido DROP NOT NULL;

-- Hacer opcional 'rol' (heredada, ahora reemplazada por 'cargo')
ALTER TABLE personal ALTER COLUMN rol DROP NOT NULL;

-- Asegurar que 'nombre' sigue siendo required (es lo mínimo que el formulario captura)
ALTER TABLE personal ALTER COLUMN nombre SET NOT NULL;

-- Agregar constraint de club_id si no existe (para aislamiento multi-club)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'personal' AND constraint_name = 'personal_club_id_not_null'
    ) THEN
        ALTER TABLE personal ALTER COLUMN club_id SET NOT NULL;
    END IF;
END $$;
