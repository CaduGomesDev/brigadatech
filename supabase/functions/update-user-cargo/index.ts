import { createClient } from 'jsr:@supabase/supabase-js@2'

const CARGOS_VALIDOS = ['Coordenador', 'Supervisor', 'Gerente']

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing authorization' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SB_PUBLISHABLE_KEY')!
  const serviceKey = Deno.env.get('SB_SECRET_KEY')!

  // Client no contexto do usuário que chamou — usado só para validar identidade e permissão.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) {
    return json({ error: 'Não autenticado' }, 401)
  }

  const { data: callerProfile, error: profileError } = await callerClient
    .from('profiles')
    .select('cargo')
    .eq('id', user.id)
    .single()

  if (profileError || callerProfile?.cargo !== 'Coordenador') {
    return json({ error: 'Permissão negada: apenas Coordenador pode alterar cargos.' }, 403)
  }

  let body: { targetUserId?: string; newCargo?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400)
  }

  const { targetUserId, newCargo } = body
  if (!targetUserId || !newCargo || !CARGOS_VALIDOS.includes(newCargo)) {
    return json({ error: 'Parâmetros inválidos' }, 400)
  }

  if (targetUserId === user.id) {
    return json({ error: 'Não é possível alterar o próprio cargo' }, 400)
  }

  // Client com service_role — usado só aqui, dentro da function, nunca no navegador.
  const adminClient = createClient(supabaseUrl, serviceKey)
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ cargo: newCargo })
    .eq('id', targetUserId)

  if (updateError) {
    return json({ error: updateError.message }, 500)
  }

  return json({ success: true })
})
