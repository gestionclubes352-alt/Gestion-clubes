-- Enlace (URL) opcional de cada competición
ALTER TABLE competiciones ADD COLUMN IF NOT EXISTS url TEXT;
