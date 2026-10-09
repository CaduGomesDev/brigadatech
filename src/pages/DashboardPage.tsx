import { useEffect, useState } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { DashboardStats, SITUACOES_ROTINA } from '../types'
import { Layout } from '../components/layout/Layout'
import { DashboardCards } from '../components/dashboard/DashboardCards'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { useAuth } from '../contexts/AuthContext'
import { formatChartDate } from '../utils/formatters'

export interface LineDataPoint { date: string; operacional: number; rotina: number }
export interface BarDataPoint  { brigadista: string; atendimentos: number }
export interface PieDataPoint  { name: string; value: number }

interface RawRecord { situacao: string; brigadista: string; created_at: string }

const isRotina = (s: string) => (SITUACOES_ROTINA as readonly string[]).includes(s)

function topEntry(map: Map<string, number>): string {
  let top = '—'; let max = 0
  map.forEach((v, k) => { if (v > max) { max = v; top = k } })
  return top
}

export function DashboardPage() {
  const { profile, session } = useAuth()
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState<DashboardStats | null>(null)
  const [lineData, setLineData] = useState<LineDataPoint[]>([])
  const [barData, setBarData]   = useState<BarDataPoint[]>([])
  const [pieData, setPieData]   = useState<PieDataPoint[]>([])

  useEffect(() => {
    if (!session) { setLoading(false); return }

    const fetchAll = async () => {
      setLoading(true)
      try {
        const today         = new Date().toISOString().split('T')[0]
        const thirtyDaysAgo = subDays(new Date(), 29).toISOString()

        const [{ data: allRaw }, { data: recentRaw }] = await Promise.all([
          supabase.from('chamados_brigada').select('situacao, brigadista, created_at'),
          supabase.from('chamados_brigada')
            .select('situacao, created_at')
            .gte('created_at', thirtyDaysAgo),
        ])

        const all: RawRecord[] = (allRaw ?? []) as RawRecord[]
        const recent = (recentRaw ?? []) as Pick<RawRecord, 'situacao' | 'created_at'>[]

        const op  = all.filter(r => !isRotina(r.situacao))
        const rot = all.filter(r =>  isRotina(r.situacao))

        const brigMap = new Map<string, number>()
        op.forEach(r => brigMap.set(r.brigadista, (brigMap.get(r.brigadista) ?? 0) + 1))

        const sitMap = new Map<string, number>()
        op.forEach(r => sitMap.set(r.situacao, (sitMap.get(r.situacao) ?? 0) + 1))

        setStats({
          total:                  all.length,
          hoje:                   all.filter(r => r.created_at.startsWith(today)).length,
          totalOperacional:       op.length,
          totalRotina:            rot.length,
          hojeOperacional:        op.filter(r => r.created_at.startsWith(today)).length,
          topBrigadista:          topEntry(brigMap),
          situacaoMaisRecorrente: topEntry(sitMap),
        })

        // ── Line chart — two series per day ──
        const opMap  = new Map<string, number>()
        const rotMap = new Map<string, number>()
        recent.forEach(r => {
          const day = r.created_at.split('T')[0]
          if (isRotina(r.situacao)) rotMap.set(day, (rotMap.get(day) ?? 0) + 1)
          else                       opMap.set(day,  (opMap.get(day)  ?? 0) + 1)
        })
        setLineData(
          Array.from({ length: 30 }, (_, i) => {
            const day     = subDays(new Date(), 29 - i)
            const dateStr = format(day, 'yyyy-MM-dd')
            return {
              date:        formatChartDate(dateStr + 'T00:00:00'),
              operacional: opMap.get(dateStr)  ?? 0,
              rotina:      rotMap.get(dateStr) ?? 0,
            }
          })
        )

        // ── Bar chart — top 10 brigadistas (operational only) ──
        setBarData(
          [...brigMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([brigadista, atendimentos]) => ({ brigadista, atendimentos }))
        )

        // ── Pie chart — by situação (operational only) ──
        setPieData(
          [...sitMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([name, value]) => ({ name, value }))
        )
      } catch {
        // mantém estado vazio; cards exibem 0
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [session])

  return (
    <Layout title="Dashboard Analítico">
      <div className="space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            Olá, {profile?.nome?.split(' ')[0] || 'Brigadista'} 👋
          </h2>
          <p className="text-gray-500 text-xs md:text-sm mt-1 capitalize">
            {format(new Date(), "EEEE', 'dd/MM/yyyy", { locale: ptBR })}
          </p>
        </div>

        <DashboardCards stats={stats} loading={loading} />
        <DashboardCharts
          lineData={lineData}
          barData={barData}
          pieData={pieData}
          loading={loading}
        />
      </div>
    </Layout>
  )
}
