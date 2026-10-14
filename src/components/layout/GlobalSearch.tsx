import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Search, User,
  LayoutDashboard, PlusCircle, ClipboardList,
  Users, Settings, ShieldCheck, Flame, Dumbbell,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { hasCargoPermission } from '../../lib/permissions'
import { Chamado, Cargo } from '../../types'

const NAV_ITEMS: { label: string; to: string; icon: React.ReactNode; minCargo?: Cargo }[] = [
  { label: 'Novo Atendimento', to: '/chamados/novo', icon: <PlusCircle size={15} /> },
  { label: 'Ginástica Laboral', to: '/ginastica-laboral', icon: <Dumbbell size={15} /> },
  { label: 'Relatórios', to: '/chamados/historico', icon: <ClipboardList size={15} />, minCargo: 'Coordenador' },
  { label: 'Dashboard', to: '/dashboard', icon: <LayoutDashboard size={15} /> },
  { label: 'Usuários', to: '/usuarios', icon: <Users size={15} />, minCargo: 'Coordenador' },
  { label: 'Controle de Extintores', to: '/extintores', icon: <Flame size={15} /> },
  { label: 'Configurações', to: '/configuracoes', icon: <Settings size={15} /> },
  { label: 'Minha Privacidade', to: '/privacidade', icon: <ShieldCheck size={15} /> },
]

type ResultItem =
  | { kind: 'nav'; key: string; label: string; to: string; icon: React.ReactNode }
  | { kind: 'patient'; key: string; label: string; id: string }

interface GlobalSearchProps {
  onNavigate?: () => void
}

export function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [patients, setPatients] = useState<Chamado[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const canSeeFullHistory = hasCargoPermission(profile?.cargo, 'Supervisor')

  // Ctrl+K / Cmd+K abre e fecha a paleta de qualquer lugar da tela.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setPatients([])
      setActiveIndex(0)
      document.body.style.overflow = 'hidden'
      requestAnimationFrame(() => inputRef.current?.focus())
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const searchPatients = useCallback(async (q: string) => {
    if (!profile || q.length < 2) { setPatients([]); return }
    setLoadingPatients(true)
    const { data } = await supabase
      .from('chamados_brigada_resumo')
      .select('id, colaborador_atendido, situacao, created_at')
      .ilike('colaborador_atendido', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(5)
    setPatients((data as Chamado[]) || [])
    setLoadingPatients(false)
  }, [profile])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.length >= 2) debounceRef.current = setTimeout(() => searchPatients(query), 300)
    else setPatients([])
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, searchPatients])

  useEffect(() => { setActiveIndex(0) }, [query, patients])

  const filteredNav = useMemo(() => NAV_ITEMS.filter(item => {
    if (item.minCargo && !hasCargoPermission(profile?.cargo, item.minCargo)) return false
    if (!query) return true
    return item.label.toLowerCase().includes(query.toLowerCase())
  }), [query, profile])

  const results: ResultItem[] = useMemo(() => [
    ...filteredNav.map(n => ({ kind: 'nav' as const, key: n.to, label: n.label, to: n.to, icon: n.icon })),
    ...patients.map(p => ({ kind: 'patient' as const, key: p.id, label: p.colaborador_atendido, id: p.id })),
  ], [filteredNav, patients])

  const go = (to: string) => { navigate(to); setOpen(false); onNavigate?.() }
  const goPatient = (name: string) => {
    const dest = canSeeFullHistory ? '/chamados/historico' : '/relatorio-gerencial'
    navigate(dest, { state: { searchTerm: name } })
    setOpen(false)
    onNavigate?.()
  }
  const selectResult = (item: ResultItem) => {
    if (item.kind === 'nav') go(item.to)
    else goPatient(item.label)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[activeIndex]
      if (item) selectResult(item)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 bg-brand-gray-800 border border-brand-gray-600 rounded-xl text-sm pl-3 pr-2.5 h-9 hover:border-brand-gray-500 transition-all duration-200"
      >
        <Search size={14} className="text-gray-500 shrink-0" />
        <span className="flex-1 text-left truncate text-gray-600">Buscar ferramenta ou paciente...</span>
        <kbd className="text-[10px] text-gray-600 bg-brand-gray-700 border border-brand-gray-600 rounded px-1 py-0.5 font-mono shrink-0">
          Ctrl K
        </kbd>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-brand-gray-900 border border-brand-gray-700 rounded-2xl shadow-card overflow-hidden animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-brand-gray-700">
              <Search size={15} className="text-gray-500 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar ferramenta ou paciente..."
                className="flex-1 min-w-0 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
              />
              <kbd className="text-[10px] text-gray-600 bg-brand-gray-700 border border-brand-gray-600 rounded px-1 py-0.5 font-mono shrink-0">
                Esc
              </kbd>
            </div>

            <div className="max-h-80 overflow-y-auto p-1.5">
              {results.length === 0 && !loadingPatients && (
                <p className="px-4 py-6 text-center text-sm text-gray-500">
                  {query ? `Nenhum resultado para "${query}"` : 'Digite para buscar...'}
                </p>
              )}

              {filteredNav.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Ferramentas</p>
                  {filteredNav.map(item => {
                    const index = results.findIndex(r => r.kind === 'nav' && r.to === item.to)
                    return (
                      <button
                        key={item.to}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(item.to)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-all ${
                          index === activeIndex ? 'bg-brand-red/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="text-brand-red shrink-0">{item.icon}</span>
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              )}

              {patients.length > 0 && (
                <div className={filteredNav.length > 0 ? 'border-t border-brand-gray-700 mt-1 pt-1' : ''}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Pacientes</p>
                  {patients.map(p => {
                    const index = results.findIndex(r => r.kind === 'patient' && r.id === p.id)
                    return (
                      <button
                        key={p.id}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => goPatient(p.colaborador_atendido)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left transition-all ${
                          index === activeIndex ? 'bg-brand-red/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-brand-gray-700 flex items-center justify-center shrink-0">
                          <User size={10} className="text-gray-400" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-xs">{p.colaborador_atendido}</p>
                        </div>
                        <span className="text-[10px] text-brand-red shrink-0">Ver →</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {loadingPatients && <div className="px-4 py-3 text-sm text-gray-500">Buscando...</div>}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
