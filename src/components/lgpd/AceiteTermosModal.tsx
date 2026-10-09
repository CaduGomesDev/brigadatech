import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shield, ExternalLink, FileText, Lock } from 'lucide-react'
import { useLgpd, VERSAO_TERMOS } from '../../contexts/LgpdContext'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'

const SKIP_PATHS = ['/termos', '/alterar-senha', '/auth', '/esqueci-senha']

export function AceiteTermosModal() {
  const { user } = useAuth()
  const { termosAceitos, loadingLgpd, aceitarTermos } = useLgpd()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [leuTermos, setLeuTermos] = useState(false)

  if (!user || loadingLgpd || termosAceitos || SKIP_PATHS.includes(location.pathname)) {
    return null
  }

  const handleAceitar = async () => {
    if (!leuTermos) return
    setLoading(true)
    await aceitarTermos()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-brand-gray-800 border border-brand-gray-600 rounded-2xl shadow-card animate-slide-in">

        {/* Header */}
        <div className="px-6 py-5 border-b border-brand-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center shrink-0">
              <Shield size={20} className="text-brand-red" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Termos de Uso e Privacidade</h2>
              <p className="text-xs text-gray-500">Versão {VERSAO_TERMOS} — leitura obrigatória</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">
            Antes de continuar, você precisa confirmar que leu e compreendeu os{' '}
            <strong className="text-white">Termos de Uso</strong> e a{' '}
            <strong className="text-white">Política de Privacidade</strong> do BrigadaTech.
          </p>

          <div className="bg-brand-gray-900 border border-brand-gray-700 rounded-xl p-4 space-y-3 text-xs text-gray-400 leading-relaxed">
            <div className="flex gap-2">
              <FileText size={14} className="text-brand-red shrink-0 mt-0.5" />
              <span>
                Este sistema coleta e trata dados pessoais, incluindo{' '}
                <strong className="text-gray-300">dados de saúde</strong> de colaboradores
                atendidos pela brigada.
              </span>
            </div>
            <div className="flex gap-2">
              <Lock size={14} className="text-brand-red shrink-0 mt-0.5" />
              <span>
                O acesso utiliza exclusivamente{' '}
                <strong className="text-gray-300">e-mail corporativo</strong> fornecido pela
                BrigadaTech. E-mails pessoais não são aceitos. O desligamento implica
                revogação imediata do acesso.
              </span>
            </div>
            <div className="flex gap-2">
              <Lock size={14} className="text-brand-red shrink-0 mt-0.5" />
              <span>
                O tratamento de dados de saúde tem base legal no{' '}
                <strong className="text-gray-300">Art. 11, II, 'a' e 'f' da LGPD</strong>{' '}
                (proteção da vida, saúde e exercício de direitos pelo empregador),
                independentemente deste aceite.
              </span>
            </div>
            <div className="flex gap-2">
              <Shield size={14} className="text-brand-red shrink-0 mt-0.5" />
              <span>
                Você pode solicitar acesso, correção ou exclusão dos seus dados pelo menu{' '}
                <strong className="text-gray-300">Minha Privacidade</strong>.
              </span>
            </div>
          </div>

          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-brand-red hover:text-brand-red-light transition-colors"
          >
            <ExternalLink size={14} />
            Ler Termos de Uso e Política de Privacidade completos
          </a>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <div className="relative mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={leuTermos}
                onChange={e => setLeuTermos(e.target.checked)}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                leuTermos ? 'bg-brand-red border-brand-red' : 'border-brand-gray-500 bg-transparent'
              }`}>
                {leuTermos && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-300">
              Li e concordo com os <strong className="text-white">Termos de Uso</strong> e a{' '}
              <strong className="text-white">Política de Privacidade</strong> do BrigadaTech.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-brand-gray-700">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!leuTermos}
            loading={loading}
            onClick={handleAceitar}
          >
            Confirmar Ciência e Continuar
          </Button>
          <p className="text-center text-[10px] text-gray-600 mt-3">
            A continuidade no sistema requer a confirmação de leitura dos termos.
          </p>
        </div>
      </div>
    </div>
  )
}
