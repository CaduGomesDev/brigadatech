import React, { useState } from 'react'
import {
  ClipboardPlus, User, Stethoscope, Activity,
  Thermometer, Wind, Heart, AlertCircle, RotateCcw, Save
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { Input, Textarea, Select } from '../ui/Input'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { SituacaoType } from '../../types'
import { enviarNotificacaoTelegram } from '../../utils/telegram'
import { logAuditoria } from '../../lib/audit'
import { useBrigadistas } from '../../hooks/useBrigadistas'

const SITUACOES: SituacaoType[] = [
  'Mal-Estar Geral',
  'Desmaio / Lipotímia',
  'Crise Hipertensiva',
  'Crise Hipoglicêmica',
  'Reação Alérgica',
  'Crise de Ansiedade / Pânico',
  'Trauma / Queda',
  'Queimadura',
  'Corte / Laceração',
  'Crise Epiléptica',
  'Dor Torácica',
  'Dificuldade Respiratória',
  'Atendimento de Rotina',
  'Outros',
]

interface FormData {
  brigadista: string
  colaborador_atendido: string
  situacao: string
  pressao_arterial: string
  bpm: string
  temperatura: string
  saturacao: string
  dados_atendimento: string
}

const INITIAL: FormData = {
  brigadista: '',
  colaborador_atendido: '',
  situacao: '',
  pressao_arterial: '',
  bpm: '',
  temperatura: '',
  saturacao: '',
  dados_atendimento: '',
}

export function NovoChamado() {
  const { user } = useAuth()
  const { success, error: toastError } = useToast()
  const { brigadistas } = useBrigadistas()
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<FormData>>({})

  const set = (key: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm(p => ({ ...p, [key]: e.target.value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.brigadista) e.brigadista = 'Selecione o brigadista'
    if (!form.colaborador_atendido.trim()) e.colaborador_atendido = 'Nome do colaborador obrigatório'
    if (!form.situacao) e.situacao = 'Selecione a situação'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.from('chamados_brigada').insert({
        brigadista: form.brigadista,
        colaborador_atendido: form.colaborador_atendido,
        situacao: form.situacao,
        pressao_arterial: form.pressao_arterial || null,
        bpm: form.bpm || null,
        temperatura: form.temperatura || null,
        saturacao: form.saturacao || null,
        dados_atendimento: form.dados_atendimento || null,
        created_by: user?.id,
      })
      if (error) throw error

      const dataHora = new Date().toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      enviarNotificacaoTelegram(form.brigadista, dataHora)
      if (user) logAuditoria(user.id, 'insert_chamado', { brigadista: form.brigadista, situacao: form.situacao })

      success('Relatório registrado!', `Atendimento de ${form.colaborador_atendido} salvo com sucesso.`)
      setForm(INITIAL)
      setErrors({})
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.'
      toastError('Erro ao registrar', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Hero header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brand-red/20 via-brand-gray-900 to-brand-gray-900 border border-brand-red/20 rounded-2xl p-4 md:p-6">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
          <ClipboardPlus size={72} className="text-brand-red" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center flex-shrink-0">
            <ClipboardPlus size={20} className="text-brand-red" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-2xl font-black text-white tracking-tight leading-tight">
              RELATÓRIO DE ATENDIMENTO
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">
              Registre o atendimento
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Identificação */}
        <Card padding="md">
          <CardHeader
            title="Identificação"
            subtitle="Dados do brigadista e colaborador atendido"
            icon={<User size={18} />}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              label="Brigadista Responsável"
              value={form.brigadista}
              onChange={set('brigadista')}
              icon={<User size={16} />}
              options={brigadistas.map(b => ({ value: b, label: b }))}
              placeholder="Selecione o brigadista..."
              error={errors.brigadista}
              required
            />
            <Input
              label="Nome do Colaborador Atendido"
              type="text"
              placeholder="Ex: João Silva"
              value={form.colaborador_atendido}
              onChange={set('colaborador_atendido')}
              icon={<User size={16} />}
              error={errors.colaborador_atendido}
              required
            />
          </div>
        </Card>

        {/* Dados Clínicos */}
        <Card padding="md">
          <CardHeader
            title="Dados Clínicos"
            subtitle="Sinais vitais e situação do atendimento"
            icon={<Stethoscope size={18} />}
          />

          {/* Situação */}
          <div className="mb-5">
            <Select
              label="Situação / Ocorrência"
              value={form.situacao}
              onChange={set('situacao')}
              icon={<AlertCircle size={16} />}
              options={SITUACOES.map(s => ({ value: s, label: s }))}
              placeholder="Selecione a situação..."
              error={errors.situacao}
              required
            />
          </div>

          {/* Sinais Vitais */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity size={12} className="text-brand-red" />
              Sinais Vitais
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Pressão Arterial"
                type="text"
                placeholder="120/80 mmHg"
                value={form.pressao_arterial}
                onChange={set('pressao_arterial')}
                icon={<Activity size={16} />}
              />
              <Input
                label="BPM"
                type="text"
                placeholder="80 bpm"
                value={form.bpm}
                onChange={set('bpm')}
                icon={<Heart size={16} />}
              />
              <Input
                label="Temperatura"
                type="text"
                placeholder="36.5°C"
                value={form.temperatura}
                onChange={set('temperatura')}
                icon={<Thermometer size={16} />}
              />
              <Input
                label="Saturação O₂"
                type="text"
                placeholder="98%"
                value={form.saturacao}
                onChange={set('saturacao')}
                icon={<Wind size={16} />}
              />
            </div>
          </div>
        </Card>

        {/* Registro */}
        <Card padding="md">
          <CardHeader
            title="Registro do Atendimento"
            subtitle="Descrição detalhada da ocorrência e conduta adotada"
            icon={<ClipboardPlus size={18} />}
          />
          <Textarea
            label="Descrição / Conduta Adotada"
            placeholder="Descreva detalhadamente o atendimento: queixas relatadas, conduta adotada, medicamentos utilizados, encaminhamentos, observações relevantes..."
            value={form.dados_atendimento}
            onChange={set('dados_atendimento')}
            className="min-h-[160px]"
          />
        </Card>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pb-4">
          <Button
            type="button"
            variant="ghost"
            size="md"
            icon={<RotateCcw size={16} />}
            onClick={() => { setForm(INITIAL); setErrors({}) }}
            className="w-full sm:w-auto"
          >
            Limpar Formulário
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            icon={<Save size={18} />}
            className="w-full sm:w-auto"
          >
            Registrar Relatório
          </Button>
        </div>
      </form>
    </div>
  )
}
