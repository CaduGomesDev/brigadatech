import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  PlusCircle, LayoutDashboard,
  Users, Settings,
  X, Dumbbell, ShieldCheck, Flame, Bell, ClipboardList, Package,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { GlobalSearch } from './GlobalSearch'
import { useAuth } from '../../contexts/AuthContext'
import { hasCargoPermission } from '../../lib/permissions'
import { supabase } from '../../lib/supabase'
import { Cargo } from '../../types'

interface NavItem {
  to: string
  icon: React.ReactNode
  label: string
  badge?: number
  minCargo?: Cargo
  gerenteOnly?: boolean
}

const atendimentoItems: NavItem[] = [
  { to: '/chamados/novo',    icon: <PlusCircle size={20} />, label: 'Novo Atendimento' },
  { to: '/ginastica-laboral',icon: <Dumbbell size={20} />,   label: 'Ginástica Laboral' },
  { to: '/extintores',       icon: <Flame size={20} />,      label: 'Extintores' },
  { to: '/materiais',        icon: <Package size={20} />,    label: 'Materiais' },
]

const monitoramentoItems: NavItem[] = [
  { to: '/dashboard',            icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/notificacoes',         icon: <Bell size={20} />,            label: 'Notificações' },
  { to: '/chamados/historico',   icon: <ClipboardList size={20} />,   label: 'Relatório',          minCargo: 'Supervisor' },
  { to: '/relatorio-gerencial',  icon: <ClipboardList size={20} />,   label: 'Relatório',          gerenteOnly: true },
]

const contaItems: NavItem[] = [
  { to: '/usuarios',     icon: <Users size={20} />,      label: 'Usuários',     minCargo: 'Coordenador' },
  { to: '/configuracoes',icon: <Settings size={20} />,   label: 'Configurações' },
  { to: '/privacidade',  icon: <ShieldCheck size={20} />, label: 'Privacidade' },
]

function useUnreadNotificacoes() {
  const { profile } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!profile || profile.cargo !== 'Gerente') return

    const fetchCount = async () => {
      try {
        const [{ data: todas }, { data: lidas }] = await Promise.all([
          supabase.from('notificacoes').select('id'),
          supabase.from('notificacoes_lidas').select('notificacao_id').eq('user_id', profile.id),
        ])
        const lidasSet = new Set((lidas ?? []).map((l: { notificacao_id: string }) => l.notificacao_id))
        setCount((todas ?? []).filter((n: { id: string }) => !lidasSet.has(n.id)).length)
      } catch {
        // badge not critical
      }
    }

    fetchCount()

    let ch: ReturnType<typeof supabase.channel> | null = null
    try {
      ch = supabase
        .channel(`notif-badge-${profile.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes' }, fetchCount)
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notificacoes' }, fetchCount)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificacoes_lidas' }, fetchCount)
        .subscribe()
    } catch {
      // Realtime not available
    }

    return () => { if (ch) supabase.removeChannel(ch) }
  }, [profile])

  return count
}

interface SidebarProps {
  mobileOpen: boolean
  onMobileClose: () => void
}

function NavListItem({
  item,
  onItemClick,
  badge = 0,
}: {
  item: NavItem
  onItemClick?: () => void
  badge?: number
}) {
  const location = useLocation()
  const isActive =
    location.pathname === item.to ||
    (item.to !== '/chamados/novo' && location.pathname.startsWith(item.to))

  return (
    <li>
      <NavLink
        to={item.to}
        onClick={onItemClick}
        className={`
          group flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
          transition-all duration-200 relative
          ${isActive
            ? 'bg-brand-red/[0.08] text-white nav-item-active-glow'
            : 'text-brand-gray-400 hover:text-white hover:bg-white/[0.04]'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-brand-red rounded-r-full shadow-[0_0_8px_rgba(196,0,24,0.9)]" />
        )}

        <span className={`relative flex-shrink-0 transition-all duration-200 ${isActive ? 'text-brand-red opacity-100 drop-shadow-[0_0_6px_rgba(196,0,24,0.7)]' : 'opacity-60 group-hover:opacity-100'}`}>
          {item.icon}
        </span>

        <span className="truncate">{item.label}</span>

        {badge > 0 && (
          <span className="ml-auto bg-brand-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </NavLink>
    </li>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-gray-400/60 select-none">
      {label}
    </p>
  )
}

function NavContent({ onItemClick }: { onItemClick?: () => void }) {
  const { profile } = useAuth()
  const unreadCount = useUnreadNotificacoes()

  const filterByPermission = (items: NavItem[]) =>
    items.filter(item => {
      if (item.gerenteOnly) return profile?.cargo === 'Gerente'
      if (item.minCargo) return hasCargoPermission(profile?.cargo, item.minCargo)
      return true
    })

  const visibleAtendimento   = filterByPermission(atendimentoItems)
  const visibleMonitoramento = filterByPermission(monitoramentoItems)
  const visibleConta         = filterByPermission(contaItems)

  const renderItems = (items: NavItem[]) =>
    items.map(item => (
      <NavListItem
        key={item.to}
        item={item}
        onItemClick={onItemClick}
        badge={item.to === '/notificacoes' ? unreadCount : (item.badge ?? 0)}
      />
    ))

  return (
    <nav className="flex flex-col flex-1 overflow-hidden">

      {/* ── Seções superiores (scrollable) ── */}
      <div className="flex-1 overflow-y-auto py-4">

        {/* ATENDIMENTO */}
        {visibleAtendimento.length > 0 && (
          <div className="px-2">
            <SectionLabel label="Atendimento" />
            <ul className="flex flex-col gap-1">
              {renderItems(visibleAtendimento)}
            </ul>
          </div>
        )}

        {/* MONITORAMENTO */}
        {visibleMonitoramento.length > 0 && (
          <div className="px-2 mt-2">
            <SectionLabel label="Monitoramento" />
            <ul className="flex flex-col gap-1">
              {renderItems(visibleMonitoramento)}
            </ul>
          </div>
        )}

        {/* CONTA */}
        {visibleConta.length > 0 && (
          <div className="px-2 mt-2">
            <SectionLabel label="Conta" />
            <ul className="flex flex-col gap-1">
              {renderItems(visibleConta)}
            </ul>
          </div>
        )}

      </div>

    </nav>
  )
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`
          fixed top-0 left-0 h-screen z-50 flex flex-col
          bg-brand-gray-900 shadow-[8px_0_40px_rgba(0,0,0,0.7)]
          transition-transform duration-300 ease-in-out
          w-72 md:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-white/10 flex-shrink-0">
          <Logo size="sm" variant="full" />
          <button
            onClick={onMobileClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-3 pt-3 flex-shrink-0">
          <GlobalSearch onNavigate={onMobileClose} />
        </div>
        <NavContent onItemClick={onMobileClose} />
        <div className="px-4 py-3 flex-shrink-0">
          <p className="text-[10px] text-brand-gray-400 font-medium">BrigadaTech v1.0</p>
          <p className="text-[10px] text-brand-gray-400">BrigadaTech © {new Date().getFullYear()}</p>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`
          relative hidden md:flex flex-col h-screen w-[240px]
          bg-brand-gray-900 shadow-[4px_0_24px_rgba(0,0,0,0.4)]
          flex-shrink-0
        `}
      >
        <div className="flex items-center justify-center h-16 px-4 border-b border-white/10 flex-shrink-0">
          <Logo size="sm" variant="full" />
        </div>

        <NavContent />

        <div className="px-4 py-3 flex-shrink-0">
          <p className="text-[10px] text-brand-gray-400 font-medium">BrigadaTech v1.0</p>
          <p className="text-[10px] text-brand-gray-400">BrigadaTech © {new Date().getFullYear()}</p>
        </div>
      </aside>
    </>
  )
}
