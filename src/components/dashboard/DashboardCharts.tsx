import React from 'react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Users, PieChart as PieIcon } from 'lucide-react'
import { Card, CardHeader } from '../ui/Card'
import { Skeleton } from '../ui/Skeleton'
import type { LineDataPoint, BarDataPoint, PieDataPoint } from '../../pages/DashboardPage'

interface DashboardChartsProps {
  lineData: LineDataPoint[]
  barData: BarDataPoint[]
  pieData: PieDataPoint[]
  loading: boolean
}

const PIE_COLORS = [
  '#C40018', '#E8001F', '#FF4444', '#FF7777', '#FFAAAA',
  '#9B0013', '#6B0000', '#FF2200', '#CC1111', '#AA0000',
  '#880000', '#660000', '#440000',
]

/* ─── Tooltip compartilhado (dark / red) ─── */
const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean
  payload?: { color: string; name: string; value: number }[]
  label?: string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-xl p-3 pointer-events-none"
      style={{
        background: '#0A0A0A',
        border: '1px solid rgba(196,0,24,0.45)',
        boxShadow: '0 0 24px rgba(196,0,24,0.15)',
        minWidth: '148px',
      }}
    >
      {label && (
        <p
          className="text-[11px] font-medium text-gray-400 mb-2 pb-1.5"
          style={{ borderBottom: '1px solid #242424' }}
        >
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: p.color }}>{p.name}</span>
          <span className="text-sm font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

const SKELETON_HEIGHTS = [45, 70, 35, 85, 55, 65, 40]

const ChartSkeleton = () => (
  <div className="h-64 flex items-end gap-2 px-4">
    {SKELETON_HEIGHTS.map((h, i) => (
      <div key={i} className="flex-1 animate-pulse">
        <Skeleton
          className="w-full rounded-t-md"
          style={{ height: `${h}%` } as React.CSSProperties}
        />
      </div>
    ))}
  </div>
)

export function DashboardCharts({ lineData, barData, pieData, loading }: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

      {/* ── Line Chart — Operacional vs Rotina ── */}
      <Card className="xl:col-span-2" padding="md">
        <CardHeader
          title="Atendimentos por Dia"
          subtitle="Últimos 30 dias — operacional vs rotina"
          icon={<TrendingUp size={18} />}
        />
        {loading ? <ChartSkeleton /> : (
          <>
            <div className="flex items-center gap-4 mb-3 px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-brand-red" />
                <span className="text-[11px] text-gray-500">Operacional</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded-sm bg-gray-600" />
                <span className="text-[11px] text-gray-500">Rotina</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#242424" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6B6B6B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={Math.ceil(lineData.length / 7) - 1}
                />
                <YAxis
                  tick={{ fill: '#6B6B6B', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: '#C40018', strokeWidth: 1, strokeDasharray: '4 3', strokeOpacity: 0.35 }}
                />
                <Line
                  type="monotone"
                  dataKey="operacional"
                  name="Operacional"
                  stroke="#C40018"
                  strokeWidth={2.5}
                  dot={{ fill: '#C40018', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#E8001F', stroke: 'rgba(196,0,24,0.35)', strokeWidth: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="rotina"
                  name="Rotina"
                  stroke="#4B5563"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  dot={{ fill: '#4B5563', r: 2, strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: '#6B7280', stroke: 'rgba(75,85,99,0.3)', strokeWidth: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      {/* ── Pie Chart — Operacional apenas ── */}
      <Card padding="md">
        <CardHeader
          title="Por Situação"
          subtitle="Ocorrências operacionais"
          icon={<PieIcon size={18} />}
        />
        {loading ? <ChartSkeleton /> : pieData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
            Sem dados disponíveis
          </div>
        ) : (
          <div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5 max-h-32 overflow-y-auto pr-1">
              {pieData.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-xs text-gray-400 truncate">{item.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-white flex-shrink-0">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── Bar Chart — Operacional apenas ── */}
      <Card className="xl:col-span-3" padding="md">
        <CardHeader
          title="Atendimentos por Brigadista"
          subtitle="Ocorrências operacionais por membro da equipe"
          icon={<Users size={18} />}
        />
        {loading ? <ChartSkeleton /> : barData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-600 text-sm">
            Sem dados disponíveis
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#242424" horizontal vertical={false} />
              <XAxis
                dataKey="brigadista"
                tick={{ fill: '#6B6B6B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: '#6B6B6B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(196,0,24,0.07)' }}
              />
              <Bar
                dataKey="atendimentos"
                name="Atendimentos"
                fill="#C40018"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
                /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                activeBar={{ fill: '#E8001F', radius: [6, 6, 0, 0] } as any}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

    </div>
  )
}
