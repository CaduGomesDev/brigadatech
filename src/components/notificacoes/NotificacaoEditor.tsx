import { useState, useRef } from 'react'
import { Bold, Italic, Link, List, ListOrdered, Quote } from 'lucide-react'

function parseMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li data-ul>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li data-ol>$1</li>')
    .replace(/\n/g, '<br>')
}

interface Props {
  titulo: string
  mensagem: string
  onTituloChange: (v: string) => void
  onMensagemChange: (v: string) => void
  errorTitulo?: string
  errorMensagem?: string
}

export function NotificacaoEditor({
  titulo, mensagem,
  onTituloChange, onMensagemChange,
  errorTitulo, errorMensagem,
}: Props) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const taRef = useRef<HTMLTextAreaElement>(null)

  function wrap(prefix: string, suffix = prefix) {
    const el = taRef.current
    if (!el) return
    const s = el.selectionStart
    const e = el.selectionEnd
    const sel = mensagem.slice(s, e)
    onMensagemChange(mensagem.slice(0, s) + prefix + sel + suffix + mensagem.slice(e))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + prefix.length, e + prefix.length)
    })
  }

  function linePrefix(prefix: string) {
    const el = taRef.current
    if (!el) return
    const s = el.selectionStart
    const lineStart = mensagem.lastIndexOf('\n', s - 1) + 1
    onMensagemChange(mensagem.slice(0, lineStart) + prefix + mensagem.slice(lineStart))
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(s + prefix.length, s + prefix.length)
    })
  }

  const tools = [
    { icon: <Bold size={14} />,          title: 'Negrito (Ctrl+B)',    action: () => wrap('**') },
    { icon: <Italic size={14} />,        title: 'Itálico (Ctrl+I)',    action: () => wrap('*') },
    { icon: <span className="font-mono text-[12px] font-bold leading-none">{`</>`}</span>, title: 'Código inline', action: () => wrap('`') },
    { icon: <span className="font-mono text-[12px] font-bold leading-none">{`{}`}</span>,  title: 'Bloco de código', action: () => wrap('```\n', '\n```') },
    { icon: <Link size={14} />,          title: 'Link',                action: () => wrap('[', '](url)') },
    { icon: <List size={14} />,          title: 'Lista',               action: () => linePrefix('- ') },
    { icon: <ListOrdered size={14} />,   title: 'Lista numerada',      action: () => linePrefix('1. ') },
    { icon: <Quote size={14} />,         title: 'Citação',             action: () => linePrefix('> ') },
  ]

  return (
    <div className="space-y-4">

      {/* ── Título ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-brand-gray-300">Título</label>
        <div className="relative">
          <input
            type="text"
            value={titulo}
            onChange={e => onTituloChange(e.target.value)}
            maxLength={200}
            placeholder="Descreva brevemente o problema"
            className={`
              w-full bg-brand-gray-800 rounded-lg px-3 py-2.5 pr-16 text-sm text-white
              border placeholder:text-brand-gray-500 outline-none transition-colors
              ${errorTitulo
                ? 'border-red-500/60 focus:border-red-500'
                : 'border-white/[0.08] focus:border-brand-red/50'}
            `}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-brand-gray-500 pointer-events-none">
            {titulo.length} / 200
          </span>
        </div>
        {errorTitulo && <p className="text-xs text-red-400">{errorTitulo}</p>}
      </div>

      {/* ── Descrição ── */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-brand-gray-300">Descrição</label>
        <div className={`
          rounded-lg border overflow-hidden
          ${errorMensagem ? 'border-red-500/60' : 'border-white/[0.08]'}
        `}>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-2 py-1.5 bg-brand-gray-800/80 border-b border-white/[0.06]">
            <div className="flex items-center gap-0.5">
              {tools.map((t, i) => (
                <button
                  key={i}
                  type="button"
                  title={t.title}
                  onClick={t.action}
                  disabled={mode === 'preview'}
                  className="w-7 h-7 flex items-center justify-center rounded text-brand-gray-400
                    hover:text-white hover:bg-white/[0.08] disabled:opacity-30
                    disabled:cursor-not-allowed transition-all"
                >
                  {t.icon}
                </button>
              ))}
            </div>

            {/* Edit / Preview tabs */}
            <div className="flex items-center rounded-md overflow-hidden border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setMode('edit')}
                className={`px-3 py-1 text-xs font-medium transition-colors
                  ${mode === 'edit'
                    ? 'bg-brand-gray-700 text-white'
                    : 'text-brand-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setMode('preview')}
                className={`px-3 py-1 text-xs font-medium transition-colors border-l border-white/[0.08]
                  ${mode === 'preview'
                    ? 'bg-brand-gray-700 text-white'
                    : 'text-brand-gray-400 hover:text-white hover:bg-white/[0.04]'}`}
              >
                Visualizar
              </button>
            </div>
          </div>

          {/* Edit */}
          {mode === 'edit' && (
            <div className="relative">
              <textarea
                ref={taRef}
                value={mensagem}
                onChange={e => onMensagemChange(e.target.value)}
                maxLength={4000}
                rows={6}
                placeholder="Detalhe o aviso, incluindo passos para reproduzir se possível"
                className="w-full bg-brand-gray-800 px-3 py-2.5 pb-7 text-sm text-white
                  placeholder:text-brand-gray-500 outline-none resize-y min-h-[130px]"
              />
              <span className="absolute right-3 bottom-2 text-[11px] text-brand-gray-500 pointer-events-none">
                {mensagem.length} / 4000
              </span>
            </div>
          )}

          {/* Preview */}
          {mode === 'preview' && (
            <div
              className="
                min-h-[130px] px-3 py-2.5 text-sm bg-brand-gray-800
                text-brand-gray-300 leading-relaxed
                [&_strong]:text-white [&_strong]:font-semibold
                [&_em]:italic [&_em]:text-brand-gray-300
                [&_code]:bg-brand-gray-700/80 [&_code]:text-brand-red [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono
                [&_pre]:bg-brand-gray-700/80 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:my-1
                [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-brand-gray-300
                [&_blockquote]:border-l-2 [&_blockquote]:border-brand-gray-500 [&_blockquote]:pl-3 [&_blockquote]:text-brand-gray-400 [&_blockquote]:italic [&_blockquote]:my-1
                [&_li]:ml-4 [&_li]:list-disc
              "
              dangerouslySetInnerHTML={{
                __html: mensagem.trim()
                  ? parseMarkdown(mensagem)
                  : '<span style="color:#6b7280">Nada para visualizar.</span>',
              }}
            />
          )}
        </div>
        {errorMensagem && <p className="text-xs text-red-400">{errorMensagem}</p>}
      </div>
    </div>
  )
}
