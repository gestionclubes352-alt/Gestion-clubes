// Edge Function: create-user
// Alta de usuarios desde el panel de administración.
//
// Crear un usuario en `auth.users` requiere la service_role key, que nunca
// puede vivir en el frontend (saltaría RLS). Esta función corre en el
// servidor de Supabase: recibe el JWT de quien llama, comprueba que sea
// Administrador contra la tabla `usuarios` (respetando RLS) y solo entonces
// usa el cliente con service_role para crear la cuenta.

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'No autenticado.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Cliente "como quien llama": solo puede ver/hacer lo que su rol permita por RLS.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) {
    return json({ error: 'Sesión inválida.' }, 401);
  }

  const { data: callerPerfil, error: perfilError } = await callerClient
    .from('usuarios')
    .select('rol')
    .eq('id', caller.id)
    .single();

  if (perfilError || callerPerfil?.rol !== 'Administrador') {
    return json({ error: 'Solo un Administrador puede gestionar usuarios.' }, 403);
  }

  let body: { user_id?: string; email?: string; password?: string; nombre?: string; rol?: string; estado?: string; club_id?: string | null; jugador_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Cuerpo de la petición inválido.' }, 400);
  }

  // Único cliente con permiso para escribir en auth.users.
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Reseteo de contraseña de un usuario ya existente (no crea cuenta nueva).
  if (body.user_id) {
    if (!body.password) {
      return json({ error: 'La contraseña es obligatoria.' }, 400);
    }
    const { error: pwError } = await adminClient.auth.admin.updateUserById(body.user_id, {
      password: body.password,
    });
    if (pwError) {
      return json({ error: pwError.message }, 400);
    }
    return json({ id: body.user_id }, 200);
  }

  const { email, password, nombre, rol, estado, club_id, jugador_id } = body;
  if (!email || !password || !nombre) {
    return json({ error: 'Email, contraseña y nombre son obligatorios.' }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre },
  });

  if (createError || !created?.user) {
    return json({ error: createError?.message || 'No se pudo crear el usuario.' }, 400);
  }

  // El trigger `handle_new_user()` (001/004_multiclub_schema.sql) ya insertó
  // una fila en `usuarios` con valores por defecto (rol Tecnico, estado
  // Pendiente); la actualizamos con lo elegido en el formulario de alta.
  const { error: updateError } = await adminClient
    .from('usuarios')
    .update({
      nombre,
      rol: rol || 'Tecnico',
      estado: estado || 'Activo',
      club_id: club_id ?? null,
      jugador_id: jugador_id ?? null,
    })
    .eq('id', created.user.id);

  if (updateError) {
    return json({ error: updateError.message }, 400);
  }

  return json({ id: created.user.id }, 200);
});
