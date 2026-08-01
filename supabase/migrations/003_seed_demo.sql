-- =====================================================
-- Datos de demostración FICTICIOS — club "DEMO"
-- Úsalo solo para probar la app en desarrollo.
-- =====================================================

INSERT INTO competition_teams (nombre, estadio, localidad) VALUES
('DEMO CF', 'Campo Municipal', 'Ciudad Demo'),
('Rival Deportivo', 'Estadio Rival', 'Villa Rival')
ON CONFLICT DO NOTHING;

INSERT INTO players (club, equipo, dorsal, nombre, posicion, posicion_juego, perfil, fecha_nacimiento) VALUES
('DEMO', 'DEMO', 1, 'Jugador Demo 1 (P)', 'Portero', 'Portero', 'D', '2003-01-10'),
('DEMO', 'DEMO', 4, 'Jugador Demo 2', 'Defensa', 'Central', 'D', '2002-05-14'),
('DEMO', 'DEMO', 6, 'Jugador Demo 3', 'Medio', 'Mediocentro', 'I', '2001-11-02'),
('DEMO', 'DEMO', 9, 'Jugador Demo 4', 'Delantero', 'Delantero centro', 'D', '2000-03-22')
ON CONFLICT DO NOTHING;

INSERT INTO staff (nombre, primer_apellido, rol, club, equipo) VALUES
('Entrenador', 'Demo', 'Primer Entrenador', 'DEMO', 'DEMO'),
('Analista', 'Demo', 'Analista Táctico', 'DEMO', 'DEMO')
ON CONFLICT DO NOTHING;

INSERT INTO events (id, title, type, date, time, club, team, status) VALUES
('evt-demo-1', 'Entrenamiento semanal', 'Entrenamiento', CURRENT_DATE + 2, '18:00', 'DEMO', 'DEMO', 'Upcoming'),
('evt-demo-2', 'Jornada 1 vs Rival Deportivo', 'Partido', CURRENT_DATE + 7, '17:00', 'DEMO', 'DEMO', 'Upcoming')
ON CONFLICT DO NOTHING;

-- Nota: el primer usuario que se registre vía Supabase Auth queda como
-- 'Pendiente' (ver trigger handle_new_user en 001_schema.sql).
-- Para convertirlo en Administrador manualmente, ejecuta en el SQL Editor:
--
-- UPDATE profiles SET rol = 'Administrador', estado = 'Activo', club = 'DEMO'
-- WHERE email = 'tu-email@ejemplo.com';
