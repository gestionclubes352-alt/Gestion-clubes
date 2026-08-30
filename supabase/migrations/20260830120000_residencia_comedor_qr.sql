-- =====================================================
-- Residencia · Control de acceso al comedor por QR
--
-- Modelo de seguridad:
--   · El jugador ficha desde su móvil abriendo una URL personal con token.
--   · `anon` NO tiene permisos sobre ninguna tabla de este módulo:
--     el único punto de entrada público son las funciones SECURITY DEFINER
--     `consultar_comedor` y `registrar_acceso_comedor`, que validan el
--     token, calculan el turno por hora en servidor y bloquean duplicados.
--   · Así un atacante con el anon key (público, va en el bundle JS) NO
--     puede: enumerar jugadores, enumerar tokens, listar quién ha comido,
--     ni fichar por otro.
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Tokens personales ────────────────────────────────────────────────
-- Tabla dedicada (NO columna en `plantillas`): `plantillas` guarda DNI,
-- teléfono y datos del tutor, y se lee con SELECT * desde el frontend;
-- un secreto ahí acabaría en el bundle de cualquier usuario autenticado.
CREATE TABLE IF NOT EXISTS residencia_comedor_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id     UUID REFERENCES clubes(id) ON DELETE CASCADE,
    jugador_id  UUID NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
    token       TEXT NOT NULL UNIQUE,
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    revocado_en TIMESTAMPTZ,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_comedor_token_jugador_activo
    ON residencia_comedor_tokens(jugador_id) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_comedor_tokens_club
    ON residencia_comedor_tokens(club_id);

-- ── 2. Accesos (fichajes) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS residencia_comedor_accesos (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id       UUID REFERENCES clubes(id) ON DELETE CASCADE,
    jugador_id    UUID NOT NULL REFERENCES plantillas(id) ON DELETE CASCADE,
    comida_id     UUID REFERENCES residencia_comidas(id) ON DELETE SET NULL,
    fecha         DATE NOT NULL,
    turno         VARCHAR(50) NOT NULL,
    registrado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    origen        VARCHAR(20) NOT NULL DEFAULT 'qr',
    notas         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_comedor_accesos_turno
        CHECK (turno IN ('Desayuno', 'Comida', 'Merienda', 'Cena')),
    CONSTRAINT chk_comedor_accesos_origen
        CHECK (origen IN ('qr', 'manual')),
    -- Bloqueo de duplicados garantizado en BD, no solo en cliente.
    CONSTRAINT uq_comedor_acceso_jugador_fecha_turno
        UNIQUE (jugador_id, fecha, turno)
);

