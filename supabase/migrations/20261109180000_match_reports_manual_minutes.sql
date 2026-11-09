-- Minutos jugados introducidos a mano (actas de alevines no incluyen minutos): { "<playerId>": minutos }
ALTER TABLE match_reports ADD COLUMN IF NOT EXISTS manual_minutes JSONB DEFAULT '{}'::jsonb;
