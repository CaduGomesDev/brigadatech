import { useState, useEffect, useCallback } from 'react'
import { Bell, Pin, PinOff, Plus, Trash2, RefreshCw, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { Notificacao } from '../../types'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { hasCargoPermission } from '../../lib/permissions'
import { Button } from '../ui/Button'
import { Modal, ConfirmModal } from '../ui/Modal'
import { NotificacaoEditor } from './NotificacaoEditor'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora mesmo'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  return `há ${d}d`
}

function cargoBadge(cargo: string) {
  switch (cargo) {
    case 'Coordenador': return 'bg-brand-red/10 text-brand-red border-brand-red/20'
    case 'Supervisor':  return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
    default:            return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
  }
}

const EMPTY_FORM = { titulo: '', mensagem: '' }

export function Notificacoes() {
  const { profile } = useAuth()
  const { success, error } = useToast()

  const canWrite  = hasCargoPermission(profile?.cargo, 'Supervisor')
  const isGerente = profile?.cargo === 'Gerente'

  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [lidasIds, setLidasIds]         = useState<Set<string>>(new Set())
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [showModal, setShowModal]       = useState(false)
  const [form, setForm]                 = useState(EMPTY_FORM)
  const [formErrors, setFormErrors]     = useState<Partial<typeof EMPTY_FORM>>({})
  const [deleteTarget, setDeleteTarget] = useState<Notificacao | null>(null)
  const [expanded, setExpanded]         = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)

    const { data: notifs, error: err } = await supabase
      .from('notificacoes')
      .select('*')
      .order('fixada', { ascending: false })
      .order('created_at', { ascending: false })

    if (err) { error('Erro ao carregar', err.message); setLoading(false); return }

    const lista = notifs ?? []
    setNotificacoes(lista)

    if (isGerente && lista.length > 0 && profile) {
      const { data: lidas } = await supabase
        .from('notificacoes_lidas')
        .select('notificacao_id')
        .eq('user_id', profile.id)

      const lidasSet = new Set((lidas ?? []).map((l: { notificacao_id: string }) => l.notificacao_id))
      setLidasIds(lidasSet)

      // Marca todas como lidas em segundo plano — o NOVO badge aparece brevemente
      const unread = lista.filter(n => !lidasSet.has(n.id))
      if (unread.length > 0) {
        supabase
          .from('notificacoes_lidas')
          .upsert(
            unread.map(n => ({ notificacao_id: n.id, user_id: profile.id })),
            { onConflict: 'notificacao_id,user_id' },
          )
          .then(() => setLidasIds(new Set(lista.map(n => n.id))))
      }
    }

    setLoading(false)
  }, [profile, isGerente, error])

  useEffect(() => { load() }, [load])

  function validate() {
    const errs: Partial<typeof EMPTY_FORM> = {}
    if (!form.titulo.trim())   errs.titulo   = 'Título obrigatório'
    if (!form.mensagem.trim()) errs.mensagem = 'Mensagem obrigatória'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleCreate() {
    if (!validate() || !profile) return
    setSaving(true)
    const { error: err } = await supabase.from('notificacoes').insert({
      titulo:      form.titulo.trim(),
      mensagem:    form.mensagem.trim(),
      fixada:      false,
      autor_id:    profile.id,
      autor_nome:  profile.nome,
      cargo_autor: profile.cargo,
    })
    setSaving(false)
    if (err) { error('Erro ao publicar', err.message); return }
    success('Notificação enviada', 'Os gerentes poderão visualizar agora.')
    setShowModal(false)
    setForm(EMPTY_FORM)
    setFormErrors({})
    load()
  }

  async function handleTogglePin(n: Notificacao) {
    const { error: err } = await supabase
      .from('notificacoes')
      .update({ fixada: !n.fixada, updated_at: new Date().toISOString() })
      .eq('id', n.id)
    if (err) { error('Erro ao fixar', err.message); return }
    success(n.fixada ? 'Notificação desafixada' : 'Notificação fixada')
    load()
  }

  async function handleDelete() {
    if (!deleteTarget) return
    const { error: err } = await supabase
      .from('notificacoes')
      .delete()
      .eq('id', deleteTarget.id)
    setDeleteTarget(null)
    if (err) { error('Erro ao excluir', err.message); return }
    success('Notificação excluída')
    load()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const pinned   = notificacoes.filter(n => n.fixada)
  const unpinned = notificacoes.filter(n => !n.fixada)
  const totalNaoLidas = isGerente ? notificacoes.filter(n => !lidasIds.has(n.id)).length : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center">
            <Bell size={20} className="text-brand-red" />
            {isGerente && totalNaoLidas > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-red rounded-full flex items-center justify-center text-[9px] font-bold text-white">
                {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Notificações</h2>
            <p className="text-xs text-brand-gray-400">
              {canWrite
                ? 'Envie avisos para os gerentes'
                : `Avisos da equipe de gestão${totalNaoLidas > 0 ? ` · ${totalNaoLidas} não ${totalNaoLidas === 1 ? 'lida' : 'lidas'}` : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-brand-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
            title="Atualizar"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {canWrite && (
            <Button size="sm" onClick={() => { setForm(EMPTY_FORM); setFormErrors({}); setShowModal(true) }}>
              <Plus size={16} className="mr-1" />
              Nova Notificação
            </Button>
          )}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-brand-gray-800/60 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Pinned */}
      {!loading && pinned.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-red/70 flex items-center gap-1.5">
            <Pin size={12} /> Fixadas
          </p>
          {pinned.map(n => (
            <NotificacaoCard
              key={n.id}
              n={n}
              canWrite={canWrite}
              isNew={isGerente && !lidasIds.has(n.id)}
              expanded={!!expanded[n.id]}
              onToggleExpand={() => toggleExpand(n.id)}
              onPin={() => handleTogglePin(n)}
              onDelete={() => setDeleteTarget(n)}
            />
          ))}
        </section>
      )}

      {/* Unpinned */}
      {!loading && unpinned.length > 0 && (
        <section className="space-y-3">
          {pinned.length > 0 && (
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-gray-400/60 flex items-center gap-1.5">
              Recentes
            </p>
          )}
          {unpinned.map(n => (
            <NotificacaoCard
              key={n.id}
              n={n}
              canWrite={canWrite}
              isNew={isGerente && !lidasIds.has(n.id)}
              expanded={!!expanded[n.id]}
              onToggleExpand={() => toggleExpand(n.id)}
              onPin={() => handleTogglePin(n)}
              onDelete={() => setDeleteTarget(n)}
            />
          ))}
        </section>
      )}

      {/* Empty */}
      {!loading && notificacoes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-gray-800 flex items-center justify-center mb-4">
            <Bell size={28} className="text-brand-gray-400" />
          </div>
          <p className="text-white font-medium">Nenhuma notificação</p>
          <p className="text-brand-gray-400 text-sm mt-1">
            {canWrite ? 'Publique o primeiro aviso para os gerentes.' : 'Nenhum aviso publicado ainda.'}
          </p>
        </div>
      )}

      {/* Create modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Notificação" size="lg">
        <div className="space-y-4">
          <NotificacaoEditor
            titulo={form.titulo}
            mensagem={form.mensagem}
            onTituloChange={v => setForm(p => ({ ...p, titulo: v }))}
            onMensagemChange={v => setForm(p => ({ ...p, mensagem: v }))}
            errorTitulo={formErrors.titulo}
            errorMensagem={formErrors.mensagem}
          />
          <p className="text-xs text-brand-gray-400 flex items-center gap-1.5">
            <Bell size={11} />
            Esta notificação será enviada a todos os gerentes.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={saving}>
              {saving ? 'Enviando...' : 'Enviar aos Gerentes'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Excluir notificação"
        message={`Deseja excluir "${deleteTarget?.titulo}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}

interface CardProps {
  n: Notificacao
  canWrite: boolean
  isNew: boolean
  expanded: boolean
  onToggleExpand: () => void
  onPin: () => void
  onDelete: () => void
}

const PREVIEW_LIMIT = 300

function parseMarkdownCard(text: string): string {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>')
}

function NotificacaoCard({ n, canWrite, isNew, expanded, onToggleExpand, onPin, onDelete }: CardProps) {
  const isLong    = n.mensagem.length > PREVIEW_LIMIT
  const rawPreview = isLong && !expanded ? n.mensagem.slice(0, PREVIEW_LIMIT) + '…' : n.mensagem

  return (
    <div
      className={`
        relative rounded-xl border transition-all duration-200 overflow-hidden
        bg-brand-gray-900/60 backdrop-blur-sm
        ${isNew
          ? 'border-yellow-500/30 shadow-[0_0_16px_rgba(234,179,8,0.06)]'
          : n.fixada
            ? 'border-brand-red/30 shadow-[0_0_16px_rgba(196,0,24,0.08)]'
            : 'border-white/[0.06] hover:border-white/10'
        }
      `}
    >
      {(n.fixada || isNew) && (
        <span className={`absolute inset-y-0 left-0 w-[3px] ${isNew ? 'bg-yellow-400' : 'bg-brand-red'}`} />
      )}

      <div className="p-4 pl-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-semibold text-sm">{n.titulo}</span>
            {isNew && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-1.5 py-0.5 rounded-full">
                <Sparkles size={9} /> Novo
              </span>
            )}
            {n.fixada && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-red bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded-full">
                <Pin size={9} /> Fixada
              </span>
            )}
          </div>

          {canWrite && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={onPin}
                title={n.fixada ? 'Desafixar' : 'Fixar no topo'}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all
                  ${n.fixada ? 'text-brand-red hover:bg-brand-red/10' : 'text-brand-gray-400 hover:text-white hover:bg-white/[0.06]'}`}
              >
                {n.fixada ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              <button
                onClick={onDelete}
                title="Excluir"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-brand-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Message rendered as markdown */}
        <div
          className="
            mt-2 text-sm text-brand-gray-400 leading-relaxed
            [&_strong]:text-white [&_strong]:font-semibold
            [&_em]:italic
            [&_code]:bg-brand-gray-700/80 [&_code]:text-brand-red [&_code]:px-1 [&_code]:py-px [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
            [&_pre]:bg-brand-gray-700/80 [&_pre]:p-2 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:mt-1 [&_pre]:text-xs
            [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-brand-gray-300
            [&_blockquote]:border-l-2 [&_blockquote]:border-brand-gray-500 [&_blockquote]:pl-2 [&_blockquote]:text-brand-gray-500 [&_blockquote]:italic
            [&_li]:ml-4 [&_li]:list-disc
          "
          dangerouslySetInnerHTML={{ __html: parseMarkdownCard(rawPreview) }}
        />

        {isLong && (
          <button
            onClick={onToggleExpand}
            className="mt-1.5 flex items-center gap-1 text-xs text-brand-red/80 hover:text-brand-red transition-colors"
          >
            {expanded ? <><ChevronUp size={12} /> Ver menos</> : <><ChevronDown size={12} /> Ver mais</>}
          </button>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center gap-2">
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${cargoBadge(n.cargo_autor)}`}>
            {n.cargo_autor}
          </span>
          <span className="text-[11px] text-brand-gray-400 font-medium">{n.autor_nome}</span>
          <span className="text-brand-gray-600 text-[10px]">·</span>
          <span className="text-[11px] text-brand-gray-400">{timeAgo(n.created_at)}</span>
        </div>
      </div>
    </div>
  )
}
