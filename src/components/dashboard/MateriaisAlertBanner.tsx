import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PackageX, AlertTriangle, Package, Wrench, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MaterialBrigada } from '../../types'

const DIAS_PADRAO = 30

function diasAte(dataStr: string): number {
  const alvo = new Date(dataStr + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

export function MateriaisAlertBanner() {
  const navigate = useNavigate()
  const [counts, setCounts] = useState({ vencidos: 0, proximos: 0, estoqueBaixo: 0, manutencao: 0 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      const [{ data: materiais }, { data: config }] = await Promise.all([
        supabase.from('materiais_brigada').select('quantidade_atual, estoque_minimo, tipo_item, data_validade, data_proxima_manutencao'),
        supabase.from('configuracoes_sistema').select('valor').eq('chave', 'dias_antecedencia_alertas').maybeSingle(),
      ])
      if (!active) return
      const dias = config?.valor ? Number(config.valor) : DIAS_PADRAO
      const list = (materiais ?? []) as Pick<MaterialBrigada, 'quantidade_atual' | 'estoque_minimo' | 'tipo_item' | 'data_validade' | 'data_proxima_manutencao'>[]

      let vencidos = 0, proximos = 0, estoqueBaixo = 0, manutencao = 0
      list.forEach(m => {
        if (m.data_validade) {
          const d = diasAte(m.data_validade)
          if (d < 0) vencidos++
          else if (d <= dias) proximos++
        }
        if (m.quantidade_atual <= m.estoque_minimo) estoqueBaixo++
        if (m.tipo_item === 'Equipamento' && m.data_proxima_manutencao && diasAte(m.data_proxima_manutencao) <= 0) manutencao++
      })
      setCounts({ vencidos, proximos, estoqueBaixo, manutencao })
      setLoaded(true)
    }
    load()
    return () => { active = false }
  }, [])

  const total = counts.vencidos + counts.proximos + counts.estoqueBaixo + counts.manutencao
  if (!loaded || total === 0) return null

  const items = [
    { key: 'vencidos',     value: counts.vencidos,     label: 'vencido(s)',             icon: <PackageX size={14} />,      color: 'text-red-400' },
    { key: 'proximos',     value: counts.proximos,     label: 'próximo(s) do vencimento', icon: <AlertTriangle size={14} />, color: 'text-orange-400' },
    { key: 'estoqueBaixo', value: counts.estoqueBaixo, label: 'com estoque baixo',        icon: <Package size={14} />,       color: 'text-yellow-400' },
    { key: 'manutencao',   value: counts.manutencao,   label: 'precisando de manutenção', icon: <Wrench size={14} />,        color: 'text-blue-400' },
  ].filter(i => i.value > 0)

  return (
    <button
      onClick={() => navigate('/materiais')}
      className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-brand-red/20 bg-brand-red/5 hover:bg-brand-red/10 px-4 py-3 transition-all duration-200 text-left"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        {items.map(i => (
          <span key={i.key} className={`flex items-center gap-1.5 text-sm font-semibold ${i.color}`}>
            {i.icon} {i.value} {i.label}
          </span>
        ))}
      </div>
      <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 flex-shrink-0">
        Ver Materiais e Equipamentos <ChevronRight size={14} />
      </span>
    </button>
  )
}
