-- La tabla partidos se recreó en 033_crear_tabla_partidos.sql sin políticas de
-- seguridad (RLS), a diferencia del resto de tablas del esquema, lo que bloquea
-- silenciosamente las escrituras desde el cliente (Supabase deniega por defecto
-- sin políticas). Mismo problema ya visto y corregido en 038 para competicion_equipos.

ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partidos: leer si autenticado" ON partidos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "partidos: escribir si autenticado" ON partidos
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
