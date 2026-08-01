-- =====================================================
-- Ficha completa de jugador: la pantalla EditPlayerModal ya
-- edita ~25 campos (scouting, estadísticas, identificación,
-- datos de tutor para menores) que no existían en
-- 004_multiclub_schema.sql. club/equipo/competición como texto
-- NO se guardan aquí: se derivan de `equipos` vía equipo_id.
-- =====================================================

-- El frontend permite perfil 'A' (Ambas) además de 'D'/'I'
ALTER TABLE plantillas DROP CONSTRAINT IF EXISTS plantillas_perfil_check;
ALTER TABLE plantillas ADD CONSTRAINT plantillas_perfil_check CHECK (perfil IN ('D', 'I', 'A'));

ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS apodo VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS estado VARCHAR(20) DEFAULT 'APTO' CHECK (estado IN ('APTO', 'LESIONADO', 'OTRO'));
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS otra_demarcacion VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS otra_posicion VARCHAR(255);

-- Scouting
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS descripcion TEXT;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS ataque TEXT;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS defensa TEXT;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS persona TEXT;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS rating_tecnica NUMERIC;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS rating_tactica NUMERIC;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS rating_condicional NUMERIC;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS rating_psicologico NUMERIC;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS rating_humano NUMERIC;

-- Estadísticas de partidos
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS partidos_jugados INTEGER DEFAULT 0;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS minutos INTEGER DEFAULT 0;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS titular INTEGER DEFAULT 0;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS goles INTEGER DEFAULT 0;

-- Identificación / contacto (dato sensible: DNI)
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS dni VARCHAR(20);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS telefono VARCHAR(50);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS correo VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS nombre_pila VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS primer_apellido VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS segundo_apellido VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS nombre_completo VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS anio_nacimiento INTEGER;

-- Ficha ampliada (Escuela Huesca / AppSheet)
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS etapa VARCHAR(50);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS enlace TEXT;
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS temporada VARCHAR(20);

-- Datos de tutor (jugadores menores de edad — dato sensible)
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS nombre_tutor VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS correo_tutor VARCHAR(255);
ALTER TABLE plantillas ADD COLUMN IF NOT EXISTS telefono_tutor VARCHAR(50);
