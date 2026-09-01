-- =====================================================
-- Fix: generar_token_comedor fallaba con
--   "function gen_random_bytes(integer) does not exist"
--
-- Causa: en Supabase la extensión pgcrypto se instala en el
-- schema `extensions`, pero la función tenía
-- `SET search_path = public, pg_temp`, que no lo incluye.
-- =====================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION generar_token_comedor(p_jugador_id UUID, p_club_id UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

REVOKE ALL ON FUNCTION generar_token_comedor(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION generar_token_comedor(UUID, UUID) TO authenticated;
