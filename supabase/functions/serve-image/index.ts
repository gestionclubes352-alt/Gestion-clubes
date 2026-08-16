import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const bucket = url.searchParams.get('bucket') || 'club-media'
    const path = url.searchParams.get('path')

    if (!path) {
      return new Response(
        JSON.stringify({ error: 'path parameter required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Descargar el archivo de Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      return new Response(
        JSON.stringify({ error: `Failed to download: ${error.message}` }),
        { status: 404, headers: corsHeaders }
      )
    }

    // Detectar tipo MIME por extensión
    const ext = path.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream'

    const arrayBuffer = await data.arrayBuffer()

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Error in serve-image:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
