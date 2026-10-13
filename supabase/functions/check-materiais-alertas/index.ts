import { createClient } from 'jsr:@supabase/supabase-js@2'

const DIAS_PADRAO = 30

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

function diasAte(dataStr: string): number {
  const alvo = new Date(dataStr + 'T00:00:00')
  const hoje = new Date()
  hoje.setUTCHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

interface Material {
  id: string
  nome: string
  categoria: string
  tipo_item: string
  quantidade_atual: number
  unidade_medida: string
  estoque_minimo: number
  local_armazenamento: string
  data_validade: string | null
  data_proxima_manutencao: string | null
  alerta_vencimento_enviado: boolean
  alerta_manutencao_enviado: boolean
  alerta_estoque_enviado: boolean
}

async function sendTelegram(botToken: string, chatId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  })
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

  const { data: config } = await supabase
    .from('configuracoes_sistema')
    .select('valor')
    .eq('chave', 'dias_antecedencia_alertas')
    .maybeSingle()
  const diasAntecedencia = config?.valor ? Number(config.valor) : DIAS_PADRAO

  const { data, error: fetchError } = await supabase
    .from('materiais_brigada')
    .select('id, nome, categoria, tipo_item, quantidade_atual, unidade_medida, estoque_minimo, local_armazenamento, data_validade, data_proxima_manutencao, alerta_vencimento_enviado, alerta_manutencao_enviado, alerta_estoque_enviado')

  if (fetchError) {
    return json({ error: fetchError.message }, 500)
  }

  const materiais = (data ?? []) as Material[]
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

  let notificados = 0

  for (const m of materiais) {
    // ── Vencimento ──
    if (!m.alerta_vencimento_enviado && m.data_validade) {
      const dias = diasAte(m.data_validade)
      if (dias <= diasAntecedencia) {
        const status = dias < 0 ? 'VENCIDO' : `vence em ${dias} dia(s)`
        await supabase.from('notificacoes').insert({
          titulo: `${m.nome} — ${dias < 0 ? 'vencido' : 'próximo do vencimento'}`,
          mensagem: `O item **${m.nome}** (${m.categoria}, ${m.local_armazenamento}) está **${status}**.`,
          fixada: false,
          autor_id: null,
          autor_nome: 'Sistema',
          cargo_autor: 'Sistema',
        })
        if (botToken && chatId) {
          await sendTelegram(botToken, chatId,
            `🧴 *Material ${dias < 0 ? 'vencido' : 'próximo do vencimento'}*\n` +
            `Item: ${m.nome}\nCategoria: ${m.categoria}\nLocal: ${m.local_armazenamento}\nStatus: ${status}`)
        }
        await supabase.from('materiais_brigada').update({ alerta_vencimento_enviado: true }).eq('id', m.id)
        notificados++
      }
    }

    // ── Estoque baixo ──
    if (!m.alerta_estoque_enviado && m.quantidade_atual <= m.estoque_minimo) {
      await supabase.from('notificacoes').insert({
        titulo: `${m.nome} — estoque baixo`,
        mensagem: `O item **${m.nome}** está com estoque baixo: **${m.quantidade_atual} ${m.unidade_medida}** (mínimo: ${m.estoque_minimo} ${m.unidade_medida}).`,
        fixada: false,
        autor_id: null,
        autor_nome: 'Sistema',
        cargo_autor: 'Sistema',
      })
      if (botToken && chatId) {
        await sendTelegram(botToken, chatId,
          `📦 *Estoque baixo*\n` +
          `Item: ${m.nome}\nCategoria: ${m.categoria}\nQuantidade: ${m.quantidade_atual} ${m.unidade_medida} (mínimo: ${m.estoque_minimo})`)
      }
      await supabase.from('materiais_brigada').update({ alerta_estoque_enviado: true }).eq('id', m.id)
      notificados++
    }

    // ── Manutenção ──
    if (!m.alerta_manutencao_enviado && m.tipo_item === 'Equipamento' && m.data_proxima_manutencao) {
      const dias = diasAte(m.data_proxima_manutencao)
      if (dias <= 0) {
        await supabase.from('notificacoes').insert({
          titulo: `${m.nome} — necessita manutenção`,
          mensagem: `O equipamento **${m.nome}** (${m.local_armazenamento}) está com manutenção pendente desde ${m.data_proxima_manutencao}.`,
          fixada: false,
          autor_id: null,
          autor_nome: 'Sistema',
          cargo_autor: 'Sistema',
        })
        if (botToken && chatId) {
          await sendTelegram(botToken, chatId,
            `🔧 *Equipamento precisa de manutenção*\n` +
            `Item: ${m.nome}\nLocal: ${m.local_armazenamento}\nManutenção prevista: ${m.data_proxima_manutencao}`)
        }
        await supabase.from('materiais_brigada').update({ alerta_manutencao_enviado: true }).eq('id', m.id)
        notificados++
      }
    }
  }

  return json({ success: true, notificados })
})
