import React, { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, FileText,
  ClipboardList, ChevronLeft, ChevronRight, Eye, Trash2, RefreshCw, Pencil, Save, X
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Chamado, FilterState, SituacaoType } from '../../types'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, getSituacaoColor } from '../../utils/formatters'
import { exportToCSV, exportToPDF } from '../../utils/export'
import { logAuditoria } from '../../lib/audit'
import { hasCargoPermission } from '../../lib/permissions'
import { useBrigadistas } from '../../hooks/useBrigadistas'
import { Button } from '../ui/Button'
import { Input, Select, Textarea } from '../ui/Input'
import { Card, CardHeader } from '../ui/Card'
import { SkeletonTable } from '../ui/Skeleton'
import { Modal, ConfirmModal } from '../ui/Modal'
import { TableSortIcon, TableEmptyState } from '../ui/TableUtils'

const SITUACOES: SituacaoType[] = [
  'Mal-Estar Geral', 'Desmaio / Lipotímia', 'Crise Hipertensiva',
  'Crise Hipoglicêmica', 'Reação Alérgica', 'Crise de Ansiedade / Pânico',
  'Trauma / Queda', 'Queimadura', 'Corte / Laceração',
  'Crise Epiléptica', 'Dor Torácica', 'Dificuldade Respiratória',
  'Atendimento de Rotina', 'Outros',
]

interface EditForm {
  brigadista: string
  colaborador_atendido: string
  situacao: string
  pressao_arterial: string
  bpm: string
  temperatura: string
  saturacao: string
  dados_atendimento: string
}

const PAGE_SIZE = 10

type SortKey = 'created_at' | 'brigadista' | 'colaborador_atendido' | 'situacao'
type SortDir = 'asc' | 'desc'

const SORT_COLUMNS = [
  { key: 'created_at' as SortKey, label: 'Data / Hora' },
  { key: 'brigadista' as SortKey, label: 'Brigadista' },
  { key: 'colaborador_atendido' as SortKey, label: 'Colaborador' },
  { key: 'situacao' as SortKey, label: 'Situação' },
]


