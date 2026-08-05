// Edge Function: get-youtube-upload-token
// Devuelve un access_token de la YouTube Data API v3 para subir vídeos al
// canal del club desde el frontend.
//
// El frontend nunca ve las credenciales OAuth del canal: esta función corre
// en el servidor, comprueba que quien llama tiene una sesión válida de
// Supabase y solo entonces canjea el refresh_token guardado como secreto
// (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN) por un
// access_token de corta duración de Google.
//
// Los secretos se configuran una sola vez con:
//   supabase secrets set GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... YOUTUBE_REFRESH_TOKEN=...
// (el refresh_token se obtiene autorizando una vez la app OAuth con el scope
// https://www.googleapis.com/auth/youtube.upload contra el canal del club).

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

  // Cliente "como quien llama": solo confirma que la sesión es válida.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) {
    return json({ error: 'Sesión inválida.' }, 401);
  }

  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const refreshToken = Deno.env.get('YOUTUBE_REFRESH_TOKEN');

  if (!clientId || !clientSecret || !refreshToken) {
    return json({
      error: 'Faltan credenciales de YouTube en el servidor. Configura GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET y YOUTUBE_REFRESH_TOKEN con `supabase secrets set`.',
    }, 500);
  }

  let tokenResponse: Response;
  try {
    tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
  } catch {
    return json({ error: 'No se pudo conectar con Google para renovar el token de YouTube.' }, 502);
  }

  if (!tokenResponse.ok) {
    const detail = await tokenResponse.text().catch(() => '');
    return json({ error: `Google rechazó la renovación del token de YouTube: ${detail}` }, 502);
  }

  const tokenData = await tokenResponse.json();
  if (!tokenData?.access_token) {
    return json({ error: 'Google no devolvió un access_token.' }, 502);
  }

  return json({ accessToken: tokenData.access_token }, 200);
});
