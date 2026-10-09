import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useBrigadistas() {
  const [brigadistas, setBrigadistas] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('brigadistas')
      .select('nome')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => {
        setBrigadistas((data ?? []).map(b => b.nome as string))
        setLoading(false)
      })
  }, [])

  return { brigadistas, loading }
}
