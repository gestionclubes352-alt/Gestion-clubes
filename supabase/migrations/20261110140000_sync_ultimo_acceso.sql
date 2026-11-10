-- Sincroniza usuarios.ultimo_acceso con auth.users.last_sign_in_at.
-- Antes la columna nunca se escribía, por lo que la tabla mostraba "Nunca".

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMPTZ;

-- Backfill con el último inicio de sesión conocido
UPDATE public.usuarios u
SET ultimo_acceso = a.last_sign_in_at
FROM auth.users a
WHERE a.id = u.id
  AND a.last_sign_in_at IS NOT NULL
  AND (u.ultimo_acceso IS NULL OR u.ultimo_acceso < a.last_sign_in_at);

CREATE OR REPLACE FUNCTION public.sync_ultimo_acceso()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL
     AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.usuarios
    SET ultimo_acceso = NEW.last_sign_in_at
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ultimo_acceso ON auth.users;
CREATE TRIGGER trg_sync_ultimo_acceso
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.sync_ultimo_acceso();
