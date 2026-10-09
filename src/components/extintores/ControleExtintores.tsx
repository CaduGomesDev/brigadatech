import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Search, Plus, Eye, Pencil, Trash2, RefreshCw,
  Flame, ChevronLeft, ChevronRight, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Extintor, ChecklistItem, SituacaoExtintor, HistoricoExtintor } from '../../types'
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

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

const TIPOS_EXTINTOR = ['Água', 'Espuma', 'CO₂', 'Pó Químico Seco', 'Pó ABC']

const CHECKLIST_LABELS: Record<string, string> = {
  suporte_altura:  'Suporte e altura (máx. 1,60m)',
  selo_inmetro:    'Selo do INMETRO',
  lacre_pino:      'Lacre e pino',
  manometro:       'Manômetro',
  corpo_extintor:  'Corpo do extintor',
  mangueira_bico:  'Mangueira e bico',
  valvula_bico:    'Válvula e bico',
  valvula_gatilho: 'Válvula e gatilho',
}

const CHECKLIST_OPTIONS: ChecklistItem[] = ['Conforme', 'Não Conforme', 'Não Aplicável']

type SortKey = 'numero' | 'localizacao' | 'tipo' | 'capacidade' | 'validade' | 'situacao' | 'ultima_inspecao'
type SortDir = 'asc' | 'desc'

