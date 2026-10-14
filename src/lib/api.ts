import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export async function createUser(
  email: string,
  password: string
): Promise<{ user: { id: string; email: string } | null; error: string | null }> {
  // Cliente isolado, sem persistSession/autoRefreshToken: o signUp() do
  // supabase-js troca a sessão ativa do navegador para o usuário recém-criado
  // quando a confirmação de e-mail está desativada no projeto. Usando um
  // cliente à parte, a sessão do Coordenador que está criando a conta não é
  // afetada.
  const signupClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await signupClient.auth.signUp({ email, password })

  if (error) return { user: null, error: error.message }
  if (!data.user) return { user: null, error: 'Usuário não foi criado' }

  return {
    user: { id: data.user.id, email: data.user.email ?? email },
    error: null,
  }
}
