import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { logAuditoria } from '../lib/audit'
import { Profile } from '../types'

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Busca o perfil pelo UUID do auth user. Se não existir, cria automaticamente.
  // Usa maybeSingle() para não lançar erro quando a linha não é encontrada.
  const fetchProfile = async (authUser: User) => {
    if (!authUser?.id || !authUser?.email) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) {
        console.error('[auth] Erro ao buscar perfil:', error.message)
        return
      }

      if (data) {
        setProfile(data as Profile)
        return
      }

      // Perfil inexistente — cria automaticamente para o usuário autenticado.
      // Isso cobre usuários criados antes do trigger on_auth_user_created existir.
      const nome =
        (authUser.user_metadata?.nome as string | undefined) ??
        authUser.email.split('@')[0]

      const { data: created, error: createError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: authUser.id,
            nome,
            email: authUser.email,
            cargo: 'Gerente',
            role: 'user',
          },
          { onConflict: 'id' }
        )
        .select()
        .single()

      if (createError) {
        console.error('[auth] Erro ao criar perfil:', createError.message)
      } else if (created) {
        setProfile(created as Profile)
      }
    } catch {
      console.error('[auth] Erro inesperado ao buscar/criar perfil')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    if (data.user) logAuditoria(data.user.id, 'login')
    return { error: null }
  }

  const signOut = async () => {
    if (user) logAuditoria(user.id, 'logout')
    await supabase.auth.signOut()
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