export function HistoricoChamados() {
  const { user, profile, session } = useAuth()
  const { success, error: toastError } = useToast()
  const canManage = hasCargoPermission(profile?.cargo, 'Coordenador')
  const { brigadistas } = useBrigadistas()
  const location = useLocation()

  const [chamados, setChamados] = useState<Chamado[]>([])
  const [emailMap, setEmailMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Chamado | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editChamado, setEditChamado] = useState<Chamado | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)

  const initialSearch = (location.state as { searchTerm?: string } | null)?.searchTerm ?? ''
  const [filters, setFilters] = useState<FilterState>({
    search: initialSearch,
    brigadista: '',
  })

  const fetchChamados = useCallback(async () => {
    if (!session) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      let query = supabase
        .from('chamados_brigada')
        .select('*', { count: 'exact' })

      if (filters.search) {
        query = query.ilike('colaborador_atendido', `%${filters.search}%`)
      }
      if (filters.brigadista && filters.brigadista !== 'Todos') {
        query = query.eq('brigadista', filters.brigadista)
      }

      query = query
        .order(sortKey, { ascending: sortDir === 'asc' })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      setChamados(data as Chamado[])
      setTotal(count || 0)

      const ids = [...new Set((data as Chamado[]).map(c => c.created_by).filter(Boolean))] as string[]
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, email').in('id', ids)
        const map: Record<string, string> = {}
        profs?.forEach((p: { id: string; email: string }) => { map[p.id] = p.email })
        setEmailMap(map)
      } else {
        setEmailMap({})
      }
    } catch {
      toastError('Erro ao carregar', 'Não foi possível buscar os relatórios.')
    } finally {
      setLoading(false)
    }
  }, [filters, sortKey, sortDir, page, session])

  useEffect(() => {
    fetchChamados()
  }, [fetchChamados])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
    setPage(1)
  }

  const openEdit = (c: Chamado) => {
    setEditChamado(c)
    setEditForm({
      brigadista: c.brigadista,
      colaborador_atendido: c.colaborador_atendido,
      situacao: c.situacao,
      pressao_arterial: c.pressao_arterial ?? '',
      bpm: c.bpm ?? '',
      temperatura: c.temperatura ?? '',
      saturacao: c.saturacao ?? '',
      dados_atendimento: c.dados_atendimento ?? '',
    })
  }

  const handleSave = async () => {
    if (!editChamado || !editForm) return
    if (!editForm.brigadista || !editForm.colaborador_atendido || !editForm.situacao) {
      toastError('Campos obrigatórios', 'Brigadista, colaborador e situação são obrigatórios.')
      return
    }
    setSaveLoading(true)
    const { error } = await supabase
      .from('chamados_brigada')
      .update({
        brigadista: editForm.brigadista,
        colaborador_atendido: editForm.colaborador_atendido,
        situacao: editForm.situacao,
        pressao_arterial: editForm.pressao_arterial || null,
        bpm: editForm.bpm || null,
        temperatura: editForm.temperatura || null,
        saturacao: editForm.saturacao || null,
        dados_atendimento: editForm.dados_atendimento || null,
      })
      .eq('id', editChamado.id)
    setSaveLoading(false)
    if (error) {
      toastError('Erro ao salvar', error.message)
    } else {
      if (user) logAuditoria(user.id, 'update_chamado', { chamado_id: editChamado.id })
      success('Relatório atualizado', 'As alterações foram salvas com sucesso.')
      setEditChamado(null)
      setEditForm(null)
      fetchChamados()
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const { error } = await supabase.from('chamados_brigada').delete().eq('id', deleteId)
    setDeleteLoading(false)
    if (error) {
      toastError('Erro ao excluir', error.message)
    } else {
      if (user) logAuditoria(user.id, 'delete_chamado', { chamado_id: deleteId })
      success('Relatório excluído', 'Registro removido com sucesso.')
      setDeleteId(null)
      fetchChamados()
    }
  }

  const EXPORT_LIMIT = 10000

  const buildExportEmailMap = async (records: Chamado[]): Promise<Record<string, string>> => {
    const ids = [...new Set(records.map(c => c.created_by).filter(Boolean))] as string[]
    if (!ids.length) return {}
    const { data: profs } = await supabase.from('profiles').select('id, email').in('id', ids)
    const map: Record<string, string> = {}
    profs?.forEach((p: { id: string; email: string }) => { map[p.id] = p.email })
    return map
  }

  const handleExportCSV = async () => {
    const { data, error } = await supabase
      .from('chamados_brigada')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(EXPORT_LIMIT)
    if (error) { toastError('Erro na exportação', error.message); return }
    if (!data?.length) return
    const map = await buildExportEmailMap(data as Chamado[])
    if (user) logAuditoria(user.id, 'export_csv', { total: data.length })
    exportToCSV(data as Chamado[], 'chamados_brigada', map)
  }

  const handleExportPDF = async () => {
    const { data, error } = await supabase
      .from('chamados_brigada')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(EXPORT_LIMIT)
    if (error) { toastError('Erro na exportação', error.message); return }
    if (!data?.length) return
    const map = await buildExportEmailMap(data as Chamado[])
    if (user) logAuditoria(user.id, 'export_pdf', { total: data.length })
    exportToPDF(data as Chamado[], map)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const setFilter = (key: keyof FilterState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters(p => ({ ...p, [key]: e.target.value }))
    setPage(1)
  }

  return (
    <div className="space-y-5 animate-fade-in w-full min-w-0">
      <Card padding="md">
        <CardHeader
          title="Histórico de Relatórios"
          subtitle={`${total} registros encontrados`}
          icon={<ClipboardList size={18} />}
        />

        {/* Barra de filtros + ações em linha única */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Buscar colaborador..."
              value={filters.search}
              onChange={setFilter('search')}
              icon={<Search size={15} />}
            />
          </div>
          <div className="flex-1 min-w-0 sm:max-w-[200px]">
            <Select
              value={filters.brigadista}
              onChange={setFilter('brigadista')}
              options={[{ value: '', label: 'Todos' }, ...brigadistas.map(b => ({ value: b, label: b }))]}
            />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={fetchChamados}
              title="Atualizar"
            >
              <span className="hidden md:inline">Atualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportCSV}
              title="Exportar CSV"
            >
              <span className="hidden md:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FileText size={14} />}
              onClick={handleExportPDF}
              title="Exportar PDF"
            >
              <span className="hidden md:inline">PDF</span>
            </Button>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <SkeletonTable rows={8} />
        ) : chamados.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-gray-700">
            <table className="w-full text-sm" style={{ minWidth: '820px' }}>
              <thead>
                <tr className="bg-brand-gray-800 border-b border-brand-gray-700">
                  {SORT_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key)}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <TableSortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Registrado por</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">PA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">BPM</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Temp</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Sat.</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {chamados.map((c, i) => (
                  <tr
                    key={c.id}
                    className={`border-b border-brand-gray-700 hover:bg-brand-gray-800/50 transition-colors ${i % 2 !== 0 ? 'bg-brand-gray-900/50' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-gray-300 font-medium text-xs">{formatDate(c.created_at)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-300 font-medium text-sm truncate max-w-[140px]">{c.brigadista}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white font-semibold text-sm truncate max-w-[160px]">{c.colaborador_atendido}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-sm font-medium truncate max-w-[160px] ${getSituacaoColor(c.situacao)}`}>
                        {c.situacao}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-[160px] truncate">
                      {c.created_by ? (emailMap[c.created_by] ?? '—') : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.pressao_arterial || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.bpm || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.temperatura || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{c.saturacao || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelected(c)
                            if (user) logAuditoria(user.id, 'view_chamado', { chamado_id: c.id })
                          }}
                          className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
                          title="Ver detalhes"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <button
                            onClick={() => openEdit(c)}
                            className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-900/20 transition-all"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {canManage && (
                          <button
                            onClick={() => setDeleteId(c.id)}
                            className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
            <p className="text-xs text-gray-500 order-2 sm:order-1">
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<ChevronLeft size={14} />}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <span className="hidden sm:inline">Anterior</span>
              </Button>
              <span className="text-sm text-gray-400 px-2 tabular-nums">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
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

      {/* Modal de detalhes */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalhes do Relatório"
        size="lg"
      >
        {selected && (
          <ChamadoDetail
            chamado={selected}
            registradoPor={selected.created_by ? (emailMap[selected.created_by] ?? null) : null}
          />
        )}
      </Modal>

      {/* Modal de edição */}
      <Modal
        open={!!editChamado}
        onClose={() => { setEditChamado(null); setEditForm(null) }}
        title="Editar Relatório"
        size="lg"
      >
        {editForm && (
          <div className="space-y-4">
            {editChamado?.created_by && emailMap[editChamado.created_by] && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-brand-gray-800 border border-brand-gray-700 w-fit">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Registrado por</span>
                <span className="text-xs font-semibold text-white">{emailMap[editChamado.created_by]}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Brigadista Responsável"
                value={editForm.brigadista}
                onChange={e => setEditForm(f => f ? { ...f, brigadista: e.target.value } : f)}
                options={brigadistas.map(b => ({ value: b, label: b }))}
                placeholder="Selecione..."
                required
              />
              <Input
                label="Colaborador Atendido"
                type="text"
                value={editForm.colaborador_atendido}
                onChange={e => setEditForm(f => f ? { ...f, colaborador_atendido: e.target.value } : f)}
                required
              />
            </div>
            <Select
              label="Situação / Ocorrência"
              value={editForm.situacao}
              onChange={e => setEditForm(f => f ? { ...f, situacao: e.target.value } : f)}
              options={SITUACOES.map(s => ({ value: s, label: s }))}
              placeholder="Selecione..."
              required
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="Pressão Arterial" type="text" placeholder="120/80" value={editForm.pressao_arterial} onChange={e => setEditForm(f => f ? { ...f, pressao_arterial: e.target.value } : f)} />
              <Input label="BPM" type="text" placeholder="80 bpm" value={editForm.bpm} onChange={e => setEditForm(f => f ? { ...f, bpm: e.target.value } : f)} />
              <Input label="Temperatura" type="text" placeholder="36.5°C" value={editForm.temperatura} onChange={e => setEditForm(f => f ? { ...f, temperatura: e.target.value } : f)} />
              <Input label="Saturação O₂" type="text" placeholder="98%" value={editForm.saturacao} onChange={e => setEditForm(f => f ? { ...f, saturacao: e.target.value } : f)} />
            </div>
            <Textarea
              label="Descrição / Conduta Adotada"
              value={editForm.dados_atendimento}
              onChange={e => setEditForm(f => f ? { ...f, dados_atendimento: e.target.value } : f)}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                icon={<X size={16} />}
                onClick={() => { setEditChamado(null); setEditForm(null) }}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                icon={<Save size={16} />}
                loading={saveLoading}
                onClick={handleSave}
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Relatório"
        message="Esta ação é irreversível. O relatório será permanentemente excluído do sistema."
        confirmLabel="Excluir"
        loading={deleteLoading}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <TableEmptyState
      icon={<ClipboardList size={32} className="text-gray-600" />}
      title="Nenhum relatório encontrado"
      description="Tente ajustar os filtros ou registre um novo atendimento."
    />
  )
}

interface VitalItem {
  label: string
  value: string | null | undefined
}

function ChamadoDetail({ chamado, registradoPor }: { chamado: Chamado; registradoPor: string | null }) {
  const vitals: VitalItem[] = [
    { label: 'Pressão Arterial', value: chamado.pressao_arterial },
    { label: 'BPM', value: chamado.bpm },
    { label: 'Temperatura', value: chamado.temperatura },
    { label: 'Saturação O₂', value: chamado.saturacao },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <DetailField label="Data / Hora" value={formatDate(chamado.created_at)} />
        <DetailField label="Brigadista" value={chamado.brigadista} />
        <DetailField label="Colaborador" value={chamado.colaborador_atendido} />
        <DetailField
          label="Situação"
          value={chamado.situacao}
          className={getSituacaoColor(chamado.situacao)}
        />
        <DetailField label="Registrado por" value={registradoPor ?? '—'} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {vitals.map(({ label, value }) => (
          <div key={label} className="bg-brand-gray-800 border border-brand-gray-700 rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-sm font-bold text-white">{value || '—'}</p>
          </div>
        ))}
      </div>

      {chamado.dados_atendimento && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Registro do Atendimento</p>
          <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{chamado.dados_atendimento}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold text-white ${className}`}>{value}</p>
    </div>
  )
}
