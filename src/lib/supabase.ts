import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Variáveis de ambiente do Supabase não configuradas.\n' +
    'Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)

// Operações que exigem privilégio de service_role (ex: alterar cargo de outros
// usuários) rodam em Supabase Edge Functions — a chave nunca chega ao navegador.
// Ver: supabase/functions/update-user-cargo
