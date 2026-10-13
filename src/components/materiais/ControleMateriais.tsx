import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Plus, Eye, Pencil, Trash2, RefreshCw,
  Package, ChevronLeft, ChevronRight, Clock,
  ClipboardList, AlertTriangle, PackageX, Wrench,
  Paperclip, Upload, Download, FileText,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MaterialBrigada, HistoricoMaterial, AnexoMaterial, TipoItemMaterial, EstadoConservacao } from '../../types'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, formatDateShort } from '../../utils/formatters'
import { logAuditoria } from '../../lib/audit'
import { hasCargoPermission } from '../../lib/permissions'
import { Button } from '../ui/Button'
import { Input, Select, Textarea } from '../ui/Input'
import { Card, CardHeader } from '../ui/Card'
import { SkeletonTable } from '../ui/Skeleton'
import { Modal, ConfirmModal } from '../ui/Modal'
import { TableSortIcon, TableEmptyState } from '../ui/TableUtils'
import { exportMateriaisCSV, exportMateriaisPDF } from '../../utils/export'

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10
const DIAS_PADRAO = 30

const CATEGORIAS = [
  'Equipamentos',
  'Materiais de Primeiros Socorros',
  'Antissépticos e Insumos',
  'Equipamentos de Emergência',
]

const TIPOS_ANEXO = ['Foto', 'Nota Fiscal', 'Certificado', 'Laudo de Inspeção', 'Outro']

type SortKey = 'nome' | 'categoria' | 'tipo_item' | 'quantidade_atual' | 'data_validade' | 'local_armazenamento'
type SortDir = 'asc' | 'desc'

