-- Crear tabla partidos
CREATE TABLE IF NOT EXISTS partidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competition VARCHAR(255) NOT NULL,
  date TIMESTAMP NOT NULL,
  opponent VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('Finished', 'Upcoming')),
  score VARCHAR(50),
  jornada VARCHAR(50),
  local_team VARCHAR(255),
  visitor_team VARCHAR(255),
  local_team_club_id VARCHAR(255),
  visitor_team_club_id VARCHAR(255),
  time VARCHAR(50),
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX idx_partidos_competition ON partidos(competition);
CREATE INDEX idx_partidos_date ON partidos(date);
CREATE INDEX idx_partidos_status ON partidos(status);
