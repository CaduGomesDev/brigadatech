import React, { useState, useEffect } from 'react'
import { User, Lock, Bell, Save, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/layout/Layout'
import { Card, CardHeader } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { hasCargoPermission } from '../lib/permissions'

export function ConfiguracoesPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const { success, error: toastError } = useToast()
  const canManageAlertas = hasCargoPermission(profile?.cargo, 'Coordenador')

  const [profileForm, setProfileForm] = useState({
    nome: profile?.nome || '',
  })

  useEffect(() => {
    if (profile?.nome) setProfileForm({ nome: profile.nome })
  }, [profile?.nome])

  const [passForm, setPassForm] = useState({
    currentPass: '',
    newPass: '',
    confirmPass: '',
  })
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [loadingPass, setLoadingPass] = useState(false)

  const [diasAlertas, setDiasAlertas] = useState('30')
  const [loadingAlertas, setLoadingAlertas] = useState(false)

  useEffect(() => {
    if (!canManageAlertas) return
    supabase
      .from('configuracoes_sistema')
      .select('valor')
      .eq('chave', 'dias_antecedencia_alertas')
      .maybeSingle()
      .then(({ data }) => { if (data?.valor) setDiasAlertas(String(data.valor)) })
  }, [canManageAlertas])

  const handleSaveAlertas = async (e: React.FormEvent) => {
    e.preventDefault()
    const dias = Number(diasAlertas)
    if (!Number.isFinite(dias) || dias < 1) {
      toastError('Valor inválido', 'Informe um número de dias maior que zero.')
      return
    }
    setLoadingAlertas(true)
    const { error } = await supabase
      .from('configuracoes_sistema')
      .update({ valor: dias })
      .eq('chave', 'dias_antecedencia_alertas')
    setLoadingAlertas(false)
    if (error) {
      toastError('Erro ao salvar', error.message)
    } else {
      success('Configuração salva!', `Alertas de vencimento serão exibidos com ${dias} dia(s) de antecedência.`)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) {
      toastError('Erro', 'Perfil não carregado. Recarregue a página.')
      return
    }
    if (!profileForm.nome.trim()) {
      toastError('Campo obrigatório', 'O nome não pode estar em branco.')
      return
    }
    setLoadingProfile(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nome: profileForm.nome.trim() })
        .eq('id', profile.id)
      if (error) {
        toastError('Erro ao salvar', error.message)
      } else {
        success('Perfil atualizado!', 'Suas informações foram salvas com sucesso.')
        await refreshProfile()
      }
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passForm.currentPass) {
      toastError('Campo obrigatório', 'Digite sua senha atual.')
      return
    }
    if (passForm.newPass.length < 6) {
      toastError('Senha fraca', 'A nova senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (passForm.newPass === passForm.currentPass) {
      toastError('Senha inválida', 'A nova senha deve ser diferente da senha atual.')
      return
    }
    if (passForm.newPass !== passForm.confirmPass) {
      toastError('Senhas não conferem', 'A nova senha e a confirmação não são iguais.')
      return
    }
    if (!profile?.email) {
      toastError('Erro', 'Sessão inválida. Faça login novamente.')
      return
    }
    setLoadingPass(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password: passForm.currentPass,
      })
      if (authError) {
        toastError('Senha atual incorreta', 'A senha atual informada está incorreta.')
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: passForm.newPass })
      if (updateError) {
        toastError('Erro ao atualizar senha', updateError.message)
        return
      }
      success('Senha alterada!', 'Por segurança, faça login novamente.')
      setPassForm({ currentPass: '', newPass: '', confirmPass: '' })
      await signOut()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido.'
      toastError('Erro inesperado', msg)
    } finally {
      setLoadingPass(false)
    }
  }

  return (
    <Layout title="Configurações">
      <div className="max-w-2xl space-y-5 animate-fade-in">

        {/* Perfil */}
        <Card padding="md">
          <CardHeader
            title="Meu Perfil"
            subtitle="Atualize suas informações pessoais"
            icon={<User size={18} />}
          />
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Input
              label="Nome Completo"
              type="text"
              placeholder="Seu nome completo"
              value={profileForm.nome}
              onChange={e => setProfileForm(p => ({ ...p, nome: e.target.value }))}
              required
            />

            <Input
              label="Cargo"
              type="text"
              value={profile?.cargo || '—'}
              disabled
              hint="O cargo é definido pelo administrador"
            />

            <Input
              label="Email"
              type="email"
              value={profile?.email || ''}
              disabled
              hint="O email não pode ser alterado"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                loading={loadingProfile}
                icon={<Save size={16} />}
              >
                Salvar Perfil
              </Button>
            </div>
          </form>
        </Card>

        {/* Senha */}
        <Card padding="md">
          <CardHeader
            title="Alterar Senha"
            subtitle="Defina uma nova senha para sua conta"
            icon={<Lock size={18} />}
          />
          <form onSubmit={handleChangePass} className="space-y-4">
            <Input
              label="Senha Atual"
              type={showCurrentPass ? 'text' : 'password'}
              placeholder="Digite sua senha atual"
              value={passForm.currentPass}
              onChange={e => setPassForm(p => ({ ...p, currentPass: e.target.value }))}
              icon={<Lock size={16} />}
              iconRight={
                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="hover:text-white transition-colors">
                  {showCurrentPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="current-password"
            />
            <Input
              label="Nova Senha"
              type={showNewPass ? 'text' : 'password'}
              placeholder="Mínimo 6 caracteres"
              value={passForm.newPass}
              onChange={e => setPassForm(p => ({ ...p, newPass: e.target.value }))}
              icon={<Lock size={16} />}
              iconRight={
                <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="hover:text-white transition-colors">
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
              autoComplete="new-password"
            />
            <Input
              label="Confirmar Nova Senha"
              type={showNewPass ? 'text' : 'password'}
              placeholder="Repita a nova senha"
              value={passForm.confirmPass}
              onChange={e => setPassForm(p => ({ ...p, confirmPass: e.target.value }))}
              icon={<Lock size={16} />}
              autoComplete="new-password"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="secondary"
                loading={loadingPass}
                icon={<Lock size={16} />}
              >
                Alterar Senha
              </Button>
            </div>
          </form>
        </Card>

        {/* Alertas de vencimento */}
        {canManageAlertas && (
          <Card padding="md">
            <CardHeader
              title="Alertas de Vencimento"
              subtitle="Antecedência para alertar materiais, equipamentos e extintores próximos do vencimento"
              icon={<AlertTriangle size={18} />}
            />
            <form onSubmit={handleSaveAlertas} className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="w-full sm:w-48">
                <Input
                  label="Dias de Antecedência"
                  type="number"
                  min="1"
                  value={diasAlertas}
                  onChange={e => setDiasAlertas(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="primary" loading={loadingAlertas} icon={<Save size={16} />}>
                Salvar
              </Button>
            </form>
          </Card>
        )}

        {/* Info */}
        <Card padding="sm">
          <div className="flex items-center gap-3 p-2">
            <Bell size={18} className="text-gray-600" />
            <div>
              <p className="text-sm font-semibold text-gray-300">BrigadaTech v1.0</p>
              <p className="text-xs text-gray-600">BrigadaTech — Sistema de Gestão de Chamados de Brigada</p>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}
