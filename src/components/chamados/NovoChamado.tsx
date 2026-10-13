import React, { useState } from 'react'
import {
  ClipboardPlus, User, Stethoscope, Activity,
  Thermometer, Wind, Heart, AlertCircle, AlertTriangle, RotateCcw, Save, FileDown
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
import { exportAtendimentoPDF } from '../../utils/export'

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

type TipoRegistro = 'Clinico' | 'Problema'

interface FormData {
  tipo: TipoRegistro
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
  tipo: 'Clinico',
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

  const setTipo = (tipo: TipoRegistro) => {
    setForm(p => ({
      ...p, tipo, situacao: '',
      pressao_arterial: '', bpm: '', temperatura: '', saturacao: '',
    }))
    setErrors(p => ({ ...p, situacao: '' }))
  }

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.brigadista) e.brigadista = 'Selecione o brigadista'
    if (!form.colaborador_atendido.trim()) e.colaborador_atendido = 'Nome do colaborador obrigatório'
    if (!form.situacao.trim()) {
      e.situacao = form.tipo === 'Clinico' ? 'Selecione a situação' : 'Descreva o problema'
    }
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

  const handleGerarPDF = () => {
    if (!validate()) return
    exportAtendimentoPDF({
      brigadista: form.brigadista,
      colaborador_atendido: form.colaborador_atendido,
      situacao: form.situacao,
      pressao_arterial: form.pressao_arterial,
      bpm: form.bpm,
      temperatura: form.temperatura,
      saturacao: form.saturacao,
      dados_atendimento: form.dados_atendimento,
    })
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
              {form.tipo === 'Clinico' ? 'RELATÓRIO DE ATENDIMENTO' : 'RELATÓRIO DE OCORRÊNCIA'}
            </h2>
            <p className="text-xs md:text-sm text-gray-400 mt-0.5 truncate">
              {form.tipo === 'Clinico' ? 'Registre o atendimento' : 'Relate o problema ocorrido'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de Registro */}
        <Card padding="md">
          <CardHeader
            title="Tipo de Registro"
            subtitle="Selecione o tipo de ocorrência que será relatada"
            icon={<AlertCircle size={18} />}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTipo('Clinico')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                form.tipo === 'Clinico'
                  ? 'bg-brand-red/15 border-brand-red text-white'
                  : 'bg-brand-gray-800 border-brand-gray-600 text-gray-400 hover:border-brand-gray-500'
              }`}
            >
              <Stethoscope size={18} className={form.tipo === 'Clinico' ? 'text-brand-red' : 'text-gray-500'} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Atendimento Clínico</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">Mal-estar, trauma, sinais vitais...</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setTipo('Problema')}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-200 ${
                form.tipo === 'Problema'
                  ? 'bg-brand-red/15 border-brand-red text-white'
                  : 'bg-brand-gray-800 border-brand-gray-600 text-gray-400 hover:border-brand-gray-500'
              }`}
            >
              <AlertTriangle size={18} className={form.tipo === 'Problema' ? 'text-brand-red' : 'text-gray-500'} />
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">Relatar Problema</p>
                <p className="text-xs text-gray-500 leading-tight mt-0.5">Qualquer outra ocorrência, ex: colisão no portão</p>
              </div>
            </button>
          </div>
        </Card>

        {/* Identificação */}
        <Card padding="md">
          <CardHeader
            title="Identificação"
            subtitle={form.tipo === 'Clinico' ? 'Dados do brigadista e colaborador atendido' : 'Dados do brigadista e colaborador envolvido'}
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
              label={form.tipo === 'Clinico' ? 'Nome do Colaborador Atendido' : 'Colaborador Envolvido'}
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

        {/* Dados Clínicos / Ocorrência */}
        <Card padding="md">
          <CardHeader
            title={form.tipo === 'Clinico' ? 'Dados Clínicos' : 'Detalhes da Ocorrência'}
            subtitle={form.tipo === 'Clinico' ? 'Sinais vitais e situação do atendimento' : 'Descreva o problema relatado'}
            icon={form.tipo === 'Clinico' ? <Stethoscope size={18} /> : <AlertTriangle size={18} />}
          />

          {/* Situação */}
          <div className={form.tipo === 'Clinico' ? 'mb-5' : ''}>
            {form.tipo === 'Clinico' ? (
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
            ) : (
              <Input
                label="Problema Relatado"
                type="text"
                placeholder="Ex: Colaborador bateu o carro no portão da empresa"
                value={form.situacao}
                onChange={set('situacao')}
                icon={<AlertCircle size={16} />}
                error={errors.situacao}
                required
              />
            )}
          </div>

          {/* Sinais Vitais */}
          {form.tipo === 'Clinico' && (
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
          )}
        </Card>

        {/* Registro */}
        <Card padding="md">
          <CardHeader
            title={form.tipo === 'Clinico' ? 'Registro do Atendimento' : 'Registro da Ocorrência'}
            subtitle="Descrição detalhada da ocorrência e conduta adotada"
            icon={<ClipboardPlus size={18} />}
          />
          <Textarea
            label="Descrição / Conduta Adotada"
            placeholder={
              form.tipo === 'Clinico'
                ? 'Descreva detalhadamente o atendimento: queixas relatadas, conduta adotada, medicamentos utilizados, encaminhamentos, observações relevantes...'
                : 'Descreva detalhadamente o ocorrido: circunstâncias, pessoas envolvidas, providências tomadas, observações relevantes...'
            }
            value={form.dados_atendimento}
            onChange={set('dados_atendimento')}
            className="min-h-[160px]"
          />
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4">
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <FileDown size={13} className="text-gray-600 flex-shrink-0" />
            "Gerar PDF" cria um termo de ciência para o colaborador assinar, confirmando a situação registrada.
          </p>
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
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
              type="button"
              variant="secondary"
              size="md"
              icon={<FileDown size={16} />}
              onClick={handleGerarPDF}
              className="w-full sm:w-auto"
            >
              Gerar PDF
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
        </div>
      </form>
    </div>
  )
}
