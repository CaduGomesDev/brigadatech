import { createClient } from 'jsr:@supabase/supabase-js@2'

const DIAS_ANTECEDENCIA = 30

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || req.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'Não autorizado' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const hoje = new Date()
  hoje.setUTCHours(0, 0, 0, 0)
  const limite = new Date(hoje)
  limite.setUTCDate(limite.getUTCDate() + DIAS_ANTECEDENCIA)

  const { data: extintores, error: fetchError } = await supabase
    .from('extintores')
    .select('id, numero, localizacao, validade')
    .eq('alerta_vencimento_enviado', false)
    .neq('situacao', 'Vencido')
    .gte('validade', toDateStr(hoje))
    .lte('validade', toDateStr(limite))

  if (fetchError) {
    return json({ error: fetchError.message }, 500)
  }
  if (!extintores || extintores.length === 0) {
    return json({ success: true, notificados: 0 })
  }

  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

  for (const ext of extintores) {
    const validadeFmt = new Date(ext.validade + 'T00:00:00').toLocaleDateString('pt-BR')

    await supabase.from('notificacoes').insert({
      titulo: `Extintor nº ${ext.numero} próximo do vencimento`,
      mensagem: `O extintor **${ext.numero}** (${ext.localizacao}) vence em **${validadeFmt}**. Providencie a recarga.`,
      fixada: false,
      autor_id: null,
      autor_nome: 'Sistema',
      cargo_autor: 'Sistema',
    })

    if (botToken && chatId) {
      const text =
        `🧯 *Extintor próximo do vencimento*\n` +
        `Número: ${ext.numero}\n` +
        `Local: ${ext.localizacao}\n` +
        `Vence em: ${validadeFmt}`
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
      })
    }

    await supabase
      .from('extintores')
      .update({ alerta_vencimento_enviado: true })
      .eq('id', ext.id)
  }

  return json({ success: true, notificados: extintores.length })
})
