import { useState } from 'react'
import {
  Dumbbell, User, Send, MapPin, AlertCircle, Activity, RotateCcw,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { enviarNotificacaoGinastica } from '../../utils/telegram'
import { useBrigadistas } from '../../hooks/useBrigadistas'

const SETORES = ['Piso Superior', 'T.I.', 'Piso Inferior'] as const
type Setor = typeof SETORES[number]

const EXERCICIOS_EM_PE = [
  { num: 1, nome: 'Dorsal', descricao: 'Estique os braços seguindo a linha do tronco. Mantenha o abdômen levemente contraído e os joelhos destravados.' },
  { num: 2, nome: 'Antebraço', descricao: 'Entrelace os dedos das mãos e alongue os braços para frente.' },
  { num: 3, nome: 'Deltoide e Tríceps', descricao: 'Mantenha um dos braços esticados para o lado oposto. Alongue-o com a ajuda do outro braço. Repita no outro braço.' },
  { num: 4, nome: 'Cervical', descricao: 'Puxe a cabeça para o lado e cuide para não elevar os ombros. Repita para o outro lado.' },
  { num: 5, nome: 'Tríceps', descricao: 'Com uma das mãos, segure o cotovelo oposto e empurre-o em direção ao meio das costas. Repita no outro braço.' },
  { num: 6, nome: 'Quadríceps', descricao: 'Puxe a perna para trás, segurando a ponta do pé. Repita na outra perna.' },
  { num: 7, nome: 'Posterior de Coxa', descricao: 'Incline o tronco para baixo, tentando encostar as mãos na ponta dos pés.' },
  { num: 8, nome: 'Dorsal Lateral', descricao: 'Com uma das mãos na cintura, levante a outra mão para cima e incline-se para a lateral. Repita do outro lado.' },
]

const EXERCICIOS_SENTADO = [
  { num: 9,  nome: 'Extensão dos dedos e punhos', descricao: 'Abrir a palma da mão.' },
  { num: 10, nome: 'Flexão dos dedos', descricao: 'Fechar a mão.' },
  { num: 11, nome: 'Rotação do tronco e pescoço', descricao: 'Para ambos os lados.' },
  { num: 12, nome: 'Flexão da perna e extensão da coxa', descricao: 'Quadríceps — sentado na cadeira.' },
  { num: 13, nome: 'Abdução e rotação externa da coxa', descricao: 'Cruzar a perna.' },
  { num: 14, nome: 'Adução e flexão da coxa', descricao: 'Glúteo.' },
  { num: 15, nome: 'Flexão dorsal do pé', descricao: 'Gêmeos e solear.' },
  { num: 16, nome: 'Flexão do tronco', descricao: 'Lombar.' },
]

interface FormErrors {
  brigadista?: string
  setores?: string
}

export function GinasticaLaboral() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const { brigadistas } = useBrigadistas()

  const [brigadista, setBrigadista] = useState('')
  const [setoresSelecionados, setSetoresSelecionados] = useState<Setor[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [imgError, setImgError] = useState(false)

  const toggleSetor = (setor: Setor) => {
    setSetoresSelecionados(prev =>
      prev.includes(setor) ? prev.filter(s => s !== setor) : [...prev, setor]
    )
    setErrors(prev => ({ ...prev, setores: '' }))
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!brigadista) e.brigadista = 'Selecione o brigadista responsável'
    if (setoresSelecionados.length === 0) e.setores = 'Selecione ao menos um setor'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleReset = () => {
    setBrigadista('')
    setSetoresSelecionados([])
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const setoresText = setoresSelecionados.join(', ')

      const { error } = await supabase.from('chamados_brigada').insert({
        brigadista,
        colaborador_atendido: 'Toda a Equipe',
        situacao: 'Ginástica Laboral',
        dados_atendimento: `Setores concluídos: ${setoresText}`,
        created_by: user?.id,
      })
      if (error) throw error

      const dataHora = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      enviarNotificacaoGinastica(brigadista, [...setoresSelecionados], dataHora)

      success('Ginástica registrada!', `Setores concluídos: ${setoresText}`)
      handleReset()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toastError('Erro ao registrar', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6 animate-fade-in">

      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-red/20 via-brand-gray-900 to-brand-gray-900 border border-brand-red/20 rounded-2xl p-4 md:p-6">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <Dumbbell size={72} className="text-brand-red" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
            <Dumbbell size={20} className="text-brand-red" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-2xl font-black text-white tracking-tight leading-tight">
              GINÁSTICA LABORAL
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-0.5">
              Exercícios matinais da equipe — registre a conclusão por setor
            </p>
          </div>
        </div>
      </div>

      {/* Poster de exercícios — exibe se o arquivo existir em /public/ginastica-laboral.png */}
      {!imgError && (
        <Card padding="sm">
          <div className="p-4 pb-2">
            <CardHeader
              title="Guia de Exercícios"
              subtitle="Sequência completa de ginástica laboral"
              icon={<Dumbbell size={18} />}
            />
          </div>
          <img
            src="/ginastica-laboral.png"
            alt="Guia de Ginástica Laboral"
            className="w-full rounded-b-2xl object-contain"
            onError={() => setImgError(true)}
          />
        </Card>
      )}

      {/* Exercícios em pé */}
      <Card padding="md">
        <CardHeader
          title="Exercícios em Pé"
          subtitle="8 alongamentos — executar antes de sentar"
          icon={<Activity size={18} />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {EXERCICIOS_EM_PE.map(ex => (
            <div
              key={ex.num}
              className="flex gap-3 p-3 rounded-xl bg-brand-gray-800 border border-brand-gray-700"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-xs font-bold text-brand-red">
                {ex.num}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{ex.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{ex.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Exercícios sentado */}
      <Card padding="md">
        <CardHeader
          title="Exercícios Sentado"
          subtitle="8 exercícios para escritório e postos de trabalho"
          icon={<Activity size={18} />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          {EXERCICIOS_SENTADO.map(ex => (
            <div
              key={ex.num}
              className="flex gap-3 p-3 rounded-xl bg-brand-gray-800 border border-brand-gray-700"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-brand-gray-700 border border-brand-gray-600 flex items-center justify-center text-xs font-bold text-gray-300">
                {ex.num}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{ex.nome}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{ex.descricao}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Formulário de conclusão */}
      <Card padding="md">
        <CardHeader
          title="Registro de Conclusão"
          subtitle="Selecione o brigadista e os setores que concluíram a ginástica"
          icon={<MapPin size={18} />}
        />

        {/* Brigadista */}
        <div className="mt-4 mb-6">
          <Select
            label="Brigadista Responsável"
            value={brigadista}
            onChange={e => {
              setBrigadista(e.target.value)
              setErrors(prev => ({ ...prev, brigadista: '' }))
            }}
            icon={<User size={16} />}
            options={brigadistas.map(b => ({ value: b, label: b }))}
            placeholder="Selecione o brigadista..."
            error={errors.brigadista}
            required
          />
        </div>

        {/* Setores */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin size={12} className="text-brand-red" />
            Setores Concluídos
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {SETORES.map(setor => {
              const checked = setoresSelecionados.includes(setor)
              return (
                <button
                  key={setor}
                  type="button"
                  onClick={() => toggleSetor(setor)}
                  className={`
                    flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
                    ${checked
                      ? 'bg-brand-red/15 border-brand-red'
                      : 'bg-brand-gray-800 border-brand-gray-600 hover:border-brand-gray-500'
                    }
                  `}
                >
                  {/* Checkbox visual */}
                  <div className={`
                    w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${checked ? 'bg-brand-red border-brand-red' : 'border-brand-gray-500 bg-transparent'}
                  `}>
                    {checked && (
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
                  <span className={`text-sm font-semibold transition-colors ${checked ? 'text-white' : 'text-gray-400'}`}>
                    {setor}
                  </span>
                </button>
              )
            })}
          </div>

          {errors.setores && (
            <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
              <AlertCircle size={12} />
              {errors.setores}
            </p>
          )}
        </div>

        {/* Prévia da mensagem */}
        {setoresSelecionados.length > 0 && brigadista && (
          <div className="mt-5 p-3 rounded-xl bg-brand-gray-800 border border-brand-gray-700">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Prévia da mensagem
            </p>
            <p className="text-sm text-gray-300">
              🤸 <span className="text-white font-medium">Ginástica Laboral Concluída</span>
              {' — '}{setoresSelecionados.join(', ')}
            </p>
          </div>
        )}

        {/* Ações */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            size="md"
            icon={<RotateCcw size={16} />}
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Limpar
          </Button>
          <Button
            type="button"
            variant="primary"
            size="lg"
            loading={loading}
            icon={<Send size={18} />}
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            Concluir e Enviar Ginástica
          </Button>
        </div>
      </Card>

    </div>
  )
}