const SORT_COLS: { key: SortKey; label: string }[] = [
  { key: 'numero',         label: 'Número'          },
  { key: 'localizacao',    label: 'Localização'      },
  { key: 'tipo',           label: 'Tipo'             },
  { key: 'capacidade',     label: 'LT/KG'            },
  { key: 'validade',       label: 'Validade'         },
  { key: 'situacao',       label: 'Situação'         },
  { key: 'ultima_inspecao',label: 'Última Inspeção'  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function isVencido(validade: string): boolean {
  if (!validade) return false
  const v = new Date(validade + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return v < today
}

function situacaoBadge(s: string) {
  switch (s) {
    case 'Conforme':       return 'bg-green-500/10  text-green-400  border-green-500/20'
    case 'Não Conforme':   return 'bg-orange-500/10 text-orange-400 border-orange-500/20'
    case 'Em Manutenção':  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
    case 'Vencido':        return 'bg-red-500/10    text-red-400    border-red-500/20'
    default:               return 'bg-gray-500/10   text-gray-400   border-gray-500/20'
  }
}

function computeSituacao(
  validade: string,
  vals: ChecklistItem[],
  emManutencao: boolean,
): SituacaoExtintor {
  if (validade && isVencido(validade)) return 'Vencido'
  if (vals.some(v => v === 'Não Conforme')) return 'Não Conforme'
  if (emManutencao) return 'Em Manutenção'
  return 'Conforme'
}

// ── Form type ─────────────────────────────────────────────────────────────────

interface FormData {
  numero:          string
  localizacao:     string
  tipo:            string
  capacidade:      string
  suporte_altura:  ChecklistItem
  selo_inmetro:    ChecklistItem
  lacre_pino:      ChecklistItem
  manometro:       ChecklistItem
  corpo_extintor:  ChecklistItem
  mangueira_bico:  ChecklistItem
  valvula_bico:    ChecklistItem
  valvula_gatilho: ChecklistItem
  validade:        string
  ultima_inspecao: string
  observacoes:     string
  emManutencao:    boolean
}

const EMPTY_FORM: FormData = {
  numero:          '',
  localizacao:     '',
  tipo:            TIPOS_EXTINTOR[0],
  capacidade:      '',
  suporte_altura:  'Conforme',
  selo_inmetro:    'Conforme',
  lacre_pino:      'Conforme',
  manometro:       'Conforme',
  corpo_extintor:  'Conforme',
  mangueira_bico:  'Conforme',
  valvula_bico:    'Conforme',
  valvula_gatilho: 'Conforme',
  validade:        '',
  ultima_inspecao: '',
  observacoes:     '',
  emManutencao:    false,
}

// ── Main component ────────────────────────────────────────────────────────────

export function ControleExtintores() {
  const { user, profile } = useAuth()
  const { success, error: toastError } = useToast()
  const canManage = hasCargoPermission(profile?.cargo, 'Coordenador')

  const [extintores, setExtintores]     = useState<Extintor[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [page, setPage]                 = useState(1)
  const [search, setSearch]             = useState('')
  const [filterSit, setFilterSit]       = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('numero')
  const [sortDir, setSortDir]           = useState<SortDir>('asc')
  const [viewing, setViewing]           = useState<Extintor | null>(null)
  const [editing, setEditing]           = useState<Extintor | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [deleteId, setDeleteId]         = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [form, setForm]                 = useState<FormData>(EMPTY_FORM)
  const [formErrors, setFormErrors]     = useState<Partial<Record<string, string>>>({})

  // ── Data fetching ───────────────────────────────────────────────────────────

  const fetchExtintores = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('extintores')
      .select('*')
      .order('numero', { ascending: true })
    if (error) {
      toastError('Erro ao carregar', 'Não foi possível buscar os extintores.')
    } else {
      setExtintores((data as Extintor[]) ?? [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchExtintores() }, [fetchExtintores])

  // ── Derived state ───────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total:       extintores.length,
    conforme:    extintores.filter(e => e.situacao === 'Conforme').length,
    naoConforme: extintores.filter(e => e.situacao === 'Não Conforme').length,
    manutencao:  extintores.filter(e => e.situacao === 'Em Manutenção').length,
    vencido:     extintores.filter(e => e.situacao === 'Vencido').length,
  }), [extintores])

  const filtered = useMemo(() => {
    let arr = [...extintores]
    if (search) {
      const q = search.toLowerCase()
      arr = arr.filter(e =>
        e.numero.toLowerCase().includes(q) ||
        e.localizacao.toLowerCase().includes(q) ||
        e.tipo.toLowerCase().includes(q),
      )
    }
    if (filterSit) arr = arr.filter(e => e.situacao === filterSit)
    arr.sort((a, b) => {
      const av = String(a[sortKey] ?? '')
      const bv = String(b[sortKey] ?? '')
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return arr
  }, [extintores, search, filterSit, sortKey, sortDir])

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
    setForm({ ...EMPTY_FORM, ultima_inspecao: new Date().toISOString().split('T')[0] })
    setFormErrors({})
    setShowForm(true)
  }

  const openEdit = (ext: Extintor) => {
    setEditing(ext)
    setForm({
      numero:          ext.numero,
      localizacao:     ext.localizacao,
      tipo:            ext.tipo,
      capacidade:      ext.capacidade,
      suporte_altura:  ext.suporte_altura,
      selo_inmetro:    ext.selo_inmetro,
      lacre_pino:      ext.lacre_pino,
      manometro:       ext.manometro,
      corpo_extintor:  ext.corpo_extintor,
      mangueira_bico:  ext.mangueira_bico,
      valvula_bico:    ext.valvula_bico,
      valvula_gatilho: ext.valvula_gatilho,
      validade:        ext.validade,
      ultima_inspecao: ext.ultima_inspecao,
      observacoes:     ext.observacoes ?? '',
      emManutencao:    ext.situacao === 'Em Manutenção',
    })
    setFormErrors({})
    setShowForm(true)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.numero.trim())      e.numero = 'Obrigatório'
    if (!form.localizacao.trim()) e.localizacao = 'Obrigatório'
    if (!form.tipo)               e.tipo = 'Obrigatório'
    if (!form.capacidade.trim())  e.capacidade = 'Obrigatório'
    if (!form.validade)           e.validade = 'Obrigatório'
    if (!form.ultima_inspecao)    e.ultima_inspecao = 'Obrigatório'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)

    const checklistVals: ChecklistItem[] = [
      form.suporte_altura, form.selo_inmetro, form.lacre_pino,
      form.manometro, form.corpo_extintor, form.mangueira_bico,
      form.valvula_bico, form.valvula_gatilho,
    ]
    const finalSituacao = computeSituacao(form.validade, checklistVals, form.emManutencao)

    const payload = {
      numero:          form.numero.trim(),
      localizacao:     form.localizacao.trim(),
      tipo:            form.tipo,
      capacidade:      form.capacidade.trim(),
      suporte_altura:  form.suporte_altura,
      selo_inmetro:    form.selo_inmetro,
      lacre_pino:      form.lacre_pino,
      manometro:       form.manometro,
      corpo_extintor:  form.corpo_extintor,
      mangueira_bico:  form.mangueira_bico,
      valvula_bico:    form.valvula_bico,
      valvula_gatilho: form.valvula_gatilho,
      validade:        form.validade,
      ultima_inspecao: form.ultima_inspecao,
      situacao:        finalSituacao,
      observacoes:     form.observacoes.trim() || null,
    }

    if (editing) {
      const { error } = await supabase
        .from('extintores')
        .update(payload)
        .eq('id', editing.id)
      if (error) {
        toastError('Erro ao salvar', error.message)
      } else {
        if (user) logAuditoria(user.id, 'update_extintor', { extintor_id: editing.id })
        success('Extintor atualizado', 'Dados salvos com sucesso.')
        setShowForm(false)
        fetchExtintores()
      }
    } else {
      const { data, error } = await supabase
        .from('extintores')
        .insert({ ...payload, created_by: user?.id ?? null })
        .select()
        .single()
      if (error) {
        toastError('Erro ao cadastrar', error.message)
      } else {
        if (user) logAuditoria(user.id, 'insert_extintor', { extintor_id: (data as Extintor).id })
        success('Extintor cadastrado', 'Registro criado com sucesso.')
        setShowForm(false)
        fetchExtintores()
      }
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleteLoading(true)
    const { error } = await supabase.from('extintores').delete().eq('id', deleteId)
    setDeleteLoading(false)
    if (error) {
      toastError('Erro ao excluir', error.message)
    } else {
      if (user) logAuditoria(user.id, 'delete_extintor', { extintor_id: deleteId })
      success('Extintor excluído', 'Registro removido com sucesso.')
      setDeleteId(null)
      fetchExtintores()
    }
  }

  const setField = (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(p => ({ ...p, [key]: e.target.value }))
      setFormErrors(p => ({ ...p, [key]: undefined }))
    }

  const setChecklist = (key: string, val: ChecklistItem) =>
    setForm(p => ({ ...p, [key]: val }))

  const toggleManutencao = (checked: boolean) =>
    setForm(p => ({ ...p, emManutencao: checked }))

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 animate-fade-in w-full min-w-0">

      {/* Dashboard de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Total"         value={stats.total}       color="neutral" />
        <StatCard label="Conformes"      value={stats.conforme}    color="green"   />
        <StatCard label="Não Conformes"  value={stats.naoConforme} color="orange"  />
        <StatCard label="Em Manutenção"  value={stats.manutencao}  color="yellow"  />
        <StatCard label="Vencidos"       value={stats.vencido}     color="red"     />
      </div>

      {/* Tabela principal */}
      <Card padding="md">
        <CardHeader
          title="Controle de Extintores"
          subtitle={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
          icon={<Flame size={18} />}
          action={
            canManage ? (
              <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={openCreate}>
                <span className="hidden sm:inline">Novo Extintor</span>
              </Button>
            ) : undefined
          }
        />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Buscar por número, local ou tipo..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              icon={<Search size={15} />}
            />
          </div>
          <div className="sm:w-44">
            <Select
              value={filterSit}
              onChange={e => { setFilterSit(e.target.value); setPage(1) }}
              options={[
                { value: '',              label: 'Todas situações'  },
                { value: 'Conforme',      label: 'Conforme'         },
                { value: 'Não Conforme',  label: 'Não Conforme'     },
                { value: 'Em Manutenção', label: 'Em Manutenção'    },
                { value: 'Vencido',       label: 'Vencido'          },
              ]}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw size={14} />}
            onClick={fetchExtintores}
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
            icon={<Flame size={32} className="text-gray-600" />}
            title="Nenhum extintor encontrado"
            description="Ajuste os filtros ou cadastre um novo extintor."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-brand-gray-700">
            <table className="w-full text-sm" style={{ minWidth: '700px' }}>
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
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((ext, i) => (
                  <tr
                    key={ext.id}
                    className={`border-b border-brand-gray-700 hover:bg-brand-gray-800/50 transition-colors ${
                      i % 2 !== 0 ? 'bg-brand-gray-900/50' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{ext.numero}</td>
                    <td className="px-4 py-3 text-gray-300 max-w-[180px] truncate">{ext.localizacao}</td>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{ext.tipo}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{ext.capacidade}</td>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${isVencido(ext.validade) ? 'text-red-400' : 'text-gray-300'}`}>
                      {ext.validade ? formatDateShort(ext.validade) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${situacaoBadge(ext.situacao)}`}>
                        {ext.situacao}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {ext.ultima_inspecao ? formatDateShort(ext.ultima_inspecao) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setViewing(ext)
                            if (user) logAuditoria(user.id, 'view_extintor', { extintor_id: ext.id })
                          }}
                          className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
                          title="Visualizar"
                        >
                          <Eye size={14} />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEdit(ext)}
                              className="w-9 h-9 md:w-7 md:h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-gray-700 transition-all"
                              title="Editar"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteId(ext.id)}
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
        title={editing ? 'Editar Extintor' : 'Cadastrar Extintor'}
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
        <ExtintorForm
          form={form}
          errors={formErrors}
          setField={setField}
          setChecklist={setChecklist}
          toggleManutencao={toggleManutencao}
        />
      </Modal>

      {/* Modal de visualização */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title="Detalhes do Extintor" size="lg">
        {viewing && <ExtintorDetail extintor={viewing} />}
      </Modal>

      {/* Modal de exclusão */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir Extintor"
        message="Esta ação é irreversível. O extintor será permanentemente excluído do sistema."
        confirmLabel="Excluir"
        loading={deleteLoading}
      />

      {/* Histórico de ações */}
      <HistoricoExtintoresSection />
    </div>
  )
}

// ── Histórico de Ações ────────────────────────────────────────────────────────

const DETALHE_LABELS: Record<string, string> = {
  tipo:             'Tipo',
  situacao:         'Situação',
  localizacao:      'Localização',
  capacidade:       'Capacidade',
  numero:           'Número',
  validade:         'Validade',
  ultima_inspecao:  'Última Inspeção',
  observacoes:      'Observações',
  suporte_altura:   'Suporte/Altura',
  selo_inmetro:     'Selo INMETRO',
  lacre_pino:       'Lacre/Pino',
  manometro:        'Manômetro',
  corpo_extintor:   'Corpo',
  mangueira_bico:   'Mangueira/Bico',
  valvula_bico:     'Válvula Bico',
  valvula_gatilho:  'Válvula Gatilho',
}

function formatDetalhes(detalhes: Record<string, unknown>): string {
  return Object.entries(detalhes)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${DETALHE_LABELS[k] ?? k}: ${v}`)
    .join(' · ')
}

const ACAO_STYLES: Record<string, string> = {
  'Cadastro':            'bg-green-500/10  text-green-400  border-green-500/20',
  'Alteração':           'bg-blue-500/10   text-blue-400   border-blue-500/20',
  'Alteração de status': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Exclusão':            'bg-red-500/10    text-red-400    border-red-500/20',
}

function HistoricoExtintoresSection() {
  const [historico, setHistorico] = useState<HistoricoExtintor[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHistorico = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('historico_extintores')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setHistorico((data as HistoricoExtintor[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchHistorico() }, [fetchHistorico])

  return (
    <Card padding="md">
      <CardHeader
        title="Histórico de Ações"
        subtitle="Últimas 30 alterações nos extintores"
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
          <p className="text-sm text-gray-600">Nenhuma ação registrada ainda.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-gray-700">
          <table className="w-full text-sm" style={{ minWidth: '560px' }}>
            <thead>
              <tr className="bg-brand-gray-800 border-b border-brand-gray-700">
                {['Data / Hora', 'Extintor', 'Ação', 'Responsável', 'Detalhes'].map(h => (
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
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{h.extintor_numero}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${ACAO_STYLES[h.acao] ?? 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {h.acao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-sm">{h.usuario_nome ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">
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

type StatColor = 'neutral' | 'green' | 'orange' | 'yellow' | 'red'

function StatCard({ label, value, color }: { label: string; value: number; color: StatColor }) {
  const styles: Record<StatColor, string> = {
    neutral: 'bg-brand-gray-800 border-brand-gray-700',
    green:   'bg-green-500/10  border-green-500/20',
    orange:  'bg-orange-500/10 border-orange-500/20',
    yellow:  'bg-yellow-500/10 border-yellow-500/20',
    red:     'bg-red-500/10    border-red-500/20',
  }
  const textStyles: Record<StatColor, string> = {
    neutral: 'text-white',
    green:   'text-green-400',
    orange:  'text-orange-400',
    yellow:  'text-yellow-400',
    red:     'text-red-400',
  }
  return (
    <div className={`border rounded-2xl p-4 flex flex-col gap-1 animate-fade-in ${styles[color]}`}>
      <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
      <p className={`text-2xl font-black tabular-nums ${textStyles[color]}`}>{value}</p>
    </div>
  )
}



// ── Form ───────────────────────────────────────────────────────────────────────

interface ExtintorFormProps {
  form:             FormData
  errors:           Partial<Record<string, string>>
  setField:         (key: string) => React.ChangeEventHandler<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  setChecklist:     (key: string, val: ChecklistItem) => void
  toggleManutencao: (v: boolean) => void
}

function ExtintorForm({ form, errors, setField, setChecklist, toggleManutencao }: ExtintorFormProps) {
  const checklistVals: ChecklistItem[] = [
    form.suporte_altura, form.selo_inmetro, form.lacre_pino,
    form.manometro, form.corpo_extintor, form.mangueira_bico,
    form.valvula_bico, form.valvula_gatilho,
  ]
  const computedSit = computeSituacao(form.validade, checklistVals, form.emManutencao)
  const canSetManutencao = computedSit !== 'Vencido' && computedSit !== 'Não Conforme'

  return (
    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">

      {/* Dados gerais */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Dados Gerais</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Número do Extintor"
            placeholder="Ex: EX-001"
            value={form.numero}
            onChange={setField('numero')}
            error={errors.numero}
            required
          />
          <Input
            label="Localização"
            placeholder="Ex: Recepção — 1º andar"
            value={form.localizacao}
            onChange={setField('localizacao')}
            error={errors.localizacao}
            required
          />
          <Select
            label="Tipo de Extintor"
            value={form.tipo}
            onChange={setField('tipo')}
            error={errors.tipo}
            required
            options={TIPOS_EXTINTOR.map(t => ({ value: t, label: t }))}
          />
          <Input
            label="Capacidade (LT/KG)"
            placeholder="Ex: 6 kg"
            value={form.capacidade}
            onChange={setField('capacidade')}
            error={errors.capacidade}
            required
          />
        </div>
      </section>

      <div className="h-px bg-brand-gray-700" />

      {/* Inspeção física */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Inspeção Física</p>
        <div className="space-y-2">
          {Object.entries(CHECKLIST_LABELS).map(([key, label]) => (
            <ChecklistRow
              key={key}
              label={label}
              value={form[key as keyof FormData] as ChecklistItem}
              onChange={val => setChecklist(key, val)}
            />
          ))}
        </div>
      </section>

      <div className="h-px bg-brand-gray-700" />

      {/* Validade */}
      <section>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Validade e Situação</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <Input
            label="Data de Validade"
            type="date"
            value={form.validade}
            onChange={setField('validade')}
            error={errors.validade}
            required
          />
          <Input
            label="Data da Última Inspeção"
            type="date"
            value={form.ultima_inspecao}
            onChange={setField('ultima_inspecao')}
            error={errors.ultima_inspecao}
            required
          />
        </div>

        {/* Situação calculada */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Situação calculada</p>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold border ${situacaoBadge(computedSit)}`}>
              {computedSit}
            </span>
          </div>
          {canSetManutencao && (
            <label className="flex items-center gap-2 cursor-pointer sm:mt-5">
              <input
                type="checkbox"
                className="checkbox-manutencao"
                checked={form.emManutencao}
                onChange={e => toggleManutencao(e.target.checked)}
              />
              <span className="text-sm text-yellow-400 font-medium select-none">
                Marcar como Em Manutenção
              </span>
            </label>
          )}
        </div>
      </section>

      <div className="h-px bg-brand-gray-700" />

      {/* Observações */}
      <section>
        <Textarea
          label="Observações"
          placeholder="Informações adicionais sobre o extintor..."
          value={form.observacoes}
          onChange={setField('observacoes')}
          rows={3}
        />
      </section>
    </div>
  )
}

function ChecklistRow({
  label,
  value,
  onChange,
}: {
  label:    string
  value:    ChecklistItem
  onChange: (val: ChecklistItem) => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl bg-brand-gray-800/60 border border-brand-gray-700">
      <span className="text-sm text-gray-300 flex-1 min-w-0 truncate">{label}</span>
      <div className="flex gap-1 flex-shrink-0">
        {CHECKLIST_OPTIONS.map(opt => {
          const active = value === opt
          const activeStyle = active
            ? opt === 'Conforme'
              ? 'bg-green-500/20 border-green-500/40 text-green-400'
              : opt === 'Não Conforme'
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-gray-500/20 border-gray-500/40 text-gray-300'
            : 'bg-transparent border-brand-gray-600 text-gray-600 hover:border-brand-gray-500 hover:text-gray-400'
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-2 py-0.5 text-[11px] font-semibold rounded-lg border transition-all ${activeStyle}`}
            >
              {opt === 'Não Aplicável' ? 'N/A' : opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Detail view ────────────────────────────────────────────────────────────────

function ExtintorDetail({ extintor: e }: { extintor: Extintor }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DetailField label="Número"     value={e.numero}    />
        <DetailField label="Tipo"       value={e.tipo}      />
        <DetailField label="Capacidade" value={e.capacidade}/>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Situação</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${situacaoBadge(e.situacao)}`}>
            {e.situacao}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <DetailField label="Localização"      value={e.localizacao}                                         />
        <DetailField label="Validade"         value={e.validade ? formatDateShort(e.validade) : '—'}        highlight={isVencido(e.validade)} />
        <DetailField label="Última Inspeção"  value={e.ultima_inspecao ? formatDateShort(e.ultima_inspecao) : '—'} />
      </div>

      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Checklist de Inspeção</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.entries(CHECKLIST_LABELS) as [keyof Extintor, string][]).map(([key, label]) => {
            const val = e[key] as ChecklistItem
            return (
              <div key={String(key)} className="flex items-center justify-between gap-2 px-3 py-2 bg-brand-gray-800 border border-brand-gray-700 rounded-xl">
                <span className="text-xs text-gray-400 truncate">{label}</span>
                <span className={`text-xs font-semibold flex-shrink-0 ${
                  val === 'Conforme'     ? 'text-green-400' :
                  val === 'Não Conforme' ? 'text-red-400'   : 'text-gray-500'
                }`}>
                  {val ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {e.observacoes && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Observações</p>
          <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-xl p-4">
            <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{e.observacoes}</p>
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
