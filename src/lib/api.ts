import { supabase } from './supabase'

export async function createUser(
  email: string,
  password: string
): Promise<{ user: { id: string; email: string } | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) return { user: null, error: error.message }
  if (!data.user) return { user: null, error: 'Usuário não foi criado' }

  return {
    user: { id: data.user.id, email: data.user.email ?? email },
    error: null,
  }
}
