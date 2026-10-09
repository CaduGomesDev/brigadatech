import { supabase } from '../lib/supabase'

async function notifyViaTelegram(
  type: 'chamado' | 'ginastica',
  brigadista: string,
  dataHora: string,
  setores?: string[],
): Promise<void> {
  const { error } = await supabase.functions.invoke('notify-telegram', {
    body: { type, brigadista, dataHora, setores },
  })
  if (error) {
    console.error('[Telegram] Falha ao invocar Edge Function:', error.message)
  }
}

export async function enviarNotificacaoGinastica(
  brigadista: string,
  setores: string[],
  dataHora: string,
): Promise<void> {
  await notifyViaTelegram('ginastica', brigadista, dataHora, setores)
}

export async function enviarNotificacaoTelegram(
  brigadista: string,
  dataHora: string,
): Promise<void> {
  await notifyViaTelegram('chamado', brigadista, dataHora)
}