const SORT_COLS: { key: SortKey; label: string }[] = [
  { key: 'nome',               label: 'Nome'       },
  { key: 'categoria',          label: 'Categoria'  },
  { key: 'tipo_item',          label: 'Tipo'       },
  { key: 'quantidade_atual',   label: 'Qtd.'       },
  { key: 'data_validade',      label: 'Validade'   },
  { key: 'local_armazenamento',label: 'Local'      },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

type AlertColor = 'red' | 'orange' | 'yellow' | 'blue' | 'green'
interface AlertaTag { key: string; label: string; color: AlertColor }

function diasAte(dataStr: string): number {
  const alvo = new Date(dataStr + 'T00:00:00')
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

function computeAlertas(m: MaterialBrigada, diasAntecedencia: number): AlertaTag[] {
  const alertas: AlertaTag[] = []

  if (m.data_validade) {
    const dias = diasAte(m.data_validade)
    if (dias < 0) alertas.push({ key: 'vencido', label: 'Vencido', color: 'red' })
    else if (dias <= diasAntecedencia) alertas.push({ key: 'proximo', label: `Vence em ${dias}d`, color: 'orange' })
  }

  if (m.quantidade_atual <= m.estoque_minimo) {
    alertas.push({ key: 'estoque_baixo', label: 'Estoque Baixo', color: 'yellow' })
  }

  if (m.tipo_item === 'Equipamento' && m.data_proxima_manutencao) {
    const dias = diasAte(m.data_proxima_manutencao)
    if (dias <= 0) alertas.push({ key: 'manutencao', label: 'Necessita Manutenção', color: 'blue' })
  }

  if (alertas.length === 0) {
    alertas.push({
      key: 'ok',
      label: m.tipo_item === 'Equipamento' ? 'Em Boas Condições' : 'Dentro da Validade',
      color: 'green',
    })
  }

  return alertas
}

function alertaBadgeStyle(color: AlertColor): string {
  switch (color) {
    case 'red':    return 'bg-red-500/10    text-red-400    border-red-500/20'
    case 'orange': return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'yellow': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'blue':   return 'bg-blue-500/10   text-blue-400   border-blue-500/20'
    case 'green':  return 'bg-green-500/10  text-green-400  border-green-500/20'
  }
}

// ── Form type ─────────────────────────────────────────────────────────────────

interface FormData {
  nome: string
  categoria: string
  tipo_item: TipoItemMaterial
  descricao: string
  lote: string
  quantidade_atual: string
  unidade_medida: string
  estoque_minimo: string
  local_armazenamento: string
  responsavel: string
  observacoes: string
  data_fabricacao: string
  data_validade: string
  numero_patrimonio: string
  estado_conservacao: EstadoConservacao
  data_ultima_inspecao: string
  data_proxima_manutencao: string
}

const EMPTY_FORM: FormData = {
  nome: '',
  categoria: CATEGORIAS[0],
  tipo_item: 'Consumível',
  descricao: '',
  lote: '',
  quantidade_atual: '0',
  unidade_medida: 'un',
  estoque_minimo: '0',
  local_armazenamento: '',
  responsavel: '',
  observacoes: '',
  data_fabricacao: '',
  data_validade: '',
  numero_patrimonio: '',
  estado_conservacao: 'Bom',
  data_ultima_inspecao: '',
  data_proxima_manutencao: '',
}

// ── Main component ────────────────────────────────────────────────────────────

export function ControleMateriais() {
  const { user, profile } = useAuth()
  const { success, error: toastError } = useToast()
  const canManage = hasCargoPermission(profile?.cargo, 'Coordenador')

  const [materiais, setMateriais]       = useState<MaterialBrigada[]>([])
  const [diasAntecedencia, setDias]     = useState(DIAS_PADRAO)
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [filterTipo, setFilterTipo]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('nome')
  const [sortDir, setSortDir]           = useState<SortDir>('asc')
  const [viewing, setViewing]           = useState<MaterialBrigada | null>(null)
  const [editing, setEditing]           = useState<MaterialBrigada | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [form, setForm]                 = useState<FormData>(EMPTY_FORM)
  const [formErrors, setFormErrors]     = useState<Partial<Record<string, string>>>({})

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchMateriais = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('materiais_brigada')
      .select('*')
      .order('nome', { ascending: true })
    if (error) {
      toastError('Erro ao carregar', 'Não foi possível buscar os materiais.')
    } else {
      setMateriais((data as MaterialBrigada[]) ?? [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchConfig = useCallback(async () => {
    const { data } = await supabase
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'dias_antecedencia_alertas')
      .maybeSingle()
    if (data?.valor) setDias(Number(data.valor))
  }, [])

  useEffect(() => { fetchMateriais(); fetchConfig() }, [fetchMateriais, fetchConfig])

  // ── Derived state ───────────────────────────────────────────────────────────

  const alertasPorItem = useMemo(() => {
    const map = new Map<string, AlertaTag[]>()
    materiais.forEach(m => map.set(m.id, computeAlertas(m, diasAntecedencia)))
    return map
  }, [materiais, diasAntecedencia])

  const temAlerta = useCallback((id: string, key: string) =>
    (alertasPorItem.get(id) ?? []).some(a => a.key === key), [alertasPorItem])

  const stats = useMemo(() => ({
    total:        materiais.length,
    vencidos:     materiais.filter(m => temAlerta(m.id, 'vencido')).length,
    proximos:     materiais.filter(m => temAlerta(m.id, 'proximo')).length,
    estoqueBaixo: materiais.filter(m => temAlerta(m.id, 'estoque_baixo')).length,
    manutencao:   materiais.filter(m => temAlerta(m.id, 'manutencao')).length,
  }), [materiais, temAlerta])

  const filtered = useMemo(() => {
    let arr = [...materiais]
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter(m =>
        m.nome.toLowerCase().includes(q) ||
        m.categoria.toLowerCase().includes(q) ||
        m.local_armazenamento.toLowerCase().includes(q),
      )
    }
    if (filterTipo) arr = arr.filter(m => m.tipo_item === filterTipo)
    if (filterStatus) arr = arr.filter(m => temAlerta(m.id, filterStatus))
    arr.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av
      }
      const as = String(av ?? '')
      const bs = String(bv ?? '')
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    })
    return arr
  }, [materiais, search, filterTipo, filterStatus, sortKey, sortDir, temAlerta])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSort = (key: SortKey) => {
    setSortDir(d => (sortKey === key ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
    setSortKey(key)
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setShowForm(true)
  }

  const openEdit = (m: MaterialBrigada) => {
    setEditing(m)
    setForm({
      nome: m.nome,
      categoria: m.categoria,
      tipo_item: m.tipo_item,
      descricao: m.descricao ?? '',
      lote: m.lote ?? '',
      quantidade_atual: String(m.quantidade_atual),
      unidade_medida: m.unidade_medida,
      estoque_minimo: String(m.estoque_minimo),
      local_armazenamento: m.local_armazenamento,
      responsavel: m.responsavel,
      observacoes: m.observacoes ?? '',
      data_fabricacao: m.data_fabricacao ?? '',
      data_validade: m.data_validade ?? '',
      numero_patrimonio: m.numero_patrimonio ?? '',
      estado_conservacao: m.estado_conservacao ?? 'Bom',
      data_ultima_inspecao: m.data_ultima_inspecao ?? '',
      data_proxima_manutencao: m.data_proxima_manutencao ?? '',
    })
    setFormErrors({})
    setShowForm(true)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.nome.trim())                e.nome = 'Obrigatório'
    if (!form.categoria)                  e.categoria = 'Obrigatório'
    if (!form.local_armazenamento.trim()) e.local_armazenamento = 'Obrigatório'
    if (!form.responsavel.trim())         e.responsavel = 'Obrigatório'
    if (form.quantidade_atual === '' || Number(form.quantidade_atual) < 0) e.quantidade_atual = 'Quantidade inválida'
    if (form.estoque_minimo === '' || Number(form.estoque_minimo) < 0)    e.estoque_minimo = 'Valor inválido'
    if (form.tipo_item === 'Consumível' && !form.data_validade) e.data_validade = 'Obrigatório para consumíveis'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const payload = {
      nome: form.nome.trim(),
      categoria: form.categoria,
      tipo_item: form.tipo_item,
      descricao: form.descricao.trim() || null,
      lote: form.lote.trim() || null,
      quantidade_atual: Number(form.quantidade_atual),
      unidade_medida: form.unidade_medida.trim() || 'un',
      estoque_minimo: Number(form.estoque_minimo),
      local_armazenamento: form.local_armazenamento.trim(),
      responsavel: form.responsavel.trim(),
      observacoes: form.observacoes.trim() || null,
      data_fabricacao: form.data_fabricacao || null,
      data_validade: form.data_validade || null,
      numero_patrimonio: form.numero_patrimonio.trim() || null,
      estado_conservacao: form.tipo_item === 'Equipamento' ? form.estado_conservacao : null,
      data_ultima_inspecao: form.tipo_item === 'Equipamento' ? (form.data_ultima_inspecao || null) : null,
      data_proxima_manutencao: form.tipo_item === 'Equipamento' ? (form.data_proxima_manutencao || null) : null,
    }

    if (editing) {
      const { error } = await supabase
        .from('materiais_brigada')
        .update(payload)
        .eq('id', editing.id)
      if (error) {
        toastError('Erro ao salvar', error.message)
      } else {
        if (user) logAuditoria(user.id, 'update_material', { material_id: editing.id })
        success('Material atualizado', 'Dados salvos com sucesso.')
        setShowForm(false)
        fetchMateriais()
      }
    } else {
      const { data, error } = await supabase
        .from('materiais_brigada')
        .insert({ ...payload, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) {
        toastError('Erro ao cadastrar', error.message)
      } else {
        if (user) logAuditoria(user.id, 'insert_material', { material_id: (data as MaterialBrigada).id })
        success('Material cadastrado', 'Registro criado com sucesso.')
        setShowForm(false)
        fetchMateriais()
      }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const { error } = await supabase.from('materiais_brigada').delete().eq('id', deleteId)
    setDeleteLoading(false)
    if (error) {
      toastError('Erro ao excluir', error.message)
    } else {
      if (user) logAuditoria(user.id, 'delete_material', { material_id: deleteId })
      success('Material excluído', 'Registro removido com sucesso.')
      setDeleteId(null)
      fetchMateriais()
    }
  }

  const setField = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      setFormErrors(p => ({ ...p, [key]: undefined }))
    }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in w-full min-w-0">

      {/* Dashboard de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total"               value={stats.total}        color="neutral" icon={<ClipboardList size={18} />} />
        <StatCard label="Vencidos"             value={stats.vencidos}     color="red"     icon={<PackageX size={18} />} />
        <StatCard label="Próx. do Vencimento"  value={stats.proximos}     color="orange"  icon={<AlertTriangle size={18} />} />
        <StatCard label="Estoque Baixo"        value={stats.estoqueBaixo} color="yellow"  icon={<Package size={18} />} />
        <StatCard label="Necessita Manutenção" value={stats.manutencao}   color="blue"    icon={<Wrench size={18} />} />
      </div>

      {/* Tabela principal */}
      <Card padding="md">
        <CardHeader
          title="Materiais e Equipamentos da Brigada"
          subtitle={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
          icon={<Package size={18} />}
          action={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={() => exportMateriaisCSV(filtered)}>
                <span className="hidden sm:inline">CSV</span>
              </Button>
              <Button variant="ghost" size="sm" icon={<FileText size={14} />} onClick={() => exportMateriaisPDF(filtered)}>
                <span className="hidden sm:inline">PDF</span>
              </Button>
              {canManage && (
                <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
                  <span className="hidden sm:inline">Novo Item</span>
                </Button>
              )}
            </div>
          }
        />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Buscar por nome, categoria ou local..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              icon={<Search size={15} />}
            />
          </div>
          <div className="sm:w-44">
            <Select
              value={filterTipo}
              onChange={e => { setFilterTipo(e.target.value); setPage(1) }}
              options={[
                { value: '',             label: 'Todos os tipos' },
                { value: 'Consumível',   label: 'Consumível'     },
                { value: 'Equipamento',  label: 'Equipamento'    },
              ]}
            />
          </div>
          <div className="sm:w-48">
            <Select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
              options={[
                { value: '',              label: 'Todos os status'       },
                { value: 'vencido',       label: 'Vencido'                },
                { value: 'proximo',       label: 'Próximo do Vencimento'  },
                { value: 'estoque_baixo', label: 'Estoque Baixo'          },
                { value: 'manutencao',    label: 'Necessita Manutenção'   },
                { value: 'ok',            label: 'Sem Pendências'         },
              ]}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={fetchMateriais}
            title="Atualizar"
            className="self-end sm:self-auto"
          >
            <span className="hidden md:inline">Atualizar</span>
          </Button>
        </div>

        {/* Conteúdo da tabela */}
        {loading ? (
          <SkeletonTable rows={8} />
        ) : paginated.length === 0 ? (
          <TableEmptyState
            icon={<Package size={32} className="text-gray-600" />}
            title="Nenhum material encontrado"
            description="Ajuste os filtros ou cadastre um novo item."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-gray-700">
            <table className="w-full text-sm" style={{ minWidth: '820px' }}>
              <thead>
                <tr className="bg-brand-gray-800 border-b border-brand-gray-700">
                  {SORT_COLS.map(col => (
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((m, i) => (
                  <tr
                    key={m.id}
                    className={`border-b border-brand-gray-700 hover:bg-brand-gray-800/50 transition-colors ${
                      i % 2 !== 0 ? 'bg-brand-gray-900/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white max-w-[200px] truncate">{m.nome}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate">{m.categoria}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{m.tipo_item}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {m.quantidade_atual} {m.unidade_medida}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                      {m.data_validade ? formatDateShort(m.data_validade) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-[160px] truncate">{m.local_armazenamento}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {(alertasPorItem.get(m.id) ?? []).map(a => (
                          <span key={a.key} className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${alertaBadgeStyle(a.color)}`}>
                            {a.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setViewing(m)
                            if (user) logAuditoria(user.id, 'view_material', { material_id: m.id })
                          }}
                          className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
                          title="Visualizar"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(m)}
                              className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteId(m.id)}
                              className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
                              title="Excluir"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
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
              Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
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

      {/* Modal de cadastro / edição */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Editar Item' : 'Cadastrar Item'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>
              {editing ? 'Salvar alterações' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <MaterialForm form={form} errors={formErrors} setField={setField} setForm={setForm} />
      </Modal>

      {/* Modal de visualização */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Detalhes do Item" size="lg">
        {viewing && (
          <div className="space-y-6">
            <MaterialDetail material={viewing} diasAntecedencia={diasAntecedencia} />
            <div className="h-px bg-brand-gray-700" />
            <AnexosSection materialId={viewing.id} canManage={canManage} />
          </div>
        )}
      </Modal>

      {/* Modal de exclusão */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Item"
        message="Esta ação é irreversível. O item será permanentemente excluído do sistema."
        confirmLabel="Excluir"
        loading={deleteLoading}
      />

      {/* Histórico de ações */}
      <HistoricoMateriaisSection />
    </div>
  )
}

// ── Histórico de Ações ────────────────────────────────────────────────────────

const ACAO_STYLES: Record<string, string> = {
  'Cadastro':            'bg-green-500/10  text-green-400  border-green-500/20',
  'Alteração':           'bg-blue-500/10   text-blue-400   border-blue-500/20',
  'Entrada de Estoque':  'bg-green-500/10  text-green-400  border-green-500/20',
  'Saída de Estoque':    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Exclusão':            'bg-red-500/10    text-red-400    border-red-500/20',
}

function formatDetalhes(detalhes: Record<string, unknown>): string {
  return Object.entries(detalhes)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join(' · ')
}

function HistoricoMateriaisSection() {
  const [historico, setHistorico] = useState<HistoricoMaterial[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistorico = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('historico_materiais_brigada')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setHistorico((data as HistoricoMaterial[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchHistorico() }, [fetchHistorico])

  return (
    <Card padding="md">
      <CardHeader
        title="Histórico de Movimentações"
        subtitle="Últimas 30 alterações em materiais e equipamentos"
        icon={<Clock size={18} />}
        action={
          <Button variant="ghost" size="sm" icon={<RefreshCw size={14} />} onClick={fetchHistorico}>
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        }
      />

      {loading ? (
        <SkeletonTable rows={5} />
      ) : historico.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Clock size={28} className="text-gray-700 mb-2" />
          <p className="text-sm text-gray-600">Nenhuma movimentação registrada ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-gray-700">
          <table className="w-full text-sm" style={{ minWidth: '560px' }}>
            <thead>
              <tr className="bg-brand-gray-800 border-b border-brand-gray-700">
                {['Data / Hora', 'Item', 'Ação', 'Responsável', 'Detalhes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map((h, i) => (
                <tr
                  key={h.id}
                  className={`border-b border-brand-gray-700 hover:bg-brand-gray-800/50 transition-colors ${i % 2 !== 0 ? 'bg-brand-gray-900/50' : ''}`}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDate(h.created_at)}</td>
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{h.material_nome}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${ACAO_STYLES[h.acao] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {h.acao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{h.usuario_nome ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[220px] truncate">
                    {h.detalhes ? formatDetalhes(h.detalhes) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

type StatColor = 'neutral' | 'green' | 'orange' | 'yellow' | 'red' | 'blue'

function StatCard({ label, value, color, icon }: { label: string; value: number; color: StatColor; icon: React.ReactNode }) {
  const chipStyles: Record<StatColor, string> = {
    neutral: 'bg-white/[0.06]    border-white/10      text-gray-300',
    green:   'bg-green-500/10   border-green-500/20   text-green-400',
    orange:  'bg-orange-500/10  border-orange-500/20  text-orange-400',
    yellow:  'bg-yellow-500/10  border-yellow-500/20  text-yellow-400',
    red:     'bg-red-500/10     border-red-500/20     text-red-400',
    blue:    'bg-blue-500/10    border-blue-500/20    text-blue-400',
  }
  return (
    <div className="bg-brand-gray-900 border border-brand-gray-700 rounded-2xl p-4 flex items-center gap-3 animate-fade-in hover:border-brand-gray-600 transition-colors duration-200 min-w-0">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${chipStyles[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white leading-none">{value}</p>
        <p className="text-xs font-medium text-gray-500 truncate mt-1">{label}</p>
      </div>
    </div>
  )
}

// ── Form ───────────────────────────────────────────────────────────────────────

interface MaterialFormProps {
  form:    FormData
  errors:  Partial<Record<string, string>>
  setField:(key: string) => React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  setForm: React.Dispatch<React.SetStateAction<FormData>>
}

function MaterialForm({ form, errors, setField, setForm }: MaterialFormProps) {
  const isConsumivel = form.tipo_item === 'Consumível'

  return (
    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">

      {/* Tipo de item */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tipo de Item</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, tipo_item: 'Consumível' }))}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
              isConsumivel
                ? 'bg-brand-red/15 border-brand-red text-white'
                : 'bg-brand-gray-800 border-brand-gray-600 text-gray-400 hover:border-brand-gray-500'
            }`}
          >
            <Package size={18} className={isConsumivel ? 'text-brand-red' : 'text-gray-500'} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Consumível</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">Gaze, luvas, soro, álcool...</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setForm(p => ({ ...p, tipo_item: 'Equipamento' }))}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
              !isConsumivel
                ? 'bg-brand-red/15 border-brand-red text-white'
                : 'bg-brand-gray-800 border-brand-gray-600 text-gray-400 hover:border-brand-gray-500'
            }`}
          >
            <Wrench size={18} className={!isConsumivel ? 'text-brand-red' : 'text-gray-500'} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">Equipamento</p>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">Medidor, maca, rádio, oxímetro...</p>
            </div>
          </button>
        </div>
      </section>

      <div className="h-px bg-brand-gray-700" />

      {/* Dados gerais */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados Gerais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nome do Item"
            placeholder="Ex: Gaze Estéril"
            value={form.nome}
            onChange={setField('nome')}
            error={errors.nome}
            required
          />
          <Select
            label="Categoria"
            value={form.categoria}
            onChange={setField('categoria')}
            error={errors.categoria}
            required
            options={CATEGORIAS.map(c => ({ value: c, label: c }))}
          />
          <Input
            label="Local de Armazenamento"
            placeholder="Ex: Armário de Enfermagem — Sala 2"
            value={form.local_armazenamento}
            onChange={setField('local_armazenamento')}
            error={errors.local_armazenamento}
            required
          />
          <Input
            label="Responsável pelo Controle"
            placeholder="Ex: João Silva"
            value={form.responsavel}
            onChange={setField('responsavel')}
            error={errors.responsavel}
            required
          />
        </div>
        <div className="mt-4">
          <Textarea
            label="Descrição"
            placeholder="Descrição adicional do item..."
            value={form.descricao}
            onChange={setField('descricao')}
            rows={2}
          />
        </div>
      </section>

      <div className="h-px bg-brand-gray-700" />

      {/* Estoque */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Controle de Estoque</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Input
            label="Quantidade Atual"
            type="number"
            min="0"
            value={form.quantidade_atual}
            onChange={setField('quantidade_atual')}
            error={errors.quantidade_atual}
            required
          />
          <Input
            label="Unidade de Medida"
            placeholder="un, cx, L..."
            value={form.unidade_medida}
            onChange={setField('unidade_medida')}
          />
          <Input
            label="Estoque Mínimo"
            type="number"
            min="0"
            value={form.estoque_minimo}
            onChange={setField('estoque_minimo')}
            error={errors.estoque_minimo}
            required
          />
        </div>
        {isConsumivel && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Input
              label="Lote"
              placeholder="Ex: L-2026-048"
              value={form.lote}
              onChange={setField('lote')}
            />
          </div>
        )}
      </section>

      <div className="h-px bg-brand-gray-700" />

      {/* Validade */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Controle de Validade {isConsumivel ? '' : '(quando aplicável)'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Data de Fabricação"
            type="date"
            value={form.data_fabricacao}
            onChange={setField('data_fabricacao')}
          />
          <Input
            label="Data de Validade"
            type="date"
            value={form.data_validade}
            onChange={setField('data_validade')}
            error={errors.data_validade}
            required={isConsumivel}
          />
        </div>
      </section>

      {!isConsumivel && (
        <>
          <div className="h-px bg-brand-gray-700" />
          <section>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Controle de Equipamento</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Número de Patrimônio"
                placeholder="Ex: PAT-00123"
                value={form.numero_patrimonio}
                onChange={setField('numero_patrimonio')}
              />
              <Select
                label="Estado de Conservação"
                value={form.estado_conservacao}
                onChange={setField('estado_conservacao')}
                options={[
                  { value: 'Bom',     label: 'Bom'     },
                  { value: 'Regular', label: 'Regular' },
                  { value: 'Ruim',    label: 'Ruim'    },
                ]}
              />
              <Input
                label="Última Inspeção"
                type="date"
                value={form.data_ultima_inspecao}
                onChange={setField('data_ultima_inspecao')}
              />
              <Input
                label="Próxima Manutenção"
                type="date"
                value={form.data_proxima_manutencao}
                onChange={setField('data_proxima_manutencao')}
              />
            </div>
          </section>
        </>
      )}

      <div className="h-px bg-brand-gray-700" />

      {/* Observações */}
      <section>
        <Textarea
          label="Observações"
          placeholder="Informações adicionais sobre o item..."
          value={form.observacoes}
          onChange={setField('observacoes')}
          rows={3}
        />
      </section>
    </div>
  )
}

// ── Detail view ────────────────────────────────────────────────────────────────

function MaterialDetail({ material: m, diasAntecedencia }: { material: MaterialBrigada; diasAntecedencia: number }) {
  const alertas = computeAlertas(m, diasAntecedencia)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DetailField label="Nome"      value={m.nome} />
        <DetailField label="Categoria" value={m.categoria} />
        <DetailField label="Tipo"      value={m.tipo_item} />
        <DetailField label="Quantidade" value={`${m.quantidade_atual} ${m.unidade_medida}`} />
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Status</p>
        <div className="flex flex-wrap gap-1.5">
          {alertas.map(a => (
            <span key={a.key} className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${alertaBadgeStyle(a.color)}`}>
              {a.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DetailField label="Local de Armazenamento" value={m.local_armazenamento} />
        <DetailField label="Responsável"             value={m.responsavel} />
        <DetailField label="Estoque Mínimo"          value={`${m.estoque_minimo} ${m.unidade_medida}`} />
      </div>

      {m.tipo_item === 'Consumível' ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <DetailField label="Lote"             value={m.lote ?? '—'} />
          <DetailField label="Data de Fabricação" value={m.data_fabricacao ? formatDateShort(m.data_fabricacao) : '—'} />
          <DetailField label="Data de Validade"   value={m.data_validade ? formatDateShort(m.data_validade) : '—'} highlight={alertas.some(a => a.key === 'vencido' || a.key === 'proximo')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <DetailField label="Número de Patrimônio" value={m.numero_patrimonio ?? '—'} />
          <DetailField label="Estado de Conservação" value={m.estado_conservacao ?? '—'} />
          <DetailField label="Última Inspeção"       value={m.data_ultima_inspecao ? formatDateShort(m.data_ultima_inspecao) : '—'} />
          <DetailField label="Próxima Manutenção"    value={m.data_proxima_manutencao ? formatDateShort(m.data_proxima_manutencao) : '—'} highlight={alertas.some(a => a.key === 'manutencao')} />
        </div>
      )}

      {m.descricao && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Descrição</p>
          <p className="text-sm text-gray-300 leading-relaxed">{m.descricao}</p>
        </div>
      )}

      {m.observacoes && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Observações</p>
          <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{m.observacoes}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailField({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-sm font-semibold ${highlight ? 'text-red-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}

// ── Anexos ────────────────────────────────────────────────────────────────────

const BUCKET = 'materiais-anexos'

function AnexosSection({ materialId, canManage }: { materialId: string; canManage: boolean }) {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const [anexos, setAnexos] = useState<AnexoMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [tipoAnexo, setTipoAnexo] = useState(TIPOS_ANEXO[0])

  const fetchAnexos = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('materiais_brigada_anexos')
      .select('*')
      .eq('material_id', materialId)
      .order('created_at', { ascending: false })
    setAnexos((data as AnexoMaterial[]) ?? [])
    setLoading(false)
  }, [materialId])

  useEffect(() => { fetchAnexos() }, [fetchAnexos])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const caminho = `${materialId}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(caminho, file)
    if (uploadError) {
      toastError('Erro ao enviar arquivo', uploadError.message)
      setUploading(false)
      return
    }
    const { error: dbError } = await supabase.from('materiais_brigada_anexos').insert({
      material_id: materialId,
      nome_arquivo: file.name,
      tipo: tipoAnexo,
      caminho,
      tamanho_bytes: file.size,
      uploaded_by: user?.id ?? null,
    })
    setUploading(false)
    if (dbError) {
      toastError('Erro ao registrar anexo', dbError.message)
    } else {
      success('Anexo enviado', `${file.name} foi anexado ao item.`)
      fetchAnexos()
    }
  }

  const handleDownload = async (anexo: AnexoMaterial) => {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(anexo.caminho, 60)
    if (error || !data) {
      toastError('Erro ao abrir anexo', error?.message ?? 'Tente novamente.')
      return
    }
    window.open(data.signedUrl, '_blank')
  }

  const handleDeleteAnexo = async (anexo: AnexoMaterial) => {
    await supabase.storage.from(BUCKET).remove([anexo.caminho])
    const { error } = await supabase.from('materiais_brigada_anexos').delete().eq('id', anexo.id)
    if (error) {
      toastError('Erro ao excluir anexo', error.message)
    } else {
      success('Anexo excluído')
      fetchAnexos()
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Paperclip size={12} /> Anexos (fotos, notas fiscais, certificados, laudos)
      </p>

      {canManage && (
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <div className="sm:w-48">
            <Select
              value={tipoAnexo}
              onChange={e => setTipoAnexo(e.target.value)}
              options={TIPOS_ANEXO.map(t => ({ value: t, label: t }))}
            />
          </div>
          <label className="flex-1">
            <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            <span className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-brand-gray-600 text-sm text-gray-400 hover:border-brand-red/50 hover:text-white cursor-pointer transition-all">
              <Upload size={15} />
              {uploading ? 'Enviando...' : 'Selecionar arquivo para anexar'}
            </span>
          </label>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-600">Carregando anexos...</p>
      ) : anexos.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum anexo enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {anexos.map(a => (
            <div key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-brand-gray-800/60 border border-brand-gray-700">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={15} className="text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-gray-200 truncate">{a.nome_arquivo}</p>
                  <p className="text-[11px] text-gray-500">{a.tipo} · {formatDate(a.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(a)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
                  title="Baixar"
                >
                  <Download size={14} />
                </button>
                {canManage && (
                  <button
                    onClick={() => handleDeleteAnexo(a)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-900/20 transition-all"
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
