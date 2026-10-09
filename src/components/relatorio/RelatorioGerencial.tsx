import { useState, useEffect, useCallback, useRef } from 'react'
import { ClipboardList, Dumbbell, RefreshCw, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Chamado } from '../../types'
import { formatDate } from '../../utils/formatters'
import { Card, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { SkeletonTable } from '../ui/Skeleton'

const PAGE_SIZE = 20

function extractSetores(dados: string | null): string {
  if (!dados) return '—'
  const match = dados.match(/Setores concluídos:\s*(.+)/)
  return match ? match[1] : '—'
}

type ChamadoResumido = Pick<
  Chamado,
  'id' | 'brigadista' | 'colaborador_atendido' | 'situacao' | 'dados_atendimento' | 'created_at'
>

export function RelatorioGerencial() {
  const location = useLocation()
  const [chamados, setChamados] = useState<ChamadoResumido[]>([])
  const [loading, setLoading]   = useState(true)
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const term = (location.state as { searchTerm?: string } | null)?.searchTerm ?? ''
    if (term) {
      setSearch(term)
      setActiveSearch(term)
      setPage(1)
    }
  }, [location.state])

  const fetchChamados = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('chamados_brigada')
      .select('id, brigadista, colaborador_atendido, situacao, dados_atendimento, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (activeSearch.trim()) {
      q = q.ilike('colaborador_atendido', `%${activeSearch.trim()}%`)
    }

    const { data, error, count } = await q
    if (!error) {
      setChamados((data as ChamadoResumido[]) ?? [])
      setTotal(count ?? 0)
    }
    setLoading(false)
  }, [page, activeSearch])

  useEffect(() => { fetchChamados() }, [fetchChamados])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setActiveSearch(search)
      setPage(1)
    }, 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search])

  const clearSearch = () => { setSearch(''); setActiveSearch(''); setPage(1) }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5 animate-fade-in w-full min-w-0">
      <Card padding="md">
        <CardHeader
          title="Relatório Gerencial"
          subtitle={`${total} registro${total !== 1 ? 's' : ''}${activeSearch ? ` para "${activeSearch}"` : ''}`}
          icon={<ClipboardList size={18} />}
          action={
            <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetchChamados}>
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
          }
        />

        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por paciente atendido..."
            className="w-full bg-brand-gray-800 border border-brand-gray-600 rounded-xl text-sm text-white placeholder-gray-600 pl-9 pr-9 py-2 h-9 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50 transition-all duration-200"
          />
          {search && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {loading ? (
          <SkeletonTable rows={6} />
        ) : chamados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClipboardList size={32} className="text-gray-700 mb-2" />
            <p className="text-sm text-gray-600">
              {activeSearch ? `Nenhum resultado para "${activeSearch}".` : 'Nenhum registro encontrado.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chamados.map(c => (
              <div
                key={c.id}
                className="rounded-xl border border-brand-gray-700 bg-brand-gray-800/50 p-4 space-y-1.5"
              >
                {c.situacao === 'Ginástica Laboral' ? (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell size={14} className="text-brand-red shrink-0" />
                      <span className="text-sm font-bold text-white">Ginástica Laboral Concluída!</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Setores: <span className="text-gray-200">{extractSetores(c.dados_atendimento)}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Brigadista: <span className="text-gray-200">{c.brigadista}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <ClipboardList size={14} className="text-brand-red shrink-0" />
                      <span className="text-sm font-bold text-white">Atendimento</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Brigadista: <span className="text-gray-200">{c.brigadista}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Atendido: <span className="text-gray-200">{c.colaborador_atendido}</span>
                    </p>
                  </>
                )}
                <p className="text-xs text-gray-500 pt-0.5">
                  Data/Hora: {formatDate(c.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <p className="text-xs text-gray-500 order-2 sm:order-1">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="ghost" size="sm"
                icon={<ChevronLeft size={14} />}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm text-gray-400 px-2 tabular-nums">{page} / {totalPages}</span>
              <Button
                variant="ghost" size="sm"
                iconRight={<ChevronRight size={14} />}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <span className="hidden sm:inline">Próxima</span>
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
