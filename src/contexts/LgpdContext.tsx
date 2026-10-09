import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { logAuditoria } from '../lib/audit'
import { useAuth } from './AuthContext'

export const VERSAO_TERMOS = '2.1.0'

interface LgpdContextType {
  termosAceitos: boolean
  loadingLgpd: boolean
  aceitarTermos: () => Promise<void>
}

const LgpdContext = createContext<LgpdContextType | undefined>(undefined)

export function LgpdProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [termosAceitos, setTermosAceitos] = useState(false)
  const [loadingLgpd, setLoadingLgpd] = useState(true)

  useEffect(() => {
    if (!user) {
      setTermosAceitos(false)
      setLoadingLgpd(false)
      return
    }
    setLoadingLgpd(true)
    supabase
      .from('aceites_termos')
      .select('id')
      .eq('user_id', user.id)
      .eq('versao_termos', VERSAO_TERMOS)
      .maybeSingle()
      .then(({ data }) => {
        setTermosAceitos(!!data)
        setLoadingLgpd(false)
      })
  }, [user])

  const aceitarTermos = useCallback(async () => {
    if (!user) return
    await supabase.from('aceites_termos').insert({
      user_id: user.id,
      versao_termos: VERSAO_TERMOS,
    })
    logAuditoria(user.id, 'aceite_termos', { versao: VERSAO_TERMOS })
    setTermosAceitos(true)
  }, [user])

  return (
    <LgpdContext.Provider value={{ termosAceitos, loadingLgpd, aceitarTermos }}>
      {children}
    </LgpdContext.Provider>
  )
}

export function useLgpd() {
  const ctx = useContext(LgpdContext)
  if (!ctx) throw new Error('useLgpd must be used within LgpdProvider')
  return ctx
}