CREATE INDEX IF NOT EXISTS idx_comedor_accesos_club_fecha
    ON residencia_comedor_accesos(club_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_comedor_accesos_fecha_turno
    ON residencia_comedor_accesos(fecha, turno);
CREATE INDEX IF NOT EXISTS idx_comedor_accesos_jugador
    ON residencia_comedor_accesos(jugador_id);

-- Triggers updated_at (misma función que el resto del módulo residencia).
DROP TRIGGER IF EXISTS trg_residencia_comedor_tokens_updated_at ON residencia_comedor_tokens;
CREATE TRIGGER trg_residencia_comedor_tokens_updated_at
    BEFORE UPDATE ON residencia_comedor_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_residencia_comedor_accesos_updated_at ON residencia_comedor_accesos;
CREATE TRIGGER trg_residencia_comedor_accesos_updated_at
    BEFORE UPDATE ON residencia_comedor_accesos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── 3. RLS ──────────────────────────────────────────────────────────────
ALTER TABLE residencia_comedor_tokens  ENABLE ROW LEVEL SECURITY;
ALTER TABLE residencia_comedor_accesos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comedor_tokens: leer si autenticado" ON residencia_comedor_tokens;
CREATE POLICY "comedor_tokens: leer si autenticado" ON residencia_comedor_tokens
    FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "comedor_tokens: escribir si autenticado" ON residencia_comedor_tokens;
CREATE POLICY "comedor_tokens: escribir si autenticado" ON residencia_comedor_tokens
    FOR ALL TO authenticated
    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "comedor_accesos: leer si autenticado" ON residencia_comedor_accesos;
CREATE POLICY "comedor_accesos: leer si autenticado" ON residencia_comedor_accesos
    FOR SELECT TO authenticated USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "comedor_accesos: escribir si autenticado" ON residencia_comedor_accesos;
CREATE POLICY "comedor_accesos: escribir si autenticado" ON residencia_comedor_accesos
    FOR ALL TO authenticated
    USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- `anon`: CERO acceso directo. Sin políticas + REVOKE explícito.
REVOKE ALL ON residencia_comedor_tokens  FROM anon;
REVOKE ALL ON residencia_comedor_accesos FROM anon;

-- ── 4. Cálculo del turno por hora ───────────────────────────────────────
-- Franjas (hora local Europe/Madrid):
--   06:00–10:29  Desayuno
--   12:30–16:29  Comida
--   16:30–19:29  Merienda
--   20:00–23:59  Cena
-- Fuera de franja → NULL (el fichaje se rechaza con mensaje claro).
CREATE OR REPLACE FUNCTION turno_comedor_por_hora(p_momento TIMESTAMPTZ)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_min INTEGER;
BEGIN
    v_min := EXTRACT(HOUR   FROM (p_momento AT TIME ZONE 'Europe/Madrid'))::INT * 60
           + EXTRACT(MINUTE FROM (p_momento AT TIME ZONE 'Europe/Madrid'))::INT;

    IF v_min BETWEEN 360 AND 629 THEN RETURN 'Desayuno';
    ELSIF v_min BETWEEN 750 AND 989 THEN RETURN 'Comida';
    ELSIF v_min BETWEEN 990 AND 1169 THEN RETURN 'Merienda';
    ELSIF v_min >= 1200 THEN RETURN 'Cena';
    ELSE RETURN NULL;
    END IF;
END;
$$;

-- ── 5. Resolver token → datos mínimos del jugador (landing) ─────────────
-- Devuelve SOLO el nombre visible del jugador dueño del token y el estado
-- del turno actual. No expone id, ni equipo, ni ningún otro dato.
CREATE OR REPLACE FUNCTION consultar_comedor(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_jugador   RECORD;
    v_ahora     TIMESTAMPTZ := NOW();
    v_fecha     DATE := (v_ahora AT TIME ZONE 'Europe/Madrid')::DATE;
    v_turno     VARCHAR(50);
    v_existente RECORD;
BEGIN
    IF p_token IS NULL OR length(p_token) < 20 THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'token_invalido');
    END IF;

    SELECT t.jugador_id,
           COALESCE(NULLIF(TRIM(COALESCE(p.nombre_pila,'') || ' ' || COALESCE(p.primer_apellido,'')), ''),
                    p.nombre) AS nombre_visible
      INTO v_jugador
      FROM residencia_comedor_tokens t
      JOIN plantillas p ON p.id = t.jugador_id
     WHERE t.token = p_token AND t.activo;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'token_invalido');
    END IF;

    v_turno := turno_comedor_por_hora(v_ahora);

    IF v_turno IS NOT NULL THEN
        SELECT a.registrado_en INTO v_existente
          FROM residencia_comedor_accesos a
         WHERE a.jugador_id = v_jugador.jugador_id
           AND a.fecha = v_fecha
           AND a.turno = v_turno;
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'nombre', v_jugador.nombre_visible,
        'turno', v_turno,
        'fecha', v_fecha,
        'ya_registrado', FOUND,
        'registrado_en', CASE WHEN FOUND
            THEN to_char(v_existente.registrado_en AT TIME ZONE 'Europe/Madrid', 'HH24:MI')
            ELSE NULL END
    );
END;
$$;

