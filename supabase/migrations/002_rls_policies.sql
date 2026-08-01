-- =====================================================
-- GESTION CLUBES — Row Level Security
-- Modelo: usuario autenticado + rol (profiles.rol) + club (profiles.club)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE campogramas ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE tactical_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Helper: rol y club del usuario autenticado actual
CREATE OR REPLACE FUNCTION current_user_rol() RETURNS TEXT AS $$
    SELECT rol FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_club() RETURNS TEXT AS $$
    SELECT club FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION current_user_estado() RETURNS TEXT AS $$
    SELECT estado FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE POLICY "profiles: ver el propio o si eres admin" ON profiles
    FOR SELECT USING (id = auth.uid() OR current_user_rol() = 'Administrador');

CREATE POLICY "profiles: actualizar el propio o si eres admin" ON profiles
    FOR UPDATE USING (id = auth.uid() OR current_user_rol() = 'Administrador');

CREATE POLICY "profiles: solo admin borra" ON profiles
    FOR DELETE USING (current_user_rol() = 'Administrador');

-- =====================================================
-- Plantilla genérica para tablas con columna "club"
-- Lectura: cualquier usuario Activo del mismo club (o admin ve todo)
-- Escritura: Administrador o Entrenador del mismo club
-- =====================================================

-- PLAYERS
CREATE POLICY "players: leer del propio club" ON players
    FOR SELECT USING (
        current_user_estado() = 'Activo'
        AND (current_user_rol() = 'Administrador' OR club = current_user_club())
    );
CREATE POLICY "players: escribir admin/entrenador" ON players
    FOR INSERT WITH CHECK (
        current_user_rol() IN ('Administrador','Entrenador') AND club = current_user_club()
    );
CREATE POLICY "players: modificar admin/entrenador" ON players
    FOR UPDATE USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );
CREATE POLICY "players: borrar admin/entrenador" ON players
    FOR DELETE USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );

-- STAFF (mismas reglas que players)
CREATE POLICY "staff: leer del propio club" ON staff
    FOR SELECT USING (
        current_user_estado() = 'Activo'
        AND (current_user_rol() = 'Administrador' OR club = current_user_club())
    );
CREATE POLICY "staff: escribir admin/entrenador" ON staff
    FOR INSERT WITH CHECK (
        current_user_rol() IN ('Administrador','Entrenador') AND club = current_user_club()
    );
CREATE POLICY "staff: modificar admin/entrenador" ON staff
    FOR UPDATE USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );
CREATE POLICY "staff: borrar admin/entrenador" ON staff
    FOR DELETE USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );

-- EVENTS
CREATE POLICY "events: leer del propio club" ON events
    FOR SELECT USING (
        current_user_estado() = 'Activo'
        AND (current_user_rol() = 'Administrador' OR club = current_user_club())
    );
CREATE POLICY "events: escribir admin/entrenador" ON events
    FOR INSERT WITH CHECK (
        current_user_rol() IN ('Administrador','Entrenador') AND club = current_user_club()
    );
CREATE POLICY "events: modificar admin/entrenador" ON events
    FOR UPDATE USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );
CREATE POLICY "events: borrar admin/entrenador" ON events
    FOR DELETE USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );

-- CAMPOGRAMAS
CREATE POLICY "campogramas: leer del propio club" ON campogramas
    FOR SELECT USING (
        current_user_estado() = 'Activo'
        AND (current_user_rol() = 'Administrador' OR club = current_user_club())
    );
CREATE POLICY "campogramas: escribir admin/entrenador" ON campogramas
    FOR ALL USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    ) WITH CHECK (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );

-- EXERCISES
CREATE POLICY "exercises: leer del propio club" ON exercises
    FOR SELECT USING (
        current_user_estado() = 'Activo'
        AND (current_user_rol() = 'Administrador' OR club = current_user_club())
    );
CREATE POLICY "exercises: escribir admin/entrenador" ON exercises
    FOR ALL USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    ) WITH CHECK (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );

-- TACTICAL_BOARDS
CREATE POLICY "tactical_boards: leer del propio club" ON tactical_boards
    FOR SELECT USING (
        current_user_estado() = 'Activo'
        AND (current_user_rol() = 'Administrador' OR club = current_user_club())
    );
CREATE POLICY "tactical_boards: escribir admin/entrenador" ON tactical_boards
    FOR ALL USING (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    ) WITH CHECK (
        current_user_rol() = 'Administrador' OR (current_user_rol() = 'Entrenador' AND club = current_user_club())
    );

-- MATCH_REPORTS (se relaciona vía events.club, así que dejamos lectura a cualquier
-- Activo y escritura a Administrador/Entrenador — ajustar si necesitas más granularidad)
CREATE POLICY "match_reports: leer si Activo" ON match_reports
    FOR SELECT USING (current_user_estado() = 'Activo');
CREATE POLICY "match_reports: escribir admin/entrenador" ON match_reports
    FOR ALL USING (current_user_rol() IN ('Administrador','Entrenador'))
    WITH CHECK (current_user_rol() IN ('Administrador','Entrenador'));

-- COMPETITION_TEAMS: catálogo general, lectura para cualquier Activo, escritura solo admin
CREATE POLICY "competition_teams: leer si Activo" ON competition_teams
    FOR SELECT USING (current_user_estado() = 'Activo');
CREATE POLICY "competition_teams: escribir solo admin" ON competition_teams
    FOR ALL USING (current_user_rol() = 'Administrador')
    WITH CHECK (current_user_rol() = 'Administrador');

-- ACTIVITY_LOG: solo lectura/escritura admin
CREATE POLICY "activity_log: solo admin" ON activity_log
    FOR ALL USING (current_user_rol() = 'Administrador')
    WITH CHECK (current_user_rol() = 'Administrador');
