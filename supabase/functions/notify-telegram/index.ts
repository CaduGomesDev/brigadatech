import { createClient } from 'jsr:@supabase/supabase-js@2'

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

function buildMessage(
  type: 'chamado' | 'ginastica',
  brigadista: string,
  dataHora: string,
  setores?: string[],
): string {
  if (type === 'ginastica') {
    const setoresTexto = setores && setores.length > 0 ? setores.join(', ') : '—'
    return (
      `🤸 *Ginástica Laboral concluída*\n` +
      `Brigadista: ${brigadista}\n` +
      `Setores: ${setoresTexto}\n` +
      `Data/Hora: ${dataHora}`
    )
  }
  return (
    `🚨 *Novo chamado da Brigada*\n` +
    `Brigadista: ${brigadista}\n` +
    `Data/Hora: ${dataHora}`
  )
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

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: userError } = await callerClient.auth.getUser()
  if (userError || !user) {
    return json({ error: 'Não autenticado' }, 401)
  }

  let body: { type?: string; brigadista?: string; dataHora?: string; setores?: string[] }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Corpo da requisição inválido' }, 400)
  }

  const { type, brigadista, dataHora, setores } = body
  if ((type !== 'chamado' && type !== 'ginastica') || !brigadista || !dataHora) {
    return json({ error: 'Parâmetros inválidos' }, 400)
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')
  if (!botToken || !chatId) {
    return json({ error: 'Telegram não configurado' }, 500)
  }

  const text = buildMessage(type, brigadista, dataHora, setores)

  const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })

  if (!telegramRes.ok) {
    const errText = await telegramRes.text()
    return json({ error: `Falha ao enviar para o Telegram: ${errText}` }, 502)
  }

  return json({ success: true })
})