-- ── 6. Registrar el fichaje ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION registrar_acceso_comedor(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tok       RECORD;
    v_nombre    TEXT;
    v_ahora     TIMESTAMPTZ := NOW();
    v_fecha     DATE := (v_ahora AT TIME ZONE 'Europe/Madrid')::DATE;
    v_turno     VARCHAR(50);
    v_comida_id UUID;
    v_prev      TIMESTAMPTZ;
BEGIN
    IF p_token IS NULL OR length(p_token) < 20 THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'token_invalido');
    END IF;

    SELECT t.jugador_id, t.club_id,
           COALESCE(NULLIF(TRIM(COALESCE(p.nombre_pila,'') || ' ' || COALESCE(p.primer_apellido,'')), ''),
                    p.nombre) AS nombre_visible
      INTO v_tok
      FROM residencia_comedor_tokens t
      JOIN plantillas p ON p.id = t.jugador_id
     WHERE t.token = p_token AND t.activo;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'token_invalido');
    END IF;

    v_nombre := v_tok.nombre_visible;
    v_turno  := turno_comedor_por_hora(v_ahora);

    IF v_turno IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'motivo', 'fuera_de_horario',
                                  'nombre', v_nombre,
                                  'hora', to_char(v_ahora AT TIME ZONE 'Europe/Madrid', 'HH24:MI'));
    END IF;

    SELECT c.id INTO v_comida_id
      FROM residencia_comidas c
     WHERE c.fecha = v_fecha AND c.turno = v_turno
       AND (v_tok.club_id IS NULL OR c.club_id IS NOT DISTINCT FROM v_tok.club_id)
     LIMIT 1;

    BEGIN
        INSERT INTO residencia_comedor_accesos
            (club_id, jugador_id, comida_id, fecha, turno, registrado_en, origen)
        VALUES
            (v_tok.club_id, v_tok.jugador_id, v_comida_id, v_fecha, v_turno, v_ahora, 'qr');
    EXCEPTION WHEN unique_violation THEN
        SELECT a.registrado_en INTO v_prev
          FROM residencia_comedor_accesos a
         WHERE a.jugador_id = v_tok.jugador_id AND a.fecha = v_fecha AND a.turno = v_turno;
        RETURN jsonb_build_object('ok', false, 'motivo', 'duplicado',
                                  'nombre', v_nombre, 'turno', v_turno,
                                  'registrado_en', to_char(v_prev AT TIME ZONE 'Europe/Madrid', 'HH24:MI'));
    END;

    RETURN jsonb_build_object('ok', true, 'nombre', v_nombre, 'turno', v_turno,
                              'fecha', v_fecha,
                              'registrado_en', to_char(v_ahora AT TIME ZONE 'Europe/Madrid', 'HH24:MI'));
END;
$$;

-- ── 7. Generar/rotar token (solo staff autenticado) ─────────────────────
CREATE OR REPLACE FUNCTION generar_token_comedor(p_jugador_id UUID, p_club_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_token TEXT;
BEGIN
    IF auth.role() <> 'authenticated' THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    -- 32 bytes aleatorios → ~43 chars base64url. Espacio inenumerable.
    v_token := translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_');

    UPDATE residencia_comedor_tokens
       SET activo = FALSE, revocado_en = NOW()
     WHERE jugador_id = p_jugador_id AND activo;

    INSERT INTO residencia_comedor_tokens (club_id, jugador_id, token)
    VALUES (p_club_id, p_jugador_id, v_token);

    RETURN v_token;
END;
$$;

-- ── 8. Permisos de ejecución ────────────────────────────────────────────
REVOKE ALL ON FUNCTION registrar_acceso_comedor(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION consultar_comedor(TEXT)        FROM PUBLIC;
REVOKE ALL ON FUNCTION generar_token_comedor(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION registrar_acceso_comedor(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION consultar_comedor(TEXT)        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generar_token_comedor(UUID, UUID) TO authenticated;
