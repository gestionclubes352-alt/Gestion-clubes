-- Rellena retroactivamente el autor (createdBy) de las tareas del repositorio
-- que no tienen ese dato guardado (creadas antes de que existiera el campo).
-- Se asignan al usuario identificado por email, tomando su nombre de la tabla usuarios.

DO $$
DECLARE
  v_nombre TEXT;
BEGIN
  SELECT nombre INTO v_nombre
  FROM usuarios
  WHERE email = 'ilandaleioa@gmail.com'
  LIMIT 1;

  IF v_nombre IS NULL THEN
    RAISE EXCEPTION 'No se encontró usuario con ese email en la tabla usuarios';
  END IF;

  UPDATE task_templates
  SET payload = jsonb_set(payload, '{createdBy}', to_jsonb(v_nombre), true)
  WHERE payload->>'createdBy' IS NULL OR payload->>'createdBy' = '';
END $$;
