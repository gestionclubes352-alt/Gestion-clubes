-- La tabla competicion_equipos se creó sin políticas de seguridad (RLS), a diferencia
-- del resto de tablas del esquema (competiciones, partidos, etc.), lo que puede bloquear
-- silenciosamente las escrituras desde el cliente (Supabase deniega por defecto sin políticas).

ALTER TABLE competicion_equipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "competicion_equipos: leer si autenticado" ON competicion_equipos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "competicion_equipos: escribir si autenticado" ON competicion_equipos
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
