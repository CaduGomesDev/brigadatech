import React from 'react'
import { ClipboardList, Calendar, User, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { DashboardStats } from '../../types'
import { SkeletonCard } from '../ui/Skeleton'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  trendValue?: string
  accent?: boolean
  compact?: boolean
}

function StatsCard({ title, value, subtitle, icon, trend, trendValue, accent, compact }: StatsCardProps) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  const trendColor = trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-500'

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.06)] bg-brand-gray-900 p-4 md:p-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`
          w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
          ${accent
            ? 'bg-brand-red/15 border border-brand-red/25'
            : 'bg-brand-gray-700 border border-brand-gray-600'
          }
        `}>
          <span className={accent ? 'text-brand-red' : 'text-brand-gray-300'}>{icon}</span>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <TrendIcon size={12} />
            {trendValue}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-brand-gray-400 uppercase tracking-wider">{title}</p>
        <p className={`font-black mt-1 leading-tight ${compact ? 'text-base md:text-lg' : 'text-2xl md:text-3xl'} ${accent ? 'text-brand-red' : 'text-white'}`}>{value}</p>
        {subtitle && <p className="text-xs text-brand-gray-400 mt-1 truncate">{subtitle}</p>}
      </div>
    </div>
  )
}

interface DashboardCardsProps {
  stats: DashboardStats | null
  loading: boolean
}

export function DashboardCards({ stats, loading }: DashboardCardsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="h-10 rounded-2xl animate-pulse bg-brand-gray-800" />
      </div>
    )
  }

  const total  = stats?.total             ?? 0
  const totOp  = stats?.totalOperacional  ?? 0
  const totRot = stats?.totalRotina       ?? 0
  const pctOp  = total > 0 ? Math.round((totOp  / total) * 100) : 0
  const pctRot = total > 0 ? Math.round((totRot / total) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Atendimentos Operacionais"
          value={totOp}
          subtitle="Excluindo registros de rotina"
          icon={<ClipboardList size={20} />}
          accent
        />
        <StatsCard
          title="Hoje (Operacional)"
          value={stats?.hojeOperacional ?? 0}
          subtitle="Ocorrências operacionais no dia"
          icon={<Calendar size={20} />}
          trend={stats?.hojeOperacional ? 'up' : 'neutral'}
          trendValue={stats?.hojeOperacional ? `+${stats.hojeOperacional} hoje` : undefined}
        />
        <StatsCard
          title="Top Brigadista"
          value={stats?.topBrigadista?.split(' ')[0] ?? '—'}
          subtitle={stats?.topBrigadista ?? 'Sem dados suficientes'}
          icon={<User size={20} />}
        />
        <StatsCard
          title="Ocorrência Frequente"
          value={stats?.situacaoMaisRecorrente ?? '—'}
          subtitle="Situação mais recorrente"
          icon={<AlertTriangle size={20} />}
          compact
        />
      </div>

      {/* Comparative strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-2.5 rounded-2xl bg-brand-gray-900 border border-[rgba(255,255,255,0.06)] text-xs">
        <span className="text-gray-500 font-semibold uppercase tracking-wider shrink-0">Totais:</span>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Geral</span>
          <span className="text-white font-bold">{total}</span>
        </div>
        <span className="text-brand-gray-700 hidden sm:block">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-brand-red shrink-0" />
          <span className="text-gray-400">Operacional</span>
          <span className="text-brand-red font-bold">{totOp}</span>
          <span className="text-gray-600">({pctOp}%)</span>
        </div>
        <span className="text-brand-gray-700 hidden sm:block">·</span>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-500 shrink-0" />
          <span className="text-gray-400">Rotina</span>
          <span className="text-gray-300 font-bold">{totRot}</span>
          <span className="text-gray-600">({pctRot}%)</span>
        </div>
        <span className="ml-auto text-gray-600 italic hidden md:block">
          Métricas acima excluem registros de rotina
        </span>
      </div>
    </div>
  )
}
