import { useState } from 'react'
import { UserPlus, Mail, Lock } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { createUser } from '../../lib/api'
import { useToast } from '../../contexts/ToastContext'
import { useAuth } from '../../contexts/AuthContext'
import { logAuditoria } from '../../lib/audit'

interface CriarUsuarioModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

interface FormData {
  email: string
  senha: string
}

interface FormErrors {
  email?: string
  senha?: string
}

export function CriarUsuarioModal({ open, onClose, onSuccess }: CriarUsuarioModalProps) {
  const { profile: currentProfile } = useAuth()
  const { success, error: toastError } = useToast()
  const [form, setForm] = useState<FormData>({ email: '', senha: '' })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(p => ({ ...p, [key]: e.target.value }))
    setErrors(p => ({ ...p, [key]: '' }))
  }

  const validate = (): boolean => {
    const e: FormErrors = {}
    if (!form.email.trim()) {
      e.email = 'E-mail corporativo é obrigatório'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Formato de e-mail inválido'
    }
    if (!form.senha) {
      e.senha = 'Senha é obrigatória'
    } else if (form.senha.length < 6) {
      e.senha = 'A senha deve ter no mínimo 6 caracteres'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    const { user, error } = await createUser(form.email.trim().toLowerCase(), form.senha)
    setLoading(false)

    if (error) {
      toastError('Erro ao criar usuário', error)
      return
    }

    if (currentProfile && user) {
      logAuditoria(currentProfile.id, 'create_user', {
        created_email: user.email,
        created_user_id: user.id,
      })
    }

    success('Usuário criado', `A conta ${form.email.trim()} foi criada com sucesso.`)
    handleClose()
    onSuccess()
  }

  const handleClose = () => {
    if (loading) return
    setForm({ email: '', senha: '' })
    setErrors({})
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Criar Novo Usuário"
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={loading}
            icon={<UserPlus size={14} />}
          >
            Criar Usuário
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="E-mail Corporativo"
          type="email"
          placeholder="usuario@empresa.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          icon={<Mail size={15} />}
          required
          autoFocus
          autoComplete="off"
        />
        <Input
          label="Senha"
          type="password"
          placeholder="Mínimo 6 caracteres"
          value={form.senha}
          onChange={set('senha')}
          error={errors.senha}
          icon={<Lock size={15} />}
          required
          autoComplete="new-password"
        />
      </div>
    </Modal>
  )
}
